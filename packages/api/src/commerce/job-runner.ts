import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import { logEvent, logProgressLine } from "./events";
import { runHostPlan, runHostSynthesis } from "./host-agent";
import type { HostModel } from "./host-agent";
import { assembleHostContext } from "./host-context";
import {
  canDelegatePlan,
  getHostPlan,
  markHostPlanSuperseded,
  persistHostPlan,
  persistHostSynthesis,
} from "./host-persistence";
import {
  hasComposeReplyMarker,
  hasSourceJobId,
  rankCatalogItems,
} from "./job-runner-helpers";
import type { RankedItem } from "./job-runner-helpers";
import type { PlanNodeStatus } from "./plan";
import { normalizePlanJson } from "./plan";
import { buildDelegationPrompt } from "./prompts";
import {
  buildTurnFailureMessage,
  completeTurnWithMessage,
  getTurn,
} from "./turns";
import type { Envelope } from "./types";

const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 5000, 12_000] as const;

type JobRow = typeof schema.jobs.$inferSelect;
type SessionRow = typeof schema.sessions.$inferSelect;

interface RankCatalogInput {
  sessionId: string;
  sourceJobId?: string;
  text: string;
  userId: string;
  intent: string;
}

interface RankCatalogResult {
  intent: string;
  items: RankedItem[];
}

type ComposeReplyInput = RankCatalogInput & {
  rankedItems: RankedItem[];
};

interface ComposeReplyResult {
  message: {
    text: string;
    items: RankedItem[];
  };
  type: "carousel" | "text";
}

const nowIso = () => new Date().toISOString();

const addMs = (base: Date, ms: number) =>
  new Date(base.getTime() + ms).toISOString();

const parseJson = <T>(json: string): T => JSON.parse(json) as T;

const buildReply = (input: ComposeReplyInput): ComposeReplyResult => {
  const [first] = input.rankedItems;
  if (!first) {
    return {
      message: {
        items: [],
        text: "I have not found an option in the catalog yet. Can you share more details?",
      },
      type: "text",
    };
  }

  return {
    message: {
      items: input.rankedItems,
      text: `I found ${first.title} and some other options that may work. Would you like to view details or buy now?`,
    },
    type: "carousel",
  };
};

const updatePlanNode = (
  planJson: string,
  params: {
    intent: string;
    jobId?: string;
    nodeId: string;
    now: string;
    status: PlanNodeStatus;
  }
): string => {
  const plan = normalizePlanJson(planJson, params.intent);
  return JSON.stringify({
    ...plan,
    nodes: plan.nodes.map((node) =>
      node.id === params.nodeId
        ? {
            ...node,
            jobId: params.jobId ?? node.jobId,
            status: params.status,
          }
        : node
    ),
    updatedAt: params.now,
  });
};

const getSession = async (db: Db, sessionId: string): Promise<SessionRow> => {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return session;
};

const enqueueJob = async (
  db: Db,
  params: {
    input: unknown;
    kind:
      | "rank_catalog"
      | "compose_reply"
      | "catalog_search"
      | "catalog_details"
      | "create_order"
      | "prepare_checkout"
      | "host_synthesis";
    session: SessionRow;
    sourceJobId: string;
    subagentName: string;
    planId?: string;
    nodeId?: string;
    turnId?: string;
  }
) => {
  const ts = nowIso();
  const input = {
    ...(params.input as object),
    sourceJobId: params.sourceJobId,
  };
  const existingJobs = await db
    .select()
    .from(schema.jobs)
    .where(
      and(
        eq(schema.jobs.sessionId, params.session.id),
        eq(schema.jobs.kind, params.kind)
      )
    );
  const existingJob = existingJobs.find((job) =>
    params.planId && params.nodeId
      ? job.planId === params.planId && job.nodeId === params.nodeId
      : hasSourceJobId(job.inputJson, params.sourceJobId)
  );

  if (existingJob) {
    return existingJob.id;
  }

  const jobId = crypto.randomUUID();
  const promptText = buildDelegationPrompt({
    input,
    kind: params.kind,
    nodeId: params.nodeId ?? null,
    planId: params.planId ?? null,
    session: { id: params.session.id, intent: params.session.intent },
  });

  await db.insert(schema.jobs).values({
    attempts: 0,
    createdAt: ts,
    errorText: null,
    finishedAt: null,
    id: jobId,
    inputJson: JSON.stringify(input),
    kind: params.kind,
    leaseExpiresAt: null,
    nextRunAt: ts,
    nodeId: params.nodeId ?? null,
    planId: params.planId ?? null,
    promptText,
    resultJson: null,
    sessionId: params.session.id,
    startedAt: null,
    status: "queued",
    subagentName: params.subagentName,
    turnId: params.turnId,
    updatedAt: ts,
  });

  await db
    .update(schema.sessions)
    .set({
      planJson: updatePlanNode(params.session.planJson, {
        intent: params.session.intent,
        jobId,
        nodeId: params.nodeId ?? params.kind,
        now: ts,
        status: "ready",
      }),
      updatedAt: ts,
    })
    .where(eq(schema.sessions.id, params.session.id));

  await logEvent(db, {
    data: { jobKind: params.kind, promptPreview: promptText.slice(0, 240) },
    eventType: "delegation_created",
    jobId,
    level: "info",
    sessionId: params.session.id,
  });

  await logEvent(db, {
    data: { jobKind: params.kind },
    eventType: "job_queued",
    jobId,
    level: "info",
    sessionId: params.session.id,
  });

  return jobId;
};

const markJobPlanNodeRunning = async (db: Db, job: JobRow) => {
  const session = await getSession(db, job.sessionId);
  const ts = nowIso();
  await db
    .update(schema.sessions)
    .set({
      planJson: updatePlanNode(session.planJson, {
        intent: session.intent,
        jobId: job.id,
        nodeId: job.nodeId ?? job.kind,
        now: ts,
        status: "running",
      }),
      updatedAt: ts,
    })
    .where(eq(schema.sessions.id, job.sessionId));
};

const claimNextJob = async (db: Db): Promise<JobRow | null> => {
  const now = nowIso();
  const [queued] = await db
    .select()
    .from(schema.jobs)
    .where(
      and(
        or(
          eq(schema.jobs.status, "queued"),
          and(
            eq(schema.jobs.status, "running"),
            or(
              isNull(schema.jobs.leaseExpiresAt),
              lte(schema.jobs.leaseExpiresAt, now)
            )
          )
        ),
        or(isNull(schema.jobs.nextRunAt), lte(schema.jobs.nextRunAt, now)),
        or(
          isNull(schema.jobs.leaseExpiresAt),
          lte(schema.jobs.leaseExpiresAt, now)
        )
      )
    )
    .orderBy(asc(schema.jobs.nextRunAt), asc(schema.jobs.createdAt))
    .limit(1);

  if (!queued) {
    return null;
  }

  const claimTime = new Date();
  const claimIso = claimTime.toISOString();
  const leaseExpiresAt = addMs(claimTime, LEASE_MS);
  const claimResult = await db
    .update(schema.jobs)
    .set({
      attempts: queued.attempts + 1,
      leaseExpiresAt,
      startedAt: claimIso,
      status: "running",
      updatedAt: claimIso,
    })
    .where(
      and(
        eq(schema.jobs.id, queued.id),
        or(
          eq(schema.jobs.status, "queued"),
          and(
            eq(schema.jobs.status, "running"),
            or(
              isNull(schema.jobs.leaseExpiresAt),
              lte(schema.jobs.leaseExpiresAt, now)
            )
          )
        ),
        or(
          isNull(schema.jobs.leaseExpiresAt),
          lte(schema.jobs.leaseExpiresAt, now)
        )
      )
    );

  if (claimResult.meta.changes === 0) {
    return null;
  }

  const [claimed] = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.id, queued.id))
    .limit(1);

  if (!claimed) {
    return null;
  }

  try {
    await markJobPlanNodeRunning(db, claimed);
  } catch (error) {
    const recoveryTime = new Date();
    const shouldRetry = claimed.attempts < MAX_ATTEMPTS;
    await db
      .update(schema.jobs)
      .set({
        errorText: error instanceof Error ? error.message : "unknown_error",
        finishedAt: shouldRetry ? null : recoveryTime.toISOString(),
        leaseExpiresAt: null,
        nextRunAt: shouldRetry
          ? addMs(
              recoveryTime,
              BACKOFF_MS[Math.max(0, claimed.attempts - 1)] ??
                BACKOFF_MS.at(-1) ??
                0
            )
          : null,
        status: shouldRetry ? "queued" : "failed",
        updatedAt: recoveryTime.toISOString(),
      })
      .where(eq(schema.jobs.id, claimed.id));
    return null;
  }

  return claimed;
};

const completeJob = async (
  db: Db,
  job: JobRow,
  result: unknown,
  params: { session?: SessionRow; status?: "active" | "awaiting_user" }
) => {
  const ts = nowIso();

  await db
    .update(schema.jobs)
    .set({
      errorText: null,
      finishedAt: ts,
      leaseExpiresAt: null,
      resultJson: JSON.stringify(result),
      status: "done",
      updatedAt: ts,
    })
    .where(eq(schema.jobs.id, job.id));

  if (params.session) {
    await db
      .update(schema.sessions)
      .set({
        planJson: updatePlanNode(params.session.planJson, {
          intent: params.session.intent,
          jobId: job.id,
          nodeId: job.nodeId ?? job.kind,
          now: ts,
          status: "done",
        }),
        status: params.status ?? params.session.status,
        updatedAt: ts,
      })
      .where(eq(schema.sessions.id, params.session.id));
  }

  await logEvent(db, {
    data: { result },
    eventType: "job_done",
    jobId: job.id,
    level: "info",
    sessionId: job.sessionId,
  });
};

const failJob = async (db: Db, job: JobRow, error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  const ts = new Date();
  const retryIndex = Math.max(0, job.attempts - 1);
  const shouldRetry = job.attempts < MAX_ATTEMPTS;
  const nextRunAt = shouldRetry
    ? addMs(ts, BACKOFF_MS[retryIndex] ?? BACKOFF_MS.at(-1) ?? 0)
    : null;

  await db
    .update(schema.jobs)
    .set({
      errorText: message,
      finishedAt: shouldRetry ? null : ts.toISOString(),
      leaseExpiresAt: null,
      nextRunAt,
      status: shouldRetry ? "queued" : "failed",
      updatedAt: ts.toISOString(),
    })
    .where(eq(schema.jobs.id, job.id));

  if (shouldRetry) {
    const session = await getSession(db, job.sessionId);
    await db
      .update(schema.sessions)
      .set({
        planJson: updatePlanNode(session.planJson, {
          intent: session.intent,
          jobId: job.id,
          nodeId: job.nodeId ?? job.kind,
          now: ts.toISOString(),
          status: "ready",
        }),
        updatedAt: ts.toISOString(),
      })
      .where(eq(schema.sessions.id, job.sessionId));
  }

  if (!shouldRetry) {
    const session = await getSession(db, job.sessionId);
    await db
      .update(schema.sessions)
      .set({
        planJson: updatePlanNode(session.planJson, {
          intent: session.intent,
          jobId: job.id,
          nodeId: job.nodeId ?? job.kind,
          now: ts.toISOString(),
          status: "failed",
        }),
        status: "failed",
        updatedAt: ts.toISOString(),
      })
      .where(eq(schema.sessions.id, job.sessionId));
    if (job.turnId) {
      const turn = await getTurn(db, job.turnId);
      if (turn) {
        await completeTurnWithMessage(db, {
          content: { text: buildTurnFailureMessage(turn.summary) },
          outcome: "failed",
          sessionId: session.id,
          turnId: job.turnId,
          type: "text",
        });
      }
    }
  }

  await logEvent(db, {
    data: { error: message, nextRunAt, retrying: shouldRetry },
    eventType: "job_failed",
    jobId: job.id,
    level: shouldRetry ? "warn" : "error",
    sessionId: job.sessionId,
  });
};

const writeAssistantMessage = async (
  db: Db,
  sessionId: string,
  userId: string,
  content: unknown
) => {
  await db.insert(schema.messages).values({
    contentJson: JSON.stringify(content),
    createdAt: nowIso(),
    id: crypto.randomUUID(),
    role: "assistant",
    sessionId,
    type: "text",
    userId,
  });
};

const materializeDecisionNodes = async (
  db: Db,
  planId: string,
  session: SessionRow,
  decision: Awaited<ReturnType<typeof runHostPlan>>,
  turnId?: string
) => {
  await Promise.all(
    decision.plan.nodes
      .filter((node) => node.dependsOn.length === 0)
      .map((node) =>
        enqueueJob(db, {
          input: { ...node.input, objective: node.objective, planId },
          kind: node.kind,
          nodeId: node.id,
          planId,
          session,
          sourceJobId: planId,
          subagentName: `host-${node.kind}`,
          turnId,
        })
      )
  );
};

const runHostPlanJob = async (db: Db, job: JobRow, model?: HostModel) => {
  const input = parseJson<{ envelope: Envelope }>(job.inputJson);
  const snapshot = await assembleHostContext(db, {
    envelope: input.envelope,
    sessionId: job.sessionId,
  });
  const decision = await runHostPlan({
    db,
    envelope: input.envelope,
    model,
    sessionId: job.sessionId,
    snapshot,
  });
  const persisted = await persistHostPlan(db, {
    decision,
    envelope: input.envelope,
    sessionId: job.sessionId,
    sourceJob: job,
    turnId: job.turnId ?? undefined,
  });
  await completeJob(
    db,
    job,
    { planId: persisted.planId },
    { session: persisted.session }
  );
  if (
    decision.conversation.state === "needs_clarification" ||
    decision.conversation.state === "respond_directly"
  ) {
    if (!decision.userMessage) {
      throw new Error("Host planning response had no terminal user message");
    }
    await (job.turnId
      ? completeTurnWithMessage(db, {
          content: { text: decision.userMessage },
          outcome: "succeeded",
          sessionId: persisted.session.id,
          turnId: job.turnId,
          type: "text",
        })
      : writeAssistantMessage(db, persisted.session.id, input.envelope.userId, {
          text: decision.userMessage,
        }));
    await db
      .update(schema.hostPlans)
      .set({ status: "completed", updatedAt: nowIso() })
      .where(eq(schema.hostPlans.id, persisted.planId));
    return;
  }
  await materializeDecisionNodes(
    db,
    persisted.planId,
    persisted.session,
    decision,
    job.turnId ?? undefined
  );
  await db
    .update(schema.hostPlans)
    .set({ status: "delegated", updatedAt: nowIso() })
    .where(eq(schema.hostPlans.id, persisted.planId));
};

export const materializeReadyPlanNodes = async (db: Db, planId: string) => {
  const plan = await getHostPlan(db, planId);
  const session = await getSession(db, plan.sessionId);
  if (
    !canDelegatePlan({
      baseRevision: plan.baseRevision,
      sessionRevision: session.revision,
    })
  ) {
    await markHostPlanSuperseded(db, plan.id);
    return { materialized: 0, stale: true };
  }
  const jobs = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.planId, planId));
  const turnId = jobs.find((job) => job.turnId)?.turnId ?? undefined;
  const done = new Set(
    jobs.filter((job) => job.status === "done").map((job) => job.nodeId)
  );
  const ready = plan.decision.plan.nodes.filter((node) =>
    node.dependsOn.every((dependency) => done.has(dependency))
  );
  const pendingNodes = ready.filter(
    (node) => !jobs.some((job) => job.nodeId === node.id)
  );
  await Promise.all(
    pendingNodes.map((node) =>
      enqueueJob(db, {
        input: {
          ...node.input,
          baseRevision: plan.baseRevision,
          objective: node.objective,
          planId,
        },
        kind: node.kind,
        nodeId: node.id,
        planId,
        session,
        sourceJobId: planId,
        subagentName: `host-${node.kind}`,
        turnId,
      })
    )
  );
  await db
    .update(schema.hostPlans)
    .set({ status: "delegated", updatedAt: nowIso() })
    .where(eq(schema.hostPlans.id, planId));
  return { materialized: pendingNodes.length, stale: false };
};

export const scheduleHostSynthesis = async (db: Db, planId: string) => {
  const plan = await getHostPlan(db, planId);
  const session = await getSession(db, plan.sessionId);
  const jobs = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.planId, planId));
  const turnId = jobs.find((job) => job.turnId)?.turnId ?? undefined;
  if (
    !plan.decision.plan.nodes.every((node) =>
      jobs.some(
        (job) =>
          job.nodeId === node.id && ["done", "failed"].includes(job.status)
      )
    )
  ) {
    return false;
  }
  if (jobs.some((job) => job.kind === "host_synthesis")) {
    return false;
  }
  await enqueueJob(db, {
    input: { baseRevision: plan.baseRevision, planId },
    kind: "host_synthesis",
    nodeId: "host_synthesis",
    planId,
    session,
    sourceJobId: planId,
    subagentName: "host-synthesis",
    turnId,
  });
  return true;
};

const runRankCatalog = async (db: Db, job: JobRow) => {
  const input = parseJson<RankCatalogInput>(job.inputJson);
  await logProgressLine(db, {
    jobId: job.id,
    line: "Ranking active catalog items for the detected intent.",
    sessionId: job.sessionId,
  });

  const catalogItems = await db.select().from(schema.connectionCatalogItems);
  const result: RankCatalogResult = {
    intent: input.intent,
    items: rankCatalogItems(catalogItems, input.text),
  };

  const session = await getSession(db, job.sessionId);
  await completeJob(db, job, result, { session });

  const updatedSession = await getSession(db, job.sessionId);
  await enqueueJob(db, {
    input: { ...input, rankedItems: result.items },
    kind: "compose_reply",
    session: updatedSession,
    sourceJobId: job.id,
    subagentName: "reply-composer",
  });
};

const runComposeReply = async (db: Db, job: JobRow) => {
  const input = parseJson<ComposeReplyInput>(job.inputJson);
  await logProgressLine(db, {
    jobId: job.id,
    line: "Composing the assistant response from ranked catalog results.",
    sessionId: job.sessionId,
  });

  const result = buildReply(input);
  const session = await getSession(db, job.sessionId);
  const existingMessages = await db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.sessionId, job.sessionId),
        eq(schema.messages.role, "assistant")
      )
    );
  const existingMessage = existingMessages.find((message) =>
    hasComposeReplyMarker(message.contentJson, job.id)
  );

  if (!existingMessage) {
    await db.insert(schema.messages).values({
      contentJson: JSON.stringify({ ...result.message, composeJobId: job.id }),
      createdAt: nowIso(),
      id: crypto.randomUUID(),
      role: "assistant",
      sessionId: job.sessionId,
      type: result.type,
      userId: input.userId,
    });
  }

  await completeJob(db, job, result, { session, status: "awaiting_user" });
};

const runSpecializedPlanNode = async (db: Db, job: JobRow) => {
  const input = parseJson<Record<string, unknown>>(job.inputJson);
  const session = await getSession(db, job.sessionId);
  if (
    job.planId &&
    typeof input.baseRevision === "number" &&
    !canDelegatePlan({
      baseRevision: input.baseRevision,
      sessionRevision: session.revision,
    })
  ) {
    throw new Error("Plan revision became stale before side effect");
  }
  let result: Record<string, unknown>;
  if (job.kind === "catalog_search") {
    const items = await db.select().from(schema.connectionCatalogItems);
    result = {
      items: rankCatalogItems(items, String(input.text ?? input.query ?? "")),
    };
  } else if (job.kind === "catalog_details") {
    const [item] = await db
      .select()
      .from(schema.connectionCatalogItems)
      .where(
        eq(schema.connectionCatalogItems.id, String(input.itemId ?? input.id))
      )
      .limit(1);
    result = { item: item ?? null };
  } else if (job.kind === "create_order") {
    const itemId = String(input.catalogItemId ?? input.itemId ?? "");
    const [item] = await db
      .select()
      .from(schema.connectionCatalogItems)
      .where(eq(schema.connectionCatalogItems.id, itemId))
      .limit(1);
    if (!item) {
      throw new Error(`Catalog item not found: ${itemId}`);
    }
    const orderId = String(input.orderId ?? crypto.randomUUID());
    const qty = Math.max(1, Number(input.quantity ?? input.qty ?? 1));
    const timestamp = nowIso();
    await db.insert(schema.orders).values({
      connectionId: item.connectionId,
      createdAt: timestamp,
      currency: item.currency,
      id: orderId,
      paymentMethodId: null,
      sessionId: session.id,
      status: "draft",
      totalCents: item.priceCents * qty,
      updatedAt: timestamp,
    });
    await db.insert(schema.orderItems).values({
      catalogItemId: item.id,
      id: crypto.randomUUID(),
      lineTotalCents: item.priceCents * qty,
      orderId,
      qty,
      unitPriceCents: item.priceCents,
    });
    result = {
      orderId,
      requiresConfirmation: true,
      status: "draft",
      totalCents: item.priceCents * qty,
    };
  } else {
    const orderId = String(input.orderId ?? "");
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    await db
      .update(schema.orders)
      .set({ status: "checkout_started", updatedAt: nowIso() })
      .where(eq(schema.orders.id, order.id));
    result = {
      orderId: order.id,
      purchaseSummary: input,
      requiresConfirmation: true,
      status: "awaiting_confirmation",
    };
  }
  await completeJob(db, job, result, { session });
  await materializeReadyPlanNodes(db, job.planId as string);
  await scheduleHostSynthesis(db, job.planId as string);
};

const runJob = async (db: Db, job: JobRow, model?: HostModel) => {
  await logEvent(db, {
    data: { attempt: job.attempts, jobKind: job.kind },
    eventType: "job_started",
    jobId: job.id,
    level: "info",
    sessionId: job.sessionId,
  });

  try {
    if (job.planId) {
      const plan = await getHostPlan(db, job.planId);
      const session = await getSession(db, job.sessionId);
      const input = parseJson<{ baseRevision?: number }>(job.inputJson);
      if (
        !canDelegatePlan({
          baseRevision: input.baseRevision ?? plan.baseRevision,
          sessionRevision: session.revision,
        })
      ) {
        await markHostPlanSuperseded(db, plan.id);
        await completeJob(db, job, { planSuperseded: true }, {});
        if (job.turnId) {
          await completeTurnWithMessage(db, {
            content: {
              text: "I received a newer update, so I set this request aside.",
            },
            outcome: "superseded",
            sessionId: session.id,
            turnId: job.turnId,
            type: "text",
          });
        }
        await logEvent(db, {
          data: { planId: job.planId },
          eventType: "plan_superseded",
          jobId: job.id,
          level: "info",
          sessionId: job.sessionId,
        });
        return;
      }
    }
    if (job.kind === "host_plan") {
      await runHostPlanJob(db, job, model);
    } else if (job.kind === "rank_catalog") {
      await runRankCatalog(db, job);
    } else if (job.kind === "compose_reply") {
      await runComposeReply(db, job);
    } else if (job.kind === "host_synthesis") {
      const plan = await getHostPlan(db, job.planId as string);
      const session = await getSession(db, job.sessionId);
      const nodeJobs = await db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.planId, plan.id));
      const envelope = {
        sessionId: session.id,
        text: "Synthesize completed plan results",
        userId: session.userId,
      } as Envelope;
      const decision = await runHostSynthesis({
        context: nodeJobs.map((node) => ({
          error: node.errorText,
          nodeId: node.nodeId,
          result: node.resultJson,
          status: node.status,
        })),
        db,
        envelope,
        model,
      });
      const failedNodes = nodeJobs.filter(
        (node) => node.nodeId !== "host_synthesis" && node.status === "failed"
      );
      await persistHostSynthesis(db, {
        decision:
          failedNodes.length > 0
            ? {
                ...decision,
                assistantMessage: {
                  content: {
                    failureContext: failedNodes.map((node) => ({
                      error: node.errorText,
                      nodeId: node.nodeId,
                    })),
                    text: "I could not complete this request because a step failed. I will forward the issue to support.",
                  },
                  type: "text",
                },
                nextAction: "await_user",
              }
            : decision,
        jobId: job.id,
        plan,
        session,
        turnId: job.turnId ?? undefined,
      });
      await completeJob(db, job, decision, {});
    } else if (
      [
        "catalog_search",
        "catalog_details",
        "create_order",
        "prepare_checkout",
      ].includes(job.kind)
    ) {
      await runSpecializedPlanNode(db, job);
    } else {
      throw new Error(`Unsupported job kind: ${job.kind}`);
    }
  } catch (error) {
    await failJob(db, job, error);
  }
};

export const runJobsOnce = async (
  db: Db,
  params: { limit: number; model?: HostModel }
): Promise<{ ran: number }> => {
  const persistedPlans = await db
    .select()
    .from(schema.hostPlans)
    .where(eq(schema.hostPlans.status, "persisted"));
  await Promise.all(
    persistedPlans.map((plan) => materializeReadyPlanNodes(db, plan.id))
  );

  const runNext = async (remaining: number, ran: number): Promise<number> => {
    if (remaining <= 0) {
      return ran;
    }

    const job = await claimNextJob(db);
    if (!job) {
      return ran;
    }

    await runJob(db, job, params.model);
    return await runNext(remaining - 1, ran + 1);
  };

  return { ran: await runNext(params.limit, 0) };
};
