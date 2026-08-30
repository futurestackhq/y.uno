import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, eq } from "drizzle-orm";

import { logEvent } from "./events";
import { hostPlanDecisionSchema } from "./host-contract";
import type { HostPlanDecision, HostSynthesisDecision } from "./host-contract";
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

export const persistHostPlan = async (
  db: Db,
  input: {
    decision: HostPlanDecision;
    envelope: Envelope;
    sessionId?: string;
    sourceJob?: { id: string };
  }
): Promise<PersistedHostPlan> => {
  const decision = hostPlanDecisionSchema.parse(input.decision);
  const requestedId = input.sessionId ?? input.envelope.sessionId;
  const rows = requestedId
    ? await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, requestedId))
        .limit(1)
    : [];
  const existing = rows.at(0);
  if (existing && existing.userId !== input.envelope.userId) {
    throw new Error("Host session does not belong to envelope user");
  }
  if (decision.session.action !== "create" && !existing) {
    throw new Error("Host selected a session that does not exist");
  }

  const sessionId =
    decision.session.action === "create" || !existing
      ? crypto.randomUUID()
      : existing.id;
  const baseRevision = existing?.revision ?? 0;
  const sessionRevision = baseRevision + 1;
  const planId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const nextStatus =
    decision.conversation.state === "needs_clarification"
      ? "awaiting_user"
      : "active";
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
