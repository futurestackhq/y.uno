import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, eq } from "drizzle-orm";

import { logEvent } from "./events";
import { hostPlanDecisionSchema } from "./host-contract";
import type { HostPlanDecision, HostSynthesisDecision } from "./host-contract";
import { completeTurnWithMessage } from "./turns";
import type { Envelope } from "./types";

export { canDelegatePlan } from "./reset";

export const getHostPlan = async (db: Db, planId: string) => {
  const [plan] = await db
    .select()
    .from(schema.hostPlans)
    .where(eq(schema.hostPlans.id, planId))
    .limit(1);
  if (!plan) {
    throw new Error(`Host plan not found: ${planId}`);
  }
  return {
    ...plan,
    decision: hostPlanDecisionSchema.parse(JSON.parse(plan.decisionJson)),
  };
};

export const markHostPlanSuperseded = async (db: Db, planId: string) => {
  await db
    .update(schema.hostPlans)
    .set({ status: "superseded", updatedAt: new Date().toISOString() })
    .where(eq(schema.hostPlans.id, planId));
};

export interface PersistedHostPlan {
  baseRevision: number;
  decision: HostPlanDecision;
  planId: string;
  session: typeof schema.sessions.$inferSelect;
  sessionId: string;
  sessionRevision: number;
}

type SessionRow = typeof schema.sessions.$inferSelect;

const getSelectedSession = async (
  db: Db,
  input: {
    decision: HostPlanDecision;
    envelope: Envelope;
    sessionId?: string;
  }
): Promise<SessionRow | undefined> => {
  const requestedId =
    input.sessionId ??
    input.decision.session.sessionId ??
    input.envelope.sessionId;
  if (!requestedId && input.decision.session.action === "create") {
    return undefined;
  }
  if (!requestedId) {
    throw new Error("Host selected no session for a continuing turn");
  }
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, requestedId))
    .limit(1);
  if (!session) {
    throw new Error("Host selected a session that does not exist");
  }
  if (session.userId !== input.envelope.userId) {
    throw new Error("Host session does not belong to envelope user");
  }
  return session;
};

const getNextSessionStatus = (decision: HostPlanDecision) =>
  ["needs_clarification", "respond_directly"].includes(
    decision.conversation.state
  )
    ? "awaiting_user"
    : "active";

export const persistHostPlan = async (
  db: Db,
  input: {
    decision: HostPlanDecision;
    envelope: Envelope;
    sessionId?: string;
    sourceJob?: { id: string };
    turnId?: string;
  }
): Promise<PersistedHostPlan> => {
  const decision = hostPlanDecisionSchema.parse(input.decision);
  const existing = await getSelectedSession(db, input);

  const sessionId = existing?.id ?? crypto.randomUUID();
  const baseRevision = existing?.revision ?? 0;
  const sessionRevision = baseRevision + 1;
  const planId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const nextStatus = getNextSessionStatus(decision);
  const results = await db.batch([
    existing
      ? db
          .update(schema.sessions)
          .set({
            contextJson: JSON.stringify(decision.understanding.entities),
            intent: decision.understanding.intent,
            planJson: JSON.stringify(decision.plan),
            requirementsJson: JSON.stringify(
              decision.understanding.constraints
            ),
            revision: sessionRevision,
            status: nextStatus,
            updatedAt: timestamp,
          })
          .where(
            and(
              eq(schema.sessions.id, sessionId),
              eq(schema.sessions.revision, baseRevision)
            )
          )
      : db.insert(schema.sessions).values({
          contextJson: JSON.stringify(decision.understanding.entities),
          createdAt: timestamp,
          id: sessionId,
          intent: decision.understanding.intent,
          planJson: JSON.stringify(decision.plan),
          requirementsJson: JSON.stringify(decision.understanding.constraints),
          revision: sessionRevision,
          status: nextStatus,
          updatedAt: timestamp,
          userId: input.envelope.userId,
        }),
    db.insert(schema.hostPlans).values({
      baseRevision,
      createdAt: timestamp,
      decisionJson: JSON.stringify(decision),
      decisionSummary: decision.decisionSummary,
      id: planId,
      sessionId,
      status: "persisted",
      updatedAt: timestamp,
    }),
  ]);
  if (existing && results[0].meta.changes !== 1) {
    throw new Error("Host plan revision is stale");
  }
  if (input.turnId) {
    await db.batch([
      db
        .update(schema.commerceTurns)
        .set({ sessionId, updatedAt: timestamp })
        .where(eq(schema.commerceTurns.id, input.turnId)),
      db
        .update(schema.messages)
        .set({ sessionId })
        .where(eq(schema.messages.turnId, input.turnId)),
      db
        .update(schema.jobs)
        .set({ sessionId, updatedAt: timestamp })
        .where(eq(schema.jobs.turnId, input.turnId)),
    ]);
  }

  const eventPromises = [
    logEvent(db, {
      data: { baseRevision, planId },
      eventType: "host_plan_started",
      level: "info",
      sessionId,
    }),
    logEvent(db, {
      data: { baseRevision, planId },
      eventType: "host_plan_persisted",
      level: "info",
      sessionId,
    }),
  ];
  if (!existing || existing.status !== nextStatus) {
    eventPromises.push(
      logEvent(db, {
        data: { revision: sessionRevision, status: nextStatus },
        eventType: "session_status_changed",
        level: "info",
        sessionId,
      })
    );
  }
  await Promise.all(eventPromises);

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  if (!session) {
    throw new Error("Host session was not persisted");
  }
  return {
    baseRevision,
    decision,
    planId,
    session,
    sessionId,
    sessionRevision,
  };
};

export const persistHostSynthesis = async (
  db: Db,
  input: {
    decision: HostSynthesisDecision;
    plan: Awaited<ReturnType<typeof getHostPlan>>;
    session: typeof schema.sessions.$inferSelect;
    jobId: string;
    turnId?: string;
  }
) => {
  const { decision } = input;
  let nextStatus: "done" | "awaiting_user" | "active" = "active";
  if (decision.nextAction === "complete") {
    nextStatus = "done";
  }
  if (decision.nextAction === "await_user") {
    nextStatus = "awaiting_user";
  }
  const content = {
    ...decision.assistantMessage.content,
    synthesisJobId: input.jobId,
  };
  if (input.turnId) {
    await completeTurnWithMessage(db, {
      content,
      outcome: "succeeded",
      sessionId: input.session.id,
      turnId: input.turnId,
      type: decision.assistantMessage.type,
    });
  } else {
    const existing = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.sessionId, input.session.id));
    if (
      !existing.some((message) =>
        message.contentJson.includes(`"synthesisJobId":"${input.jobId}"`)
      )
    ) {
      await db.insert(schema.messages).values({
        contentJson: JSON.stringify(content),
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        role: "assistant",
        sessionId: input.session.id,
        type: decision.assistantMessage.type,
        userId: input.session.userId,
      });
    }
  }
  await db
    .update(schema.hostPlans)
    .set({ status: "completed", updatedAt: new Date().toISOString() })
    .where(eq(schema.hostPlans.id, input.plan.id));
  await db
    .update(schema.sessions)
    .set({
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.sessions.id, input.session.id));
};
