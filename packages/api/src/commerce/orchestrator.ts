import { createOpenAI } from "@ai-sdk/openai";
import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { env } from "@hackathon/env/server";
import { generateText, Output } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { logEvent } from "./events";
import { seedDemoData } from "./seed";
import type { Envelope, QuickReplyAction, SessionStatus } from "./types";

const nowIso = () => new Date().toISOString();

const centsToBrl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);

type CatalogItemRow = typeof schema.connectionCatalogItems.$inferSelect;
type ConnectionRow = typeof schema.connections.$inferSelect;

interface RankedItem {
  item: CatalogItemRow;
  connection: ConnectionRow;
  score: number;
}

export const computeRankingScore = ({
  commissionBps,
  priceCents,
  slaMinutes,
}: {
  commissionBps: number;
  priceCents: number;
  slaMinutes: number;
}) => {
  // Lower price and lower SLA are better; higher commission is better.
  // We invert price/SLA into a [0..1] score with simple caps for MVP.
  // Cap at R$ 250.
  const priceScore = 1 - Math.min(priceCents / 25_000, 1);
  // Cap at 8h.
  const slaScore = 1 - Math.min(slaMinutes / 480, 1);
  // Cap at 15%.
  const commissionScore = Math.min(commissionBps / 1500, 1);

  return 0.55 * priceScore + 0.25 * slaScore + 0.2 * commissionScore;
};

const detectIntent = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("banho") || normalized.includes("tosa")) {
    return "service_grooming";
  }
  if (normalized.includes("ração") || normalized.includes("racao")) {
    return "product_pet_food";
  }
  if (normalized.includes("brinquedo") || normalized.includes("bola")) {
    return "product_toy";
  }
  return "generic_request";
};

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const intentEnum = z.enum([
  "service_grooming",
  "product_pet_food",
  "product_toy",
  "generic_request",
]);

const intentExtractionSchema = z.object({
  entities: z
    .object({
      address: z.string().optional(),
      itemQuery: z.string().optional(),
      qty: z.number().int().positive().optional(),
    })
    .optional(),
  intent: intentEnum,
  missing: z.array(z.string()).default([]),
});

type IntentExtraction = z.infer<typeof intentExtractionSchema>;

const classifyIntentWithAi = async (
  text: string
): Promise<IntentExtraction> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: "generic_request", missing: [] };
  }

  if (!env.OPENAI_API_KEY) {
    return { intent: detectIntent(trimmed), missing: [] };
  }

  try {
    const { output } = await generateText({
      instructions:
        "You are an intent classifier for a WhatsApp commerce assistant. " +
        "Return a single intent + lightweight entities. " +
        "If essential information is missing (e.g., service pickup address), add it to missing[].",
      model: openai("gpt-4o-mini"),
      output: Output.object({ schema: intentExtractionSchema }),
      prompt: `User message: ${trimmed}`,
    });

    return output;
  } catch {
    return { intent: detectIntent(trimmed), missing: [] };
  }
};

const buildCarouselMessage = (ranked: RankedItem[]) => ({
  cards: ranked.map((r) => ({
    ctas: [
      { action: "details" as const, label: "Ver detalhes" },
      { action: "buy" as const, label: "Comprar" },
    ],
    id: r.item.id,
    merchant: r.connection.displayName,
    price: centsToBrl(r.item.priceCents),
    subtitle: r.item.subtitle,
    title: r.item.title,
  })),
  type: "carousel" as const,
});

const addMessage = async (
  db: Db,
  {
    content,
    role,
    sessionId,
    type,
    userId,
  }: {
    content: unknown;
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
  }
) => {
  await db.insert(schema.messages).values({
    contentJson: JSON.stringify(content),
    createdAt: nowIso(),
    id: crypto.randomUUID(),
    role,
    sessionId,
    type,
    userId,
  });
};

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

const getDefaultPaymentMethod = async (db: Db, userId: string) => {
  const pm = await db
    .select()
    .from(schema.paymentMethods)
    .where(
      and(
        eq(schema.paymentMethods.isDefault, true),
        eq(schema.paymentMethods.userId, userId)
      )
    )
    .limit(1);
  return pm.at(0) ?? null;
};

const nextPaymentCta = ({
  hasSavedCard,
}: {
  hasSavedCard: boolean;
}): {
  action: QuickReplyAction;
  label: string;
} =>
  hasSavedCard
    ? { action: "confirm_payment", label: "Confirmar" }
    : { action: "pay_now", label: "Pagar agora" };

export const enqueueEnvelope = async (db: Db, envelope: Envelope) => {
  await seedDemoData(db);
  await ensureUser(db, envelope.userId);

  await db.insert(schema.messageQueue).values({
    id: crypto.randomUUID(),
    payloadJson: JSON.stringify(envelope),
    receivedAt: nowIso(),
    status: "pending",
    type: envelope.type,
    userId: envelope.userId,
  });
};

const createSession = async (
  db: Db,
  {
    intent,
    requirements,
    status,
    userId,
  }: {
    intent: string;
    requirements: unknown;
    status: SessionStatus;
    userId: string;
  }
) => {
  const sessionId = crypto.randomUUID();
  const ts = nowIso();

  await db.insert(schema.sessions).values({
    createdAt: ts,
    expiresAt: undefined,
    id: sessionId,
    intent,
    planJson: JSON.stringify({}),
    requirementsJson: JSON.stringify(requirements),
    status,
    updatedAt: ts,
    userId,
  });

  return sessionId;
};

const rankTopItems = async (db: Db, intent: string) => {
  const items = await db
    .select()
    .from(schema.connectionCatalogItems)
    .where(eq(schema.connectionCatalogItems.isActive, true));

  const connectionIds = [...new Set(items.map((i) => i.connectionId))];
  const connections = await db
    .select()
    .from(schema.connections)
    .where(
      connectionIds.length > 0
        ? sql`${schema.connections.id} in (${sql.join(
            connectionIds.map((id) => sql`${id}`),
            sql`,`
          )})`
        : sql`1=0`
    );

  const connectionById = new Map(connections.map((c) => [c.id, c]));

  const filtered = items.filter((i) => {
    if (intent === "service_grooming") {
      return i.kind === "service";
    }
    if (intent === "product_pet_food") {
      return i.title.toLowerCase().includes("ração");
    }
    if (intent === "product_toy") {
      return i.title.toLowerCase().includes("brinquedo");
    }
    return true;
  });

  const ranked: RankedItem[] = [];
  for (const item of filtered) {
    const connection = connectionById.get(item.connectionId);
    if (!connection) {
      continue;
    }
    ranked.push({
      connection,
      item,
      score: computeRankingScore({
        commissionBps: connection.commissionBps,
        priceCents: item.priceCents,
        slaMinutes: connection.slaMinutesDefault,
      }),
    });
  }

  return ranked.toSorted((a, b) => b.score - a.score).slice(0, 5);
};

const handleUserText = async (
  db: Db,
  envelope: Extract<Envelope, { type: "user_text" }>
) => {
  const extraction = await classifyIntentWithAi(envelope.text);
  const { intent, missing } = extraction;
  const requirements = extraction.entities ?? {};

  const sessionId =
    envelope.sessionId ??
    (await createSession(db, {
      intent,
      requirements,
      status: missing.length > 0 ? "awaiting_user" : "active",
      userId: envelope.userId,
    }));

  if (envelope.sessionId) {
    await db
      .update(schema.sessions)
      .set({
        intent,
        requirementsJson: JSON.stringify(requirements),
        status: missing.length > 0 ? "awaiting_user" : "active",
        updatedAt: nowIso(),
      })
      .where(eq(schema.sessions.id, sessionId));
  }

  await addMessage(db, {
    content: { text: envelope.text },
    role: "user",
    sessionId,
    type: "text",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: { intent, missing, requirements, text: envelope.text },
    eventType: "intent_detected",
    level: "info",
    sessionId,
  });

  if (missing.length > 0) {
    await addMessage(db, {
      content: {
        missing,
        text:
          missing.length === 1
            ? `Preciso de mais um detalhe: ${missing[0]}`
            : `Preciso de mais alguns detalhes: ${missing.join(", ")}`,
      },
      role: "assistant",
      sessionId,
      type: "text",
      userId: envelope.userId,
    });

    return { sessionId } as const;
  }

  const ranked = await rankTopItems(db, intent);
  const carousel = buildCarouselMessage(ranked);

  await addMessage(db, {
    content: carousel,
    role: "assistant",
    sessionId,
    type: "carousel",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: { count: ranked.length },
    eventType: "carousel_rendered",
    level: "info",
    sessionId,
  });

  return { sessionId } as const;
};

const handleBuy = async (
  db: Db,
  envelope: Extract<Envelope, { type: "quick_reply" }>
) => {
  if (!envelope.catalogItemId) {
    await logEvent(db, {
      data: envelope,
      eventType: "buy_missing_catalog_item",
      level: "warn",
      sessionId: envelope.sessionId,
    });
    return;
  }

  const [item] = await db
    .select()
    .from(schema.connectionCatalogItems)
    .where(eq(schema.connectionCatalogItems.id, envelope.catalogItemId))
    .limit(1);
  if (!item) {
    return;
  }

  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.id, item.connectionId))
    .limit(1);
  if (!connection) {
    return;
  }

  const orderId = crypto.randomUUID();
  const ts = nowIso();

  await db.insert(schema.orders).values({
    connectionId: connection.id,
    createdAt: ts,
    currency: item.currency,
    id: orderId,
    paymentMethodId: null,
    sessionId: envelope.sessionId,
    status: "draft",
    totalCents: item.priceCents,
    updatedAt: ts,
  });

  await db.insert(schema.orderItems).values({
    catalogItemId: item.id,
    id: crypto.randomUUID(),
    lineTotalCents: item.priceCents,
    orderId,
    qty: 1,
    unitPriceCents: item.priceCents,
  });

  const pm = await getDefaultPaymentMethod(db, envelope.userId);
  const hasSavedCard = pm !== null;
  const cta = nextPaymentCta({ hasSavedCard });

  const summary = {
    buttons: hasSavedCard
      ? [
          { action: cta.action, label: cta.label },
          { action: "swap_card" as const, label: "Trocar cartão" },
        ]
      : [{ action: cta.action, label: cta.label }],
    merchant: connection.displayName,
    orderId,
    paymentHint: hasSavedCard
      ? `Pagar com ${pm.brand} •••• ${pm.last4}?`
      : undefined,
    slaMinutes: connection.slaMinutesDefault,
    subtitle: item.subtitle,
    title: item.title,
    total: centsToBrl(item.priceCents),
    type: "purchase_summary" as const,
  };

  await addMessage(db, {
    content: summary,
    role: "assistant",
    sessionId: envelope.sessionId,
    type: "purchase_summary",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: { catalogItemId: item.id, hasSavedCard, orderId },
    eventType: "order_drafted",
    level: "info",
    sessionId: envelope.sessionId,
  });
};

const handleConfirmPayment = async (
  db: Db,
  envelope: Extract<Envelope, { type: "quick_reply" }>
) => {
  if (!envelope.orderId) {
    return;
  }

  const pm = await getDefaultPaymentMethod(db, envelope.userId);
  if (!pm) {
    return;
  }

  await db
    .update(schema.orders)
    .set({
      paymentMethodId: pm.id,
      status: "paid",
      updatedAt: nowIso(),
    })
    .where(eq(schema.orders.id, envelope.orderId));

  await addMessage(db, {
    content: {
      orderId: envelope.orderId,
      paidWith: `${pm.brand} •••• ${pm.last4}`,
      status: "paid",
      type: "receipt",
    },
    role: "assistant",
    sessionId: envelope.sessionId,
    type: "receipt",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: { orderId: envelope.orderId, paymentMethodId: pm.id },
    eventType: "payment_confirmed",
    level: "info",
    sessionId: envelope.sessionId,
  });
};

const handleCheckoutReturned = async (
  db: Db,
  envelope: Extract<Envelope, { type: "checkout_returned" }>
) => {
  const ts = nowIso();

  if (envelope.status === "paid") {
    if (
      envelope.tokenSaved &&
      envelope.brand &&
      envelope.last4 &&
      envelope.token
    ) {
      const pmId = crypto.randomUUID();

      // Unset previous defaults.
      await db
        .update(schema.paymentMethods)
        .set({ isDefault: false })
        .where(eq(schema.paymentMethods.userId, envelope.userId));

      await db.insert(schema.paymentMethods).values({
        brand: envelope.brand,
        createdAt: ts,
        id: pmId,
        isDefault: true,
        last4: envelope.last4,
        token: envelope.token,
        userId: envelope.userId,
      });
    }

    await db
      .update(schema.orders)
      .set({ status: "paid", updatedAt: ts })
      .where(eq(schema.orders.id, envelope.orderId));

    await addMessage(db, {
      content: { orderId: envelope.orderId, status: "paid", type: "receipt" },
      role: "assistant",
      sessionId: envelope.sessionId,
      type: "receipt",
      userId: envelope.userId,
    });
  } else {
    await db
      .update(schema.orders)
      .set({ status: "failed", updatedAt: ts })
      .where(eq(schema.orders.id, envelope.orderId));

    await addMessage(db, {
      content: { text: "Pagamento falhou. Quer tentar novamente?" },
      role: "assistant",
      sessionId: envelope.sessionId,
      type: "text",
      userId: envelope.userId,
    });
  }

  await logEvent(db, {
    data: envelope,
    eventType: "checkout_returned",
    level: envelope.status === "paid" ? "info" : "warn",
    sessionId: envelope.sessionId,
  });
};

const handleQuickReply = async (
  db: Db,
  envelope: Extract<Envelope, { type: "quick_reply" }>
) => {
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

  if (envelope.action === "buy") {
    await handleBuy(db, envelope);
    return;
  }

  if (envelope.action === "confirm_payment") {
    await handleConfirmPayment(db, envelope);
    return;
  }

  await logEvent(db, {
    data: envelope,
    eventType: "quick_reply_received",
    level: "info",
    sessionId: envelope.sessionId,
  });
};

export const tickOnce = async (db: Db) => {
  const [queued] = await db
    .select()
    .from(schema.messageQueue)
    .where(eq(schema.messageQueue.status, "pending"))
    .orderBy(schema.messageQueue.receivedAt)
    .limit(1);

  if (!queued) {
    return { ok: true, processed: 0 } as const;
  }

  await db
    .update(schema.messageQueue)
    .set({ status: "processing" })
    .where(eq(schema.messageQueue.id, queued.id));

  try {
    const envelope = JSON.parse(queued.payloadJson) as Envelope;

    if (envelope.type === "user_text") {
      await handleUserText(db, envelope);
    } else if (envelope.type === "quick_reply") {
      await handleQuickReply(db, envelope);
    } else if (envelope.type === "checkout_returned") {
      await handleCheckoutReturned(db, envelope);
    }

    await db
      .update(schema.messageQueue)
      .set({ status: "done" })
      .where(eq(schema.messageQueue.id, queued.id));

    return { ok: true, processed: 1 } as const;
  } catch (error) {
    await db
      .update(schema.messageQueue)
      .set({
        error: error instanceof Error ? error.message : "unknown_error",
        status: "failed",
      })
      .where(eq(schema.messageQueue.id, queued.id));

    return { ok: true, processed: 1 } as const;
  }
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
