import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Envelope } from "./types";

export interface SessionSummary {
  id: string;
  intent: string;
  status: string;
  updatedAt: string;
  userId: string;
}

export interface MessageSummary {
  content: unknown;
  createdAt: string;
  id: string;
  role: string;
  sessionId: string | null;
  type: string;
}

export interface JobResultSummary {
  catalogItemIds: string[];
  finishedAt: string | null;
  id: string;
  orderIds: string[];
  sessionId: string;
  status: string;
}

export interface CatalogItemSummary {
  id: string;
  title: string;
  subtitle: string | null;
  kind: string;
  priceCents: number;
  currency: string;
  connectionId: string;
  imageUrl: string | null;
}

export interface HostContextSnapshot {
  envelope: Envelope;
  explicitSession: SessionSummary | null;
  recentMessages: MessageSummary[];
  recentResults: JobResultSummary[];
  sessionCandidates: SessionSummary[];
  catalogItems: CatalogItemSummary[];
}

const MAX_PERSISTED_JSON_BYTES = 100_000;
const MAX_PERSISTED_JSON_DEPTH = 5;

export const parseBoundedJsonOrRaw = (
  value: string | null,
  options?: { maxDepth?: number }
): unknown => {
  if (!value || value.length > MAX_PERSISTED_JSON_BYTES) {
    return value ? "[unavailable]" : null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const maxDepth = options?.maxDepth ?? MAX_PERSISTED_JSON_DEPTH;
    const checkDepth = (item: unknown, depth: number): boolean => {
      if (depth > maxDepth || !item || typeof item !== "object") {
        return depth <= maxDepth;
      }
      return Object.values(item).every((child) => checkDepth(child, depth + 1));
    };
    return checkDepth(parsed, 0) ? parsed : "[unavailable]";
  } catch {
    return value;
  }
};

export const isOwnedSessionId = (sessionUserId: string, userId: string) =>
  sessionUserId === userId;

const toSessionSummary = (
  session: typeof schema.sessions.$inferSelect
): SessionSummary => ({
  id: session.id,
  intent: session.intent,
  status: session.status,
  updatedAt: session.updatedAt,
  userId: session.userId,
});

const extractIds = (
  value: unknown,
  key: "catalogItemId" | "orderId"
): string[] => {
  if (!value || typeof value !== "object") {
    return [];
  }
  const result: string[] = [];
  const visit = (item: unknown) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const record = item as Record<string, unknown>;
    if (typeof record[key] === "string") {
      result.push(record[key]);
    }
    for (const child of Object.values(item)) {
      visit(child);
    }
  };
  visit(value);
  return [...new Set(result)];
};

export const assembleHostContext = async (
  db: Db,
  input: { envelope: Envelope; sessionId?: string }
): Promise<HostContextSnapshot> => {
  const requestedSessionId = input.sessionId ?? input.envelope.sessionId;
  const [explicitRows, candidateRows, catalogRows] = await Promise.all([
    requestedSessionId
      ? db
          .select()
          .from(schema.sessions)
          .where(
            and(
              eq(schema.sessions.id, requestedSessionId),
              eq(schema.sessions.userId, input.envelope.userId)
            )
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, input.envelope.userId),
          inArray(schema.sessions.status, ["active", "awaiting_user"])
        )
      )
      .orderBy(desc(schema.sessions.updatedAt))
      .limit(5),
    db
      .select({
        connectionId: schema.connectionCatalogItems.connectionId,
        currency: schema.connectionCatalogItems.currency,
        id: schema.connectionCatalogItems.id,
        imageUrl: schema.connectionCatalogItems.imageUrl,
        kind: schema.connectionCatalogItems.kind,
        priceCents: schema.connectionCatalogItems.priceCents,
        subtitle: schema.connectionCatalogItems.subtitle,
        title: schema.connectionCatalogItems.title,
      })
      .from(schema.connectionCatalogItems)
      .where(eq(schema.connectionCatalogItems.isActive, true))
      .limit(100),
  ]);

  const explicitSession = explicitRows[0]
    ? toSessionSummary(explicitRows[0])
    : null;
  const sessionId = requestedSessionId
    ? explicitSession?.id
    : candidateRows[0]?.id;
  const [messageRows, jobRows] = await Promise.all([
    sessionId
      ? db
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.sessionId, sessionId),
              eq(schema.messages.userId, input.envelope.userId)
            )
          )
          .orderBy(desc(schema.messages.createdAt))
          .limit(20)
      : Promise.resolve([]),
    db
      .select()
      .from(schema.jobs)
      .innerJoin(schema.sessions, eq(schema.jobs.sessionId, schema.sessions.id))
      .where(
        and(
          eq(schema.sessions.userId, input.envelope.userId),
          eq(schema.jobs.status, "done")
        )
      )
      .orderBy(desc(schema.jobs.finishedAt))
      .limit(10),
  ]);

  return {
    catalogItems: catalogRows,
    envelope: input.envelope,
    explicitSession,
    recentMessages: messageRows.toReversed().map((message) => ({
      content: parseBoundedJsonOrRaw(message.contentJson),
      createdAt: message.createdAt,
      id: message.id,
      role: message.role,
      sessionId: message.sessionId,
      type: message.type,
    })),
    recentResults: jobRows.map(({ jobs: job }) => {
      const result = parseBoundedJsonOrRaw(job.resultJson);
      return {
        catalogItemIds: extractIds(result, "catalogItemId"),
        finishedAt: job.finishedAt,
        id: job.id,
        orderIds: extractIds(result, "orderId"),
        sessionId: job.sessionId,
        status: job.status,
      };
    }),
    sessionCandidates: candidateRows.map(toSessionSummary),
  };
};
