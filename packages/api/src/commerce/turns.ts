import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { and, eq, isNull } from "drizzle-orm";

export type TurnStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "superseded";

type AssistantMessageType = "text" | "carousel" | "purchase_summary";

const terminalStatuses = new Set<TurnStatus>([
  "succeeded",
  "failed",
  "superseded",
]);

const nowIso = () => new Date().toISOString();

export const getTurn = async (db: Db, turnId: string) => {
  const [turn] = await db
    .select()
    .from(schema.commerceTurns)
    .where(eq(schema.commerceTurns.id, turnId))
    .limit(1);
  return turn ?? null;
};

export const completeTurnWithMessage = async (
  db: Db,
  input: {
    content: Record<string, unknown>;
    inReplyToMessageId?: string | null;
    outcome: Extract<TurnStatus, "succeeded" | "failed" | "superseded">;
    sessionId?: string | null;
    turnId: string;
    type: AssistantMessageType;
  }
) => {
  const turn = await getTurn(db, input.turnId);
  if (!turn || terminalStatuses.has(turn.status as TurnStatus)) {
    return false;
  }

  const messageId = `terminal:${input.turnId}`;
  const timestamp = nowIso();
  await db.batch([
    db
      .insert(schema.messages)
      .values({
        contentJson: JSON.stringify({ ...input.content, turnId: input.turnId }),
        createdAt: timestamp,
        id: messageId,
        inReplyToMessageId:
          input.inReplyToMessageId ?? turn.inboundMessageId ?? null,
        role: "assistant",
        sessionId: input.sessionId ?? turn.sessionId ?? null,
        turnId: input.turnId,
        type: input.type,
        userId: turn.userId,
      })
      .onConflictDoNothing(),
    db
      .update(schema.commerceTurns)
      .set({
        sessionId: input.sessionId ?? turn.sessionId ?? null,
        status: input.outcome,
        terminalMessageId: messageId,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(schema.commerceTurns.id, input.turnId),
          isNull(schema.commerceTurns.terminalMessageId)
        )
      ),
  ]);
  return true;
};

export const buildTurnFailureMessage = (summary: string) =>
  `Não consegui concluir sua solicitação${summary ? ` (${summary})` : ""} agora. Tente novamente em instantes.`;
