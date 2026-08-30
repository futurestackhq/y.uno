import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { eq } from "drizzle-orm";

import { logEvent } from "./events";
import { hostPlanDecisionSchema } from "./host-contract";
import type { HostPlanDecision } from "./host-contract";
import type { Envelope } from "./types";

export { canDelegatePlan } from "./reset";

export interface PersistedHostPlan {
  baseRevision: number;
  planId: string;
  sessionId: string;
  sessionRevision: number;
}

export const persistHostPlan = async (
  db: Db,
  input: {
    decision: HostPlanDecision;
    envelope: Envelope;
    sessionId?: string;
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

  await db.batch([
    db.insert(schema.hostPlans).values({
      baseRevision: sessionRevision,
      createdAt: timestamp,
      decisionJson: JSON.stringify(decision),
      decisionSummary: decision.decisionSummary,
      id: planId,
      sessionId,
      status: "persisted",
      updatedAt: timestamp,
    }),
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
            status:
              decision.conversation.state === "needs_clarification"
                ? "awaiting_user"
                : "active",
            updatedAt: timestamp,
          })
          .where(eq(schema.sessions.id, sessionId))
      : db.insert(schema.sessions).values({
          contextJson: JSON.stringify(decision.understanding.entities),
          createdAt: timestamp,
          id: sessionId,
          intent: decision.understanding.intent,
          planJson: JSON.stringify(decision.plan),
          requirementsJson: JSON.stringify(decision.understanding.constraints),
          revision: sessionRevision,
          status:
            decision.conversation.state === "needs_clarification"
              ? "awaiting_user"
              : "active",
          updatedAt: timestamp,
          userId: input.envelope.userId,
        }),
  ]);

  await Promise.all([
    logEvent(db, {
      data: { baseRevision: sessionRevision, planId },
      eventType: "host_plan_started",
      level: "info",
      sessionId,
    }),
    logEvent(db, {
      data: { baseRevision: sessionRevision, planId },
      eventType: "host_plan_persisted",
      level: "info",
      sessionId,
    }),
    logEvent(db, {
      data: { revision: sessionRevision, status: "active" },
      eventType: "session_status_changed",
      level: "info",
      sessionId,
    }),
  ]);

  return { baseRevision: sessionRevision, planId, sessionId, sessionRevision };
};
