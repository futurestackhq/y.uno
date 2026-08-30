import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, desc, eq, sql } from "drizzle-orm";

import { dispatchOnce } from "./dispatcher";
import { runJobsOnce } from "./job-runner";
import { seedDemoData } from "./seed";
import type { Envelope } from "./types";

const nowIso = () => new Date().toISOString();

const ensureUser = async (db: Db, userId: string) => {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(schema.users).values({
    createdAt: nowIso(),
    displayName: "Marta",
    id: userId,
  });
};

const toIdempotencyKey = (envelope: Envelope): string => {
  if (envelope.idempotencyKey) {
    return envelope.idempotencyKey;
  }

  return `${envelope.type}:${JSON.stringify(envelope)}`;
};

export const enqueueEnvelope = async (db: Db, envelope: Envelope) => {
  await seedDemoData(db);
  await ensureUser(db, envelope.userId);
  const requestId = envelope.idempotencyKey ?? crypto.randomUUID();
  const [existingTurn] = await db
    .select()
    .from(schema.commerceTurns)
    .where(
      and(
        eq(schema.commerceTurns.requestId, requestId),
        eq(schema.commerceTurns.userId, envelope.userId)
      )
    )
    .limit(1);
  if (existingTurn) {
    return {
      sessionId: existingTurn.sessionId,
      turnId: existingTurn.id,
    } as const;
  }

  const turnId = crypto.randomUUID();
  const payload = { ...envelope, idempotencyKey: requestId };
  let summary: string;
  if (envelope.type === "user_text") {
    summary = envelope.text;
  } else if (envelope.type === "quick_reply") {
    summary = `Selected action: ${envelope.action}`;
  } else {
    summary = `Retorno do checkout: ${envelope.status}`;
  }

  await db.batch([
    db
      .insert(schema.commerceTurns)
      .values({
        createdAt: nowIso(),
        id: turnId,
        requestId,
        sessionId: envelope.sessionId,
        status: "queued",
        summary,
        updatedAt: nowIso(),
        userId: envelope.userId,
      })
      .onConflictDoNothing(),
    db
      .insert(schema.messageQueue)
      .values({
        id: crypto.randomUUID(),
        idempotencyKey: requestId ?? toIdempotencyKey(envelope),
        payloadJson: JSON.stringify(payload),
        receivedAt: nowIso(),
        sessionId: envelope.sessionId,
        status: "pending",
        turnId,
        type: envelope.type,
        userId: envelope.userId,
      })
      .onConflictDoNothing(),
  ]);

  return { sessionId: envelope.sessionId ?? null, turnId } as const;
};

export const tickOnce = async (db: Db) => {
  const dispatched = await dispatchOnce(db);
  const ran = await runJobsOnce(db, { limit: 1 });

  return {
    ok: true,
    processed: dispatched.processed + ran.ran,
  } as const;
};

export const listSessions = async (db: Db, userId: string) =>
  await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.updatedAt))
    .limit(50);

export const listMessages = async (
  db: Db,
  userId: string,
  sessionId?: string
) =>
  await db
    .select()
    .from(schema.messages)
    .where(
      sessionId
        ? and(
            eq(schema.messages.userId, userId),
            eq(schema.messages.sessionId, sessionId)
          )
        : eq(schema.messages.userId, userId)
    )
    .orderBy(schema.messages.createdAt)
    .limit(200);

export const listLogs = async (db: Db, sessionId?: string) =>
  await db
    .select()
    .from(schema.executionLogs)
    .where(sessionId ? eq(schema.executionLogs.sessionId, sessionId) : sql`1=1`)
    .orderBy(desc(schema.executionLogs.createdAt))
    .limit(200);
