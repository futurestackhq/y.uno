import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import { logEvent, logProgressLine } from "./events";
import {
  classifyIntentFromText,
  hasComposeReplyMarker,
  hasSourceJobId,
  rankCatalogItems,
} from "./job-runner-helpers";
import type { RankedItem } from "./job-runner-helpers";
import type { PlanNodeStatus, SessionPlan } from "./plan";
import { buildDelegationPrompt } from "./prompts";

const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 5000, 12_000] as const;

type JobRow = typeof schema.jobs.$inferSelect;
type SessionRow = typeof schema.sessions.$inferSelect;

interface ClassifyIntentInput {
  sessionId: string;
  text: string;
  userId: string;
}

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
  if (input.rankedItems.length === 0) {
    return {
      message: {
        items: [],
        text: "Ainda não encontrei uma opção no catálogo. Pode me dar mais detalhes?",
      },
      type: "text",
    };
  }

  const [first] = input.rankedItems;
  return {
    message: {
      items: input.rankedItems,
      text: `Encontrei ${first.title} e mais algumas opções que podem servir. Quer ver detalhes ou comprar agora?`,
    },
    type: "carousel",
  };
};

const updatePlanNode = (
  planJson: string,
  params: {
    jobId?: string;
    nodeId: string;
    now: string;
    status: PlanNodeStatus;
  }
): string => {
  const plan = parseJson<SessionPlan>(planJson);
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
    kind: "rank_catalog" | "compose_reply";
    session: SessionRow;
    sourceJobId: string;
    subagentName: string;
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
    hasSourceJobId(job.inputJson, params.sourceJobId)
  );

  if (existingJob) {
    return existingJob.id;
  }

  const jobId = crypto.randomUUID();
  const promptText = buildDelegationPrompt({
    input,
    kind: params.kind,
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
    promptText,
    resultJson: null,
    sessionId: params.session.id,
    startedAt: null,
    status: "queued",
    subagentName: params.subagentName,
    updatedAt: ts,
  });

  await db
    .update(schema.sessions)
    .set({
      planJson: updatePlanNode(params.session.planJson, {
        jobId,
        nodeId: params.kind,
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
        jobId: job.id,
        nodeId: job.kind,
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
        eq(schema.jobs.status, "queued"),
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
        eq(schema.jobs.status, "queued"),
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

  await markJobPlanNodeRunning(db, claimed);

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
          jobId: job.id,
          nodeId: job.kind,
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
    ? addMs(ts, BACKOFF_MS[retryIndex] ?? BACKOFF_MS.at(-1))
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
          jobId: job.id,
          nodeId: job.kind,
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
          jobId: job.id,
          nodeId: job.kind,
          now: ts.toISOString(),
          status: "failed",
        }),
        status: "failed",
        updatedAt: ts.toISOString(),
      })
      .where(eq(schema.sessions.id, job.sessionId));
  }

  await logEvent(db, {
    data: { error: message, nextRunAt, retrying: shouldRetry },
    eventType: "job_failed",
    jobId: job.id,
    level: shouldRetry ? "warn" : "error",
    sessionId: job.sessionId,
  });
};

const runClassifyIntent = async (db: Db, job: JobRow) => {
  const input = parseJson<ClassifyIntentInput>(job.inputJson);
  await logProgressLine(db, {
    jobId: job.id,
    line: "Classifying customer intent from latest message.",
    sessionId: job.sessionId,
  });

  const result = classifyIntentFromText(input.text);
  const session = await getSession(db, job.sessionId);
  const ts = nowIso();
  const nextPlan = updatePlanNode(session.planJson, {
    jobId: job.id,
    nodeId: "classify_intent",
    now: ts,
    status: "done",
  });

  await db
    .update(schema.sessions)
    .set({
      intent: result.intent,
      planJson: nextPlan,
      status: result.intent === "generic_request" ? "awaiting_user" : "active",
      updatedAt: ts,
    })
    .where(eq(schema.sessions.id, job.sessionId));

  await completeJob(db, job, result, {});

  await logEvent(db, {
    data: result,
    eventType: "intent_detected",
    jobId: job.id,
    level: "info",
    sessionId: job.sessionId,
  });

  if (result.intent === "generic_request") {
    await db.insert(schema.messages).values({
      contentJson: JSON.stringify({
        text: "Entendi. Me conta o que você quer comprar ou agendar para eu buscar opções.",
      }),
      createdAt: nowIso(),
      id: crypto.randomUUID(),
      role: "assistant",
      sessionId: job.sessionId,
      type: "text",
      userId: input.userId,
    });
    return;
  }

  const updatedSession = await getSession(db, job.sessionId);
  await enqueueJob(db, {
    input: { ...input, intent: result.intent },
    kind: "rank_catalog",
    session: updatedSession,
    sourceJobId: job.id,
    subagentName: "catalog-ranker",
  });
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

const runJob = async (db: Db, job: JobRow) => {
  await logEvent(db, {
    data: { attempt: job.attempts, jobKind: job.kind },
    eventType: "job_started",
    jobId: job.id,
    level: "info",
    sessionId: job.sessionId,
  });

  try {
    if (job.kind === "classify_intent") {
      await runClassifyIntent(db, job);
    } else if (job.kind === "rank_catalog") {
      await runRankCatalog(db, job);
    } else if (job.kind === "compose_reply") {
      await runComposeReply(db, job);
    } else {
      throw new Error(`Unsupported job kind: ${job.kind}`);
    }
  } catch (error) {
    await failJob(db, job, error);
  }
};

export const runJobsOnce = async (
  db: Db,
  params: { limit: number }
): Promise<{ ran: number }> => {
  const runNext = async (remaining: number, ran: number): Promise<number> => {
    if (remaining <= 0) {
      return ran;
    }

    const job = await claimNextJob(db);
    if (!job) {
      return ran;
    }

    await runJob(db, job);
    return await runNext(remaining - 1, ran + 1);
  };

  return { ran: await runNext(params.limit, 0) };
};
