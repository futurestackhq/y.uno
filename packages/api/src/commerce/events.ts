import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";

export type ExecutionEventLevel = "info" | "warn" | "error";

type PlannedExecutionEventType =
  | "envelope_received"
  | "session_created"
  | "intent_detected"
  | "plan_created"
  | "plan_updated"
  | "delegation_created"
  | "job_queued"
  | "job_started"
  | "job_progress"
  | "job_done"
  | "job_failed"
  | "session_status_changed"
  | "host_plan_started"
  | "host_plan_persisted"
  | "plan_superseded";

type CommerceExecutionEventType =
  | "buy_missing_catalog_item"
  | "carousel_rendered"
  | "checkout_returned"
  | "order_drafted"
  | "payment_confirmed"
  | "quick_reply_received";

export interface ExecutionEvent {
  sessionId: string;
  jobId?: string;
  turnId?: string;
  level: ExecutionEventLevel;
  eventType: PlannedExecutionEventType | CommerceExecutionEventType;
  data: unknown;
  line?: string;
}

const nowIso = () => new Date().toISOString();

export const logEvent = async (db: Db, event: ExecutionEvent) => {
  await db.insert(schema.executionLogs).values({
    createdAt: nowIso(),
    dataJson: JSON.stringify(event.data),
    eventType: event.eventType,
    id: crypto.randomUUID(),
    jobId: event.jobId,
    level: event.level,
    line: event.line?.slice(0, 1000),
    sessionId: event.sessionId,
    turnId: event.turnId,
  });
};

export const logProgressLine = async (
  db: Db,
  params: { sessionId: string; jobId: string; line: string; turnId?: string }
) => {
  await logEvent(db, {
    data: {},
    eventType: "job_progress",
    jobId: params.jobId,
    level: "info",
    line: params.line.slice(0, 1000),
    sessionId: params.sessionId,
    turnId: params.turnId,
  });
};
