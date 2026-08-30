import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, desc, eq } from "drizzle-orm";

import { logEvent } from "./events";
import { buildPlan, normalizePlanJson } from "./plan";
import { envelopeSchema, getInboundFollowUpText } from "./types";
import type { Envelope } from "./types";

const nowIso = () => new Date().toISOString();

const addMessage = async (
  db: Db,
  params: {
    userId: string;
    sessionId?: string;
    role: "user" | "assistant" | "system";
    type:
      | "text"
      | "carousel"
      | "list"
      | "flow_card"
      | "receipt"
      | "purchase_summary";
    content: unknown;
  }
) => {
  await db.insert(schema.messages).values({
    contentJson: JSON.stringify(params.content),
    createdAt: nowIso(),
    id: crypto.randomUUID(),
    role: params.role,
    sessionId: params.sessionId,
    type: params.type,
    userId: params.userId,
  });
};

const getLatestSession = async (db: Db, userId: string) => {
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.updatedAt))
    .limit(1);

  return rows.at(0) ?? null;
};

const getSessionById = async (db: Db, sessionId: string) => {
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  return rows.at(0) ?? null;
};

const ensureSession = async (
  db: Db,
  params: { userId: string; requestedSessionId?: string }
) => {
  const existing = params.requestedSessionId
    ? await getSessionById(db, params.requestedSessionId)
    : await getLatestSession(db, params.userId);

  if (existing && existing.userId !== params.userId) {
    throw new Error("Session does not belong to envelope user");
  }

  if (existing) {
    const normalizedPlan = normalizePlanJson(
      existing.planJson,
      existing.intent
    );
    const normalizedPlanJson = JSON.stringify(normalizedPlan);

    if (normalizedPlanJson === existing.planJson) {
      return existing;
    }

    const updatedAt = nowIso();
    await db
      .update(schema.sessions)
      .set({ planJson: normalizedPlanJson, updatedAt })
      .where(eq(schema.sessions.id, existing.id));

    return { ...existing, planJson: normalizedPlanJson, updatedAt };
  }

  const sessionId = params.requestedSessionId ?? crypto.randomUUID();
  const plan = buildPlan("generic_request");
  const ts = nowIso();

  await db.insert(schema.sessions).values({
    createdAt: ts,
    expiresAt: undefined,
    id: sessionId,
    intent: "unknown",
    planJson: JSON.stringify(plan),
    requirementsJson: JSON.stringify({}),
    status: "active",
    updatedAt: ts,
    userId: params.userId,
  });

  await logEvent(db, {
    data: { intent: "unknown" },
    eventType: "session_created",
    level: "info",
    sessionId,
  });

  await logEvent(db, {
    data: {
      nodes: plan.nodes.map((n) => ({ deps: n.deps, id: n.id, kind: n.kind })),
      planVersion: plan.version,
    },
    eventType: "plan_created",
    level: "info",
    sessionId,
  });

  return await getSessionById(db, sessionId);
};

const handleUserText = async (
  db: Db,
  envelope: Extract<Envelope, { type: "user_text" }>,
  meta: { messageQueueId: string }
) => {
  const session = await ensureSession(db, {
    requestedSessionId: envelope.sessionId,
    userId: envelope.userId,
  });
  if (!session) {
    throw new Error("Failed to create commerce session");
  }

  await logEvent(db, {
    data: {
      envelopeType: envelope.type,
      messageQueueId: meta.messageQueueId,
      text: envelope.text,
    },
    eventType: "envelope_received",
    level: "info",
    sessionId: session.id,
  });

  await addMessage(db, {
    content: { text: envelope.text },
    role: "user",
    sessionId: session.id,
    type: "text",
    userId: envelope.userId,
  });

  const jobId = crypto.randomUUID();
  const input = { envelope, messageQueueId: meta.messageQueueId };
  const timestamp = nowIso();

  await db.insert(schema.jobs).values({
    attempts: 0,
    createdAt: nowIso(),
    errorText: null,
    finishedAt: null,
    id: jobId,
    inputJson: JSON.stringify(input),
    kind: "host_plan",
    leaseExpiresAt: null,
    nextRunAt: timestamp,
    promptText: null,
    resultJson: null,
    sessionId: session.id,
    startedAt: null,
    status: "queued",
    subagentName: "conversational-host",
    updatedAt: nowIso(),
  });

  await logEvent(db, {
    data: { jobKind: "host_plan" },
    eventType: "delegation_created",
    jobId,
    level: "info",
    sessionId: session.id,
  });

  await logEvent(db, {
    data: { jobKind: "host_plan" },
    eventType: "job_queued",
    jobId,
    level: "info",
    sessionId: session.id,
  });

  return { jobId, sessionId: session.id } as const;
};

const handleQuickReply = async (
  db: Db,
  envelope: Extract<Envelope, { type: "quick_reply" }>,
  meta: { messageQueueId: string }
) => {
  const session = await ensureSession(db, {
    requestedSessionId: envelope.sessionId,
    userId: envelope.userId,
  });
  if (!session) {
    throw new Error("Commerce session not found");
  }

  await logEvent(db, {
    data: {
      action: envelope.action,
      catalogItemId: envelope.catalogItemId,
      messageQueueId: meta.messageQueueId,
      orderId: envelope.orderId,
    },
    eventType: "envelope_received",
    level: "info",
    sessionId: envelope.sessionId,
  });

  await addMessage(db, {
    content: {
      catalogItemId: envelope.catalogItemId,
      orderId: envelope.orderId,
      quickReply: envelope.action,
    },
    role: "user",
    sessionId: envelope.sessionId,
    type: "text",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: {
      action: envelope.action,
      catalogItemId: envelope.catalogItemId,
      orderId: envelope.orderId,
    },
    eventType: "intent_detected",
    level: "info",
    sessionId: envelope.sessionId,
  });

  await enqueueInboundHostFollowUp(
    db,
    envelope,
    meta.messageQueueId,
    session.id
  );
};

const enqueueInboundHostFollowUp = async (
  db: Db,
  envelope: Exclude<Envelope, { type: "user_text" }>,
  messageQueueId: string,
  sessionId: string
) => {
  const jobId = crypto.randomUUID();
  const ts = nowIso();
  await db.insert(schema.jobs).values({
    attempts: 0,
    createdAt: ts,
    errorText: null,
    finishedAt: null,
    id: jobId,
    inputJson: JSON.stringify({
      envelope,
      messageQueueId,
      followUpText: getInboundFollowUpText(envelope),
    }),
    kind: "host_plan",
    leaseExpiresAt: null,
    nextRunAt: ts,
    promptText: null,
    resultJson: null,
    sessionId,
    startedAt: null,
    status: "queued",
    subagentName: "conversational-host",
    updatedAt: ts,
  });
  await logEvent(db, {
    data: { jobKind: "host_plan", trigger: envelope.type },
    eventType: "delegation_created",
    jobId,
    level: "info",
    sessionId,
  });
  await logEvent(db, {
    data: { jobKind: "host_plan", trigger: envelope.type },
    eventType: "job_queued",
    jobId,
    level: "info",
    sessionId,
  });
};

const handleCheckoutReturned = async (
  db: Db,
  envelope: Extract<Envelope, { type: "checkout_returned" }>,
  meta: { messageQueueId: string }
) => {
  const session = await ensureSession(db, {
    requestedSessionId: envelope.sessionId,
    userId: envelope.userId,
  });
  if (!session) {
    throw new Error("Commerce session not found");
  }
  await logEvent(db, {
    data: {
      messageQueueId: meta.messageQueueId,
      orderId: envelope.orderId,
      status: envelope.status,
    },
    eventType: "envelope_received",
    level: envelope.status === "paid" ? "info" : "warn",
    sessionId: envelope.sessionId,
  });

  await logEvent(db, {
    data: { orderId: envelope.orderId, status: envelope.status },
    eventType: "session_status_changed",
    level: envelope.status === "paid" ? "info" : "warn",
    sessionId: envelope.sessionId,
  });

  await enqueueInboundHostFollowUp(
    db,
    envelope,
    meta.messageQueueId,
    session.id
  );
};

export const dispatchOnce = async (db: Db) => {
  const [queued] = await db
    .select()
    .from(schema.messageQueue)
    .where(eq(schema.messageQueue.status, "pending"))
    .orderBy(schema.messageQueue.receivedAt)
    .limit(1);

  if (!queued) {
    return { processed: 0 } as const;
  }

  const claimResult = await db
    .update(schema.messageQueue)
    .set({ status: "processing" })
    .where(
      and(
        eq(schema.messageQueue.id, queued.id),
        eq(schema.messageQueue.status, "pending")
      )
    );

  if (claimResult.meta.changes === 0) {
    return { processed: 0 } as const;
  }

  const [claimed] = await db
    .select()
    .from(schema.messageQueue)
    .where(eq(schema.messageQueue.id, queued.id))
    .limit(1);

  if (!claimed || claimed.status !== "processing") {
    return { processed: 0 } as const;
  }

  try {
    const parsed = envelopeSchema.parse(JSON.parse(claimed.payloadJson));
    const envelope = parsed as Envelope;

    if (envelope.type === "user_text") {
      await handleUserText(db, envelope, { messageQueueId: claimed.id });
    } else if (envelope.type === "quick_reply") {
      await handleQuickReply(db, envelope, { messageQueueId: claimed.id });
    } else if (envelope.type === "checkout_returned") {
      await handleCheckoutReturned(db, envelope, {
        messageQueueId: claimed.id,
      });
    }

    await db
      .update(schema.messageQueue)
      .set({ error: null, status: "done" })
      .where(eq(schema.messageQueue.id, claimed.id));

    return { processed: 1 } as const;
  } catch (error) {
    await db
      .update(schema.messageQueue)
      .set({
        error: error instanceof Error ? error.message : "unknown_error",
        status: "failed",
      })
      .where(eq(schema.messageQueue.id, claimed.id));

    return { processed: 1 } as const;
  }
};

export const dispatchAll = async (db: Db, limit: number) => {
  const dispatchUntilExhausted = async (
    remaining: number,
    processed: number
  ): Promise<number> => {
    if (remaining <= 0) {
      return processed;
    }

    const res = await dispatchOnce(db);
    if (res.processed === 0) {
      return processed;
    }

    return await dispatchUntilExhausted(
      remaining - 1,
      processed + res.processed
    );
  };

  const processed = await dispatchUntilExhausted(limit, 0);
  return { processed } as const;
};
