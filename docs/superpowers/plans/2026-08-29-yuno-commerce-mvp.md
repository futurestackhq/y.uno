# Yuno Commerce MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Yuno Commerce MVP demo: WhatsApp-like chat + orchestrator sessions/logs + mocked connections + `/checkout` “device browser” drawer + tokenized recurring payments (confirm-in-chat).

**Architecture:** Hono + tRPC on Workers/D1 for the backend (queue + sessions + jobs), TanStack Router + React Query + tRPC client on Vite web for UI, with a 3-panel `/commerce` page and a simulated `/checkout` page rendered inside a bottom sheet (drawer) as a fake device browser.

**Tech Stack:** Bun workspaces, TanStack Router, tRPC, Hono, Drizzle + D1, Base UI (via `@base-ui/react/*` wrappers in `@hackathon/ui`), Tailwind, Ultracite.

## Global Constraints

- Queue semantics for MVP: **D1 tables** (`message_queue`, `jobs`) with **on-demand `tick`** consumer.
- Payments:
  - First purchase opens `/checkout` in a “device browser” bottom drawer (indent effect).
  - User can “Salvar cartão (tokenizado)” once.
  - Next purchases: **purchase summary** message + in-chat **Confirmar** (token charge) without opening checkout.
  - Token is reusable across connections/merchants (mentor-confirmed capability) — model as a **Yuno Commerce wallet**.
- Checkout return: `/checkout` includes “Voltar para o WhatsApp” which emits `checkout_returned` to orchestrator (deep link simulation).
- WhatsApp-like UI constraints:
  - List: max 10 items
  - Buttons: max 3
  - Carousel buttons: either URL (1) OR quick replies (1+); do not mix in the same carousel.

---

## File Structure (locked in by this plan)

**Backend**
- Create: `packages/db/src/schema.ts` — Drizzle schema for sessions/queue/jobs/messages/orders/payment_methods.
- Create: `packages/api/src/routers/commerce.ts` — tRPC router implementing envelopes, tick, reads.
- Modify: `packages/api/src/routers/index.ts` — mount `commerce` router.
- Modify: `packages/api/src/context.ts` — include `db` in context.
- Modify: `packages/db/src/index.ts` — export `schema` + db creator (keep `createDb()`).

**Web**
- Create: `apps/web/src/routes/_dashboard/commerce/index.tsx` — `/commerce` 3-panel page (chat + sessions + logs).
- Create: `apps/web/src/routes/checkout.tsx` — `/checkout` page UI (mock transparent checkout).
- Create: `apps/web/src/commerce/types.ts` — shared UI types (message payloads, quick-reply actions).
- Create: `apps/web/src/commerce/device-browser-sheet.tsx` — bottom sheet “device browser” with indent effect + iframe + `postMessage` bridge.
- Create: `apps/web/src/commerce/chat-panel.tsx` — WhatsApp-like chat UI (messages + composer + carousel/list rendering).
- Create: `apps/web/src/commerce/sessions-panel.tsx` — sessions list (Panel 2).
- Create: `apps/web/src/commerce/logs-panel.tsx` — execution logs timeline (Panel 3).
- Modify: `apps/web/src/dashboard/nav.ts` — add `/commerce` and `/connections` (later) in `to` union.
- Modify: `apps/web/src/routes/_dashboard/index.tsx` — redirect to `/commerce` (instead of `/routing`) for the demo.

---

## Task 1: Fix DB package schema + migrations baseline

**Files:**
- Create: `packages/db/src/schema.ts`
- Modify: `packages/db/src/index.ts`
- Create (generated): `packages/db/src/migrations/*`

**Interfaces:**
- Produces: `schema` exports and `createDb(): ReturnType<typeof drizzle>`
- Consumed by: `packages/api/src/context.ts` (Task 2)

- [ ] **Step 1: Create the Drizzle schema file**

Create `packages/db/src/schema.ts`:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = () => new Date().toISOString();

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  type: text("type", { enum: ["product", "service"] }).notNull(),
  commissionBps: integer("commission_bps").notNull(),
  slaMinutesDefault: integer("sla_minutes_default").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const connectionCatalogItems = sqliteTable("connection_catalog_items", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull(),
  kind: text("kind", { enum: ["sku", "service"] }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull(),
  imageUrl: text("image_url"),
  attributesJson: text("attributes_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  intent: text("intent").notNull(),
  status: text("status", {
    enum: ["active", "awaiting_user", "checkout_pending", "done", "expired", "failed"],
  }).notNull(),
  requirementsJson: text("requirements_json").notNull(),
  planJson: text("plan_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
  expiresAt: text("expires_at"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  type: text("type", {
    enum: ["text", "carousel", "list", "flow_card", "receipt", "purchase_summary"],
  }).notNull(),
  contentJson: text("content_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const messageQueue = sqliteTable("message_queue", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  receivedAt: text("received_at").notNull().$defaultFn(now),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status", { enum: ["pending", "processing", "done", "failed"] }).notNull(),
  error: text("error"),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  inputJson: text("input_json").notNull(),
  status: text("status", { enum: ["queued", "running", "done", "failed"] }).notNull(),
  leaseExpiresAt: text("lease_expires_at"),
  attempts: integer("attempts").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const executionLogs = sqliteTable("execution_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  level: text("level", { enum: ["info", "warn", "error"] }).notNull(),
  eventType: text("event_type").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  connectionId: text("connection_id").notNull(),
  paymentMethodId: text("payment_method_id"),
  status: text("status", { enum: ["draft", "checkout_started", "paid", "failed", "fulfilled"] }).notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  catalogItemId: text("catalog_item_id").notNull(),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
});

export const paymentMethods = sqliteTable("payment_methods", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  brand: text("brand").notNull(),
  last4: text("last4").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});
```

- [ ] **Step 2: Update `packages/db/src/index.ts` to export schema**

Modify `packages/db/src/index.ts`:

```ts
import { env } from "@hackathon/env/server";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export { schema };

export function createDb() {
  return drizzle(env.DB, { schema });
}
```

- [ ] **Step 3: Generate migrations**

Run:

```bash
bun db:generate
```

Expected: new files under `packages/db/src/migrations/`.

- [ ] **Step 4: Smoke check typecheck**

Run:

```bash
bun check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/index.ts packages/db/src/schema.ts packages/db/src/migrations
git commit -m "feat(db): add commerce schema baseline"
```

---

## Task 2: Add DB to tRPC context and create commerce router shell

**Files:**
- Modify: `packages/api/src/context.ts`
- Create: `packages/api/src/routers/commerce.ts`
- Modify: `packages/api/src/routers/index.ts`

**Interfaces:**
- Produces: `ctx.db` in tRPC context and `commerce.*` procedures
- Consumed by: web (Tasks 5–7)

- [ ] **Step 1: Update tRPC context to include db**

Modify `packages/api/src/context.ts`:

```ts
import type { Context as HonoContext } from "hono";

import { createDb } from "@hackathon/db";

export interface CreateContextOptions {
  context: HonoContext;
}

export async function createContext(_options: CreateContextOptions) {
  const db = createDb();

  return {
    auth: null,
    db,
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 2: Create a commerce router with minimal procedures (stubs)**

Create `packages/api/src/routers/commerce.ts`:

```ts
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const commerceRouter = router({
  sendEnvelope: publicProcedure
    .input(
      z.object({
        type: z.string(),
        payload: z.unknown(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      void ctx.db;
      void input;
      return { ok: true } as const;
    }),
  tick: publicProcedure.mutation(async ({ ctx }) => {
    void ctx.db;
    return { ok: true } as const;
  }),
  getSessions: publicProcedure.query(async ({ ctx }) => {
    void ctx.db;
    return [];
  }),
  getLogs: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      void ctx.db;
      return [];
    }),
  getMessages: publicProcedure.query(async ({ ctx }) => {
    void ctx.db;
    return [];
  }),
});
```

- [ ] **Step 3: Mount the commerce router**

Modify `packages/api/src/routers/index.ts`:

```ts
import { publicProcedure, router } from "../index";
import { commerceRouter } from "./commerce";

export const appRouter = router({
  commerce: commerceRouter,
  healthCheck: publicProcedure.query(() => "OK"),
});
export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Smoke check**

Run:

```bash
bun check-types
bun check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/context.ts packages/api/src/routers/index.ts packages/api/src/routers/commerce.ts
git commit -m "feat(api): add commerce router skeleton"
```

---

## Task 3: Implement envelope persistence + tick loop (single-threaded MVP)

**Files:**
- Modify: `packages/api/src/routers/commerce.ts`
- Create: `packages/api/src/commerce/orchestrator.ts`
- Create: `packages/api/src/commerce/types.ts`
- Test: `packages/api/src/commerce/orchestrator.test.ts`

**Interfaces:**
- Produces:
  - `enqueueEnvelope(ctx, envelope): Promise<{ envelopeId: string }>`
  - `tickOnce(ctx): Promise<void>`
- Consumed by: router procedures

- [ ] **Step 1: Create orchestrator types**

Create `packages/api/src/commerce/types.ts`:

```ts
import { z } from "zod";

export const envelopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user_text"),
    payload: z.object({
      text: z.string().min(1).max(1024),
    }),
  }),
  z.object({
    type: z.literal("quick_reply"),
    payload: z.object({
      action: z.string().min(1).max(64),
      data: z.record(z.string()),
    }),
  }),
  z.object({
    type: z.literal("flow_submit"),
    payload: z.object({
      flowId: z.string().min(1).max(64),
      fields: z.record(z.string()),
    }),
  }),
  z.object({
    type: z.literal("checkout_returned"),
    payload: z.object({
      brand: z.string().optional(),
      last4: z.string().optional(),
      orderId: z.string().min(1),
      status: z.union([z.literal("paid"), z.literal("failed")]),
      tokenSaved: z.boolean().optional(),
    }),
  }),
]);

export type Envelope = z.infer<typeof envelopeSchema>;

export type SessionStatus =
  | "active"
  | "awaiting_user"
  | "checkout_pending"
  | "done"
  | "expired"
  | "failed";
```

- [ ] **Step 2: Create minimal orchestrator**

Create `packages/api/src/commerce/orchestrator.ts`:

```ts
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { schema } from "@hackathon/db";
import type { Context } from "@hackathon/api/context";

import type { Envelope } from "./types";

export function computeRankingScore(input: {
  priceCents: number;
  commissionBps: number;
  slaMinutes: number;
}): number {
  // We want lower price + lower SLA to be better; higher commission to be better.
  // Normalize each to [0,1] with simple heuristics (MVP, deterministic).
  const priceScore = 1 / Math.max(1, input.priceCents); // lower price => higher score
  const slaScore = 1 / Math.max(1, input.slaMinutes); // lower SLA => higher score
  const commissionScore = input.commissionBps / 10_000; // bps => [0,1]

  return priceScore * 0.55 + slaScore * 0.25 + commissionScore * 0.2;
}

export function nextPaymentCta(input: {
  hasSavedPaymentMethod: boolean;
}):
  | { kind: "confirm_in_chat" }
  | { kind: "pay_now_checkout" } {
  return input.hasSavedPaymentMethod
    ? { kind: "confirm_in_chat" }
    : { kind: "pay_now_checkout" };
}

export async function enqueueEnvelope(
  ctx: Context,
  envelope: Envelope
): Promise<{ envelopeId: string }> {
  const envelopeId = randomUUID();
  await ctx.db.insert(schema.messageQueue).values({
    error: null,
    id: envelopeId,
    payloadJson: JSON.stringify(envelope.payload),
    receivedAt: new Date().toISOString(),
    status: "pending",
    type: envelope.type,
    userId: "marta", // MVP: single user
  });
  return { envelopeId };
}

export async function tickOnce(ctx: Context): Promise<void> {
  // MVP: consume one envelope at a time, FIFO-ish
  const next = await ctx.db
    .select()
    .from(schema.messageQueue)
    .where(eq(schema.messageQueue.status, "pending"))
    .limit(1);

  const envelope = next[0];
  if (!envelope) return;

  await ctx.db
    .update(schema.messageQueue)
    .set({ status: "processing" })
    .where(eq(schema.messageQueue.id, envelope.id));

  // MVP: log only
  await ctx.db.insert(schema.executionLogs).values({
    createdAt: new Date().toISOString(),
    dataJson: JSON.stringify({ envelopeId: envelope.id, type: envelope.type }),
    eventType: "envelope_received",
    id: randomUUID(),
    level: "info",
    sessionId: "S0",
  });

  await ctx.db
    .update(schema.messageQueue)
    .set({ status: "done" })
    .where(eq(schema.messageQueue.id, envelope.id));
}
```

- [ ] **Step 3: Add bun tests for ranking + payment CTA decision**

Create `packages/api/src/commerce/orchestrator.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { computeRankingScore, nextPaymentCta } from "./orchestrator";

describe("orchestrator (MVP)", () => {
  it("prefers lower price when other factors equal", () => {
    const cheap = computeRankingScore({
      commissionBps: 200,
      priceCents: 10_00,
      slaMinutes: 120,
    });
    const expensive = computeRankingScore({
      commissionBps: 200,
      priceCents: 100_00,
      slaMinutes: 120,
    });

    expect(cheap).toBeGreaterThan(expensive);
  });

  it("prefers saved card confirmation when available", () => {
    expect(nextPaymentCta({ hasSavedPaymentMethod: true })).toEqual({
      kind: "confirm_in_chat",
    });
    expect(nextPaymentCta({ hasSavedPaymentMethod: false })).toEqual({
      kind: "pay_now_checkout",
    });
  });
});
```

- [ ] **Step 4: Wire router procedures to orchestrator**

Modify `packages/api/src/routers/commerce.ts` (replace stub bodies):

```ts
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { enqueueEnvelope, tickOnce } from "../commerce/orchestrator";
import { envelopeSchema } from "../commerce/types";
import { eq } from "drizzle-orm";
import { schema } from "@hackathon/db";

export const commerceRouter = router({
  sendEnvelope: publicProcedure
    .input(envelopeSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await enqueueEnvelope(ctx, input);
      await tickOnce(ctx);
      return result;
    }),
  tick: publicProcedure.mutation(async ({ ctx }) => {
    await tickOnce(ctx);
    return { ok: true } as const;
  }),
  getSessions: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(schema.sessions);
  }),
  getLogs: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.sessionId) {
        return await ctx.db
          .select()
          .from(schema.executionLogs)
          .where(eq(schema.executionLogs.sessionId, input.sessionId));
      }
      return await ctx.db.select().from(schema.executionLogs);
    }),
  getMessages: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(schema.messages);
  }),
});
```

- [ ] **Step 5: Run tests + typecheck**

Run:

```bash
bun test
bun check-types
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/commerce.ts packages/api/src/commerce/orchestrator.ts packages/api/src/commerce/types.ts packages/api/src/commerce/orchestrator.test.ts
git commit -m "feat(commerce): enqueue envelopes and tick (MVP)"
```

---

## Task 4: Seed mocked connections + catalog

**Files:**
- Create: `packages/api/src/commerce/seed.ts`
- Modify: `packages/api/src/routers/commerce.ts` (add `seed` procedure for dev only)

**Interfaces:**
- Produces: `commerce.seed()` for local demo
- Consumed by: `/commerce` route (Task 5) to ensure data exists

- [ ] **Step 1: Create a seed function**

Create `packages/api/src/commerce/seed.ts`:

```ts
import { randomUUID } from "node:crypto";

import { schema } from "@hackathon/db";
import type { Context } from "@hackathon/api/context";

export async function seedDemoData(ctx: Context): Promise<void> {
  // MVP: idempotency by slug
  const existing = await ctx.db.select().from(schema.connections);
  if (existing.length > 0) return;

  const petzId = "conn_petz";
  const raiaId = "conn_raia";
  const carrefourId = "conn_carrefour";

  await ctx.db.insert(schema.connections).values([
    {
      commissionBps: 250,
      createdAt: new Date().toISOString(),
      displayName: "Petz",
      id: petzId,
      slaMinutesDefault: 180,
      slug: "petz",
      type: "service",
    },
    {
      commissionBps: 150,
      createdAt: new Date().toISOString(),
      displayName: "Droga Raia",
      id: raiaId,
      slaMinutesDefault: 60,
      slug: "raia",
      type: "product",
    },
    {
      commissionBps: 200,
      createdAt: new Date().toISOString(),
      displayName: "Carrefour",
      id: carrefourId,
      slaMinutesDefault: 120,
      slug: "carrefour",
      type: "product",
    },
  ]);

  await ctx.db.insert(schema.connectionCatalogItems).values([
    {
      attributesJson: JSON.stringify({ brand: "Golden", sizeKg: 10, stage: "adult" }),
      connectionId: raiaId,
      createdAt: new Date().toISOString(),
      currency: "BRL",
      id: randomUUID(),
      imageUrl: null,
      isActive: true,
      kind: "sku",
      priceCents: 18990,
      subtitle: "Adulto • 10kg",
      title: "Ração Golden Special",
    },
    {
      attributesJson: JSON.stringify({ service: "banho_tosa", pickup: true }),
      connectionId: petzId,
      createdAt: new Date().toISOString(),
      currency: "BRL",
      id: randomUUID(),
      imageUrl: null,
      isActive: true,
      kind: "service",
      priceCents: 12990,
      subtitle: "Leva-e-traz",
      title: "Banho & Tosa",
    },
  ]);
}
```

- [ ] **Step 2: Add `seed` procedure**

Modify `packages/api/src/routers/commerce.ts` to include:

```ts
import { seedDemoData } from "../commerce/seed";

// inside router:
seed: publicProcedure.mutation(async ({ ctx }) => {
  await seedDemoData(ctx);
  return { ok: true } as const;
}),
```

- [ ] **Step 3: Smoke check**

Run:

```bash
bun check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/commerce/seed.ts packages/api/src/routers/commerce.ts
git commit -m "feat(commerce): seed mocked connections and catalog"
```

---

## Task 4.5: Implement MVP commerce state machine (sessions + messages + orders + payments)

**Files:**
- Modify: `packages/api/src/commerce/orchestrator.ts`
- Modify: `packages/api/src/routers/commerce.ts`

**Interfaces:**
- Produces: real behavior for these envelopes:
  - `user_text` → creates session + user message + assistant carousel
  - `quick_reply(details|buy|pay_now|confirm_payment|swap_card)` → details, purchase summary, checkout start, token charge
  - `checkout_returned` → upsert payment method (if saved) + receipt + session done
- Consumed by: web chat rendering (Task 7) + checkout bridge (Task 6)

- [ ] **Step 1: Add helpers to insert logs and messages**

In `packages/api/src/commerce/orchestrator.ts`, add:

```ts
function json(value: unknown): string {
  return JSON.stringify(value);
}

async function logEvent(ctx: Context, input: {
  sessionId: string;
  level: "info" | "warn" | "error";
  eventType: string;
  data: unknown;
}): Promise<void> {
  await ctx.db.insert(schema.executionLogs).values({
    createdAt: new Date().toISOString(),
    dataJson: json(input.data),
    eventType: input.eventType,
    id: randomUUID(),
    level: input.level,
    sessionId: input.sessionId,
  });
}

async function addMessage(ctx: Context, input: {
  userId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  type: "text" | "carousel" | "purchase_summary" | "receipt";
  content: unknown;
}): Promise<void> {
  await ctx.db.insert(schema.messages).values({
    contentJson: json(input.content),
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    role: input.role,
    sessionId: input.sessionId,
    type: input.type,
    userId: input.userId,
  });
}
```

- [ ] **Step 2: Add intent detection + recommendation builder**

Still in `orchestrator.ts`, add:

```ts
function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("banho") || t.includes("tosa")) return "pet_grooming";
  if (t.includes("ração") || t.includes("racao")) return "pet_food";
  return "unknown";
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}
```

- [ ] **Step 3: Implement `processEnvelope` and call it from `tickOnce`**

Replace the “log only” section in `tickOnce` with:

```ts
const userId = envelope.userId;
const payload = JSON.parse(envelope.payloadJson) as unknown;

await processEnvelope(ctx, {
  envelopeId: envelope.id,
  type: envelope.type,
  userId,
  payload,
});
```

Then add this function below `tickOnce`:

```ts
async function processEnvelope(
  ctx: Context,
  input: { envelopeId: string; userId: string; type: string; payload: unknown }
): Promise<void> {
  // 1) pick/create a session (MVP: single active session per user)
  const existing = await ctx.db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, input.userId))
    .limit(1);

  const sessionId = existing[0]?.id ?? randomUUID();
  if (!existing[0]) {
    await ctx.db.insert(schema.sessions).values({
      createdAt: new Date().toISOString(),
      expiresAt: null,
      id: sessionId,
      intent: "unknown",
      planJson: "{}",
      requirementsJson: "{}",
      status: "active",
      updatedAt: new Date().toISOString(),
      userId: input.userId,
    });
    await logEvent(ctx, {
      data: { envelopeId: input.envelopeId, sessionId },
      eventType: "session_created",
      level: "info",
      sessionId,
    });
  }

  await logEvent(ctx, {
    data: { envelopeId: input.envelopeId, type: input.type },
    eventType: "envelope_received",
    level: "info",
    sessionId,
  });

  // 2) handle envelope types
  if (input.type === "user_text") {
    const p = input.payload as { text?: string };
    const text = p.text ?? "";
    const intent = detectIntent(text);

    await ctx.db
      .update(schema.sessions)
      .set({ intent, updatedAt: new Date().toISOString() })
      .where(eq(schema.sessions.id, sessionId));

    await addMessage(ctx, {
      content: { text },
      role: "user",
      sessionId,
      type: "text",
      userId: input.userId,
    });

    // Recommend from catalog (seeded)
    const items = await ctx.db.select().from(schema.connectionCatalogItems);
    const conns = await ctx.db.select().from(schema.connections);
    const connById = new Map(conns.map((c) => [c.id, c]));

    const ranked = items
      .map((it) => {
        const conn = connById.get(it.connectionId);
        const score = computeRankingScore({
          commissionBps: conn?.commissionBps ?? 0,
          priceCents: it.priceCents,
          slaMinutes: conn?.slaMinutesDefault ?? 9999,
        });
        return { it, conn, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    await addMessage(ctx, {
      content: {
        body: "Achei estas opções:",
        cards: ranked.map(({ conn, it }) => ({
          connectionName: conn?.displayName ?? "Connection",
          itemId: it.id,
          price: formatBrl(it.priceCents),
          subtitle: it.subtitle,
          title: it.title,
          buttons: [
            { label: "Ver detalhes", action: "details", data: { itemId: it.id } },
            { label: "Comprar", action: "buy", data: { itemId: it.id } },
          ],
        })),
      },
      role: "assistant",
      sessionId,
      type: "carousel",
      userId: input.userId,
    });

    await logEvent(ctx, {
      data: { intent, cards: ranked.length },
      eventType: "compose_reply_options",
      level: "info",
      sessionId,
    });

    return;
  }

  if (input.type === "quick_reply") {
    const p = input.payload as { action?: string; data?: Record<string, string> };
    const action = p.action ?? "";
    const data = p.data ?? {};

    if (action === "details") {
      const itemId = data.itemId ?? "";
      const item = (
        await ctx.db
          .select()
          .from(schema.connectionCatalogItems)
          .where(eq(schema.connectionCatalogItems.id, itemId))
          .limit(1)
      )[0];

      await addMessage(ctx, {
        content: item
          ? { text: `**${item.title}**\n${item.subtitle ?? ""}\nPreço: ${formatBrl(item.priceCents)}` }
          : { text: "Não encontrei esse item." },
        role: "assistant",
        sessionId,
        type: "text",
        userId: input.userId,
      });
      return;
    }

    if (action === "buy") {
      const itemId = data.itemId ?? "";
      const item = (
        await ctx.db
          .select()
          .from(schema.connectionCatalogItems)
          .where(eq(schema.connectionCatalogItems.id, itemId))
          .limit(1)
      )[0];
      if (!item) return;

      const orderId = randomUUID();
      await ctx.db.insert(schema.orders).values({
        connectionId: item.connectionId,
        createdAt: new Date().toISOString(),
        currency: item.currency,
        id: orderId,
        paymentMethodId: null,
        sessionId,
        status: "draft",
        totalCents: item.priceCents,
        updatedAt: new Date().toISOString(),
      });
      await ctx.db.insert(schema.orderItems).values({
        catalogItemId: item.id,
        id: randomUUID(),
        lineTotalCents: item.priceCents,
        orderId,
        qty: 1,
        unitPriceCents: item.priceCents,
      });

      const saved = await ctx.db
        .select()
        .from(schema.paymentMethods)
        .where(eq(schema.paymentMethods.userId, input.userId))
        .limit(1);
      const cta = nextPaymentCta({ hasSavedPaymentMethod: Boolean(saved[0]) });

      await addMessage(ctx, {
        content: {
          orderId,
          title: item.title,
          total: formatBrl(item.priceCents),
          buttons:
            cta.kind === "confirm_in_chat"
              ? [
                  { label: "Confirmar", action: "confirm_payment", data: { orderId } },
                  { label: "Trocar cartão", action: "swap_card", data: { orderId } },
                ]
              : [{ label: "Pagar agora", action: "pay_now", data: { orderId } }],
        },
        role: "assistant",
        sessionId,
        type: "purchase_summary",
        userId: input.userId,
      });
      return;
    }

    if (action === "pay_now" || action === "swap_card") {
      const orderId = data.orderId ?? "";
      await ctx.db
        .update(schema.orders)
        .set({ status: "checkout_started", updatedAt: new Date().toISOString() })
        .where(eq(schema.orders.id, orderId));
      await ctx.db
        .update(schema.sessions)
        .set({ status: "checkout_pending", updatedAt: new Date().toISOString() })
        .where(eq(schema.sessions.id, sessionId));

      await logEvent(ctx, {
        data: { orderId },
        eventType: "checkout_opened",
        level: "info",
        sessionId,
      });
      return;
    }

    if (action === "confirm_payment") {
      const orderId = data.orderId ?? "";
      const pm = (
        await ctx.db
          .select()
          .from(schema.paymentMethods)
          .where(eq(schema.paymentMethods.userId, input.userId))
          .limit(1)
      )[0];
      if (!pm) return;

      await ctx.db
        .update(schema.orders)
        .set({
          paymentMethodId: pm.id,
          status: "paid",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.orders.id, orderId));

      await addMessage(ctx, {
        content: {
          orderId,
          status: "paid",
          text: `Pagamento aprovado. Comprovante #${orderId.slice(0, 8)}.`,
        },
        role: "assistant",
        sessionId,
        type: "receipt",
        userId: input.userId,
      });

      await ctx.db
        .update(schema.sessions)
        .set({ status: "done", updatedAt: new Date().toISOString() })
        .where(eq(schema.sessions.id, sessionId));

      await logEvent(ctx, {
        data: { orderId },
        eventType: "payment_confirmed",
        level: "info",
        sessionId,
      });
      return;
    }

    return;
  }

  if (input.type === "checkout_returned") {
    const p = input.payload as {
      orderId?: string;
      status?: "paid" | "failed";
      tokenSaved?: boolean;
      brand?: string;
      last4?: string;
    };
    const orderId = p.orderId ?? "";

    if (p.status === "paid") {
      if (p.tokenSaved && p.brand && p.last4) {
        // MVP: single default payment method
        await ctx.db
          .update(schema.paymentMethods)
          .set({ isDefault: false })
          .where(eq(schema.paymentMethods.userId, input.userId));
        await ctx.db.insert(schema.paymentMethods).values({
          brand: p.brand,
          createdAt: new Date().toISOString(),
          id: randomUUID(),
          isDefault: true,
          last4: p.last4,
          token: `tok_${randomUUID()}`,
          userId: input.userId,
        });
      }

      const pm = (
        await ctx.db
          .select()
          .from(schema.paymentMethods)
          .where(eq(schema.paymentMethods.userId, input.userId))
          .limit(1)
      )[0];

      await ctx.db
        .update(schema.orders)
        .set({
          paymentMethodId: pm?.id ?? null,
          status: "paid",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.orders.id, orderId));

      await addMessage(ctx, {
        content: {
          orderId,
          status: "paid",
          text: `Pagamento aprovado. Comprovante #${orderId.slice(0, 8)}.`,
        },
        role: "assistant",
        sessionId,
        type: "receipt",
        userId: input.userId,
      });

      await ctx.db
        .update(schema.sessions)
        .set({ status: "done", updatedAt: new Date().toISOString() })
        .where(eq(schema.sessions.id, sessionId));

      await logEvent(ctx, {
        data: { orderId },
        eventType: "checkout_returned",
        level: "info",
        sessionId,
      });

      return;
    }

    await addMessage(ctx, {
      content: { text: "Pagamento não aprovado. Quer tentar de novo?" },
      role: "assistant",
      sessionId,
      type: "text",
      userId: input.userId,
    });
  }
}
```

- [ ] **Step 4: Ensure `sendEnvelope` triggers `seed` once per dev run**

In `packages/api/src/routers/commerce.ts`, update `sendEnvelope` to call `seed` before enqueueing (MVP convenience):

```ts
import { seedDemoData } from "../commerce/seed";

// inside sendEnvelope mutation body:
await seedDemoData(ctx);
```

- [ ] **Step 5: Smoke test end-to-end**

Run:

```bash
bun dev -F @hackathon/infra
```

Then call (via UI later, or by any tRPC client):
- `commerce.sendEnvelope({ type: "user_text", payload: { text: "ração 10kg" } })`

Expected in DB:
- one session row
- messages include a `carousel` assistant message
- logs include `session_created` + `envelope_received`

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/commerce/orchestrator.ts packages/api/src/routers/commerce.ts
git commit -m "feat(commerce): process envelopes into sessions/messages/orders"
```

---

## Task 5: Add `/commerce` route (3-panel layout shell) + redirect

**Files:**
- Create: `apps/web/src/routes/_dashboard/commerce/index.tsx`
- Modify: `apps/web/src/routes/_dashboard/index.tsx`
- Modify: `apps/web/src/dashboard/nav.ts`

**Interfaces:**
- Consumes: `trpc.commerce.*` procedures
- Produces: navigable `/commerce`

- [ ] **Step 1: Update home redirect to `/commerce`**

Modify `apps/web/src/routes/_dashboard/index.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/")({
  beforeLoad: () => {
    throw redirect({ to: "/commerce" });
  },
});
```

- [ ] **Step 2: Expand nav `to` union and add Commerce item**

Modify `apps/web/src/dashboard/nav.ts`:

```ts
export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  to?: "/routing" | "/commerce";
}

export const dashboardNav: DashboardNavItem[] = [
  { icon: Monitor, label: "Home", to: "/commerce" },
  { icon: Box, label: "Connections" },
  { icon: ShoppingCart, label: "Yuno Commerce", to: "/commerce" },
  { icon: GitBranch, label: "Routing", to: "/routing" },
  // keep the rest disabled for now
];
```

- [ ] **Step 3: Create `/commerce` route page skeleton**

Create `apps/web/src/routes/_dashboard/commerce/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

const CommercePage = () => {
  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-0">
      <div className="min-h-0 border-r">Chat</div>
      <div className="min-h-0 border-r">Sessions</div>
      <div className="min-h-0">Logs</div>
    </div>
  );
};

export const Route = createFileRoute("/_dashboard/commerce/")({
  component: CommercePage,
});
```

- [ ] **Step 4: Run web typecheck**

Run:

```bash
bun check-types
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/_dashboard/index.tsx apps/web/src/dashboard/nav.ts apps/web/src/routes/_dashboard/commerce/index.tsx
git commit -m "feat(web): add /commerce route shell"
```

---

## Task 6: Implement “device browser” bottom sheet with indent effect + iframe bridge

**Files:**
- Create: `apps/web/src/commerce/device-browser-sheet.tsx`
- Create: `apps/web/src/commerce/types.ts`
- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx`
- Create: `apps/web/src/routes/checkout.tsx`

**Interfaces:**
- Produces:
  - `<DeviceBrowserSheet open url onClose onCheckoutReturned />`
  - `/checkout` emits `postMessage({ type: "checkout_returned", payload })`

- [ ] **Step 1: Create UI types**

Create `apps/web/src/commerce/types.ts`:

```ts
export type CheckoutReturnedMessage = {
  type: "checkout_returned";
  payload: {
    orderId: string;
    status: "paid" | "failed";
    tokenSaved?: boolean;
    brand?: string;
    last4?: string;
  };
};
```

- [ ] **Step 2: Create the device browser sheet**

Create `apps/web/src/commerce/device-browser-sheet.tsx`:

```tsx
import { useEffect } from "react";

import { Sheet, SheetContent } from "@hackathon/ui/components/sheet";

import type { CheckoutReturnedMessage } from "./types";

const CHECKOUT_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

export function DeviceBrowserSheet(props: {
  open: boolean;
  url: string;
  onClose: () => void;
  onCheckoutReturned: (msg: CheckoutReturnedMessage["payload"]) => void;
}) {
  const { onCheckoutReturned, open, onClose, url } = props;

  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent<unknown>) => {
      if (event.origin !== CHECKOUT_ORIGIN) return;
      const data = event.data as Partial<CheckoutReturnedMessage> | null;
      if (data?.type !== "checkout_returned" || !data.payload) return;
      onCheckoutReturned(data.payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onCheckoutReturned, open]);

  return (
    <Sheet onOpenChange={(next) => (next ? null : onClose())} open={open}>
      <SheetContent side="bottom" className="h-[85svh] p-0">
        <div className="border-b px-4 py-3 text-sm font-medium">
          Browser
        </div>
        <iframe className="h-full w-full" src={url} title="checkout" />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Create `/checkout` page that emits postMessage and shows “Voltar”**

Create `apps/web/src/routes/checkout.tsx`:

```tsx
import { Button } from "@hackathon/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const CheckoutPage = () => {
  const { orderId } = Route.useSearch();
  const [status, setStatus] = useState<"idle" | "paid">("idle");

  if (!orderId) {
    return <div className="p-6 text-sm">Missing orderId</div>;
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Checkout</h1>
      <div className="rounded border p-4 text-sm">
        <div className="font-medium">Order</div>
        <div className="text-muted-foreground">{orderId}</div>
      </div>
      {status === "idle" ? (
        <>
          <div className="rounded border p-4 text-sm">
            <div className="font-medium">Card</div>
            <div className="text-muted-foreground">
              (mock) Fill card here and optionally save token
            </div>
          </div>
          <Button
            onClick={() => {
              setStatus("paid");
            }}
          >
            Pay (mock)
          </Button>
        </>
      ) : (
        <>
          <div className="rounded border p-4 text-sm">
            <div className="font-medium">Payment approved</div>
            <div className="text-muted-foreground">R$ 89,90</div>
          </div>
          <Button
            onClick={() => {
              window.parent.postMessage(
                {
                  type: "checkout_returned",
                  payload: {
                    brand: "visa",
                    last4: "1234",
                    orderId,
                    status: "paid",
                    tokenSaved: true,
                  },
                },
                window.location.origin
              );
            }}
          >
            Voltar para o WhatsApp
          </Button>
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
});
```

- [ ] **Step 4: Wire it into `/commerce` and add indent effect**

Modify `apps/web/src/routes/_dashboard/commerce/index.tsx` to add state and background scale when open:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DeviceBrowserSheet } from "@/commerce/device-browser-sheet";

const CommercePage = () => {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("/checkout?orderId=ord_demo");

  const pageTransform = useMemo(
    () =>
      browserOpen
        ? "origin-top transition-transform duration-200 ease-out scale-[0.97] translate-y-1"
        : "origin-top transition-transform duration-200 ease-out",
    [browserOpen]
  );

  return (
    <>
      <div className={pageTransform}>
        <div className="grid h-full min-h-0 grid-cols-3 gap-0">
          <div className="min-h-0 border-r">
            <button
              className="m-4 rounded border px-3 py-2 text-sm"
              onClick={() => {
                setCheckoutUrl("/checkout?orderId=ord_demo");
                setBrowserOpen(true);
              }}
              type="button"
            >
              Open checkout drawer
            </button>
          </div>
          <div className="min-h-0 border-r">Sessions</div>
          <div className="min-h-0">Logs</div>
        </div>
      </div>
      <DeviceBrowserSheet
        onCheckoutReturned={() => {
          setBrowserOpen(false);
        }}
        onClose={() => {
          setBrowserOpen(false);
        }}
        open={browserOpen}
        url={checkoutUrl}
      />
    </>
  );
};

export const Route = createFileRoute("/_dashboard/commerce/")({
  component: CommercePage,
});
```

- [ ] **Step 5: Smoke test manually**

Run dev:

```bash
bun dev -F @hackathon/infra
```

Open web, go to `/commerce`, click “Open checkout drawer”, click “Voltar para o WhatsApp”.

Expected:
- Drawer opens, background scales slightly
- Clicking “Voltar” closes drawer

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/commerce/types.ts apps/web/src/commerce/device-browser-sheet.tsx apps/web/src/routes/checkout.tsx apps/web/src/routes/_dashboard/commerce/index.tsx
git commit -m "feat(web): add device browser checkout drawer"
```

---

## Task 7: Implement chat panel with carousel + buy flow to summary → confirm/pay-now

**Files:**
- Create: `apps/web/src/commerce/chat-panel.tsx`
- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx`

**Interfaces:**
- Consumes:
  - `trpc.commerce.sendEnvelope` (mutation)
  - `trpc.commerce.getMessages` (query)
- Produces:
  - UI events: `quick_reply(details|buy|confirm_payment|swap_card)`

- [ ] **Step 1: Create a minimal chat panel**

Create `apps/web/src/commerce/chat-panel.tsx`:

```tsx
import { Button } from "@hackathon/ui/components/button";
import { Bubble, BubbleContent, BubbleGroup } from "@hackathon/ui/components/bubble";
import {
  Message,
  MessageContent,
  MessageGroup,
} from "@hackathon/ui/components/message";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@hackathon/ui/components/message-scroller";
import { useState } from "react";

export function ChatPanel(props: {
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    type: string;
    contentJson: string;
    createdAt: string;
  }>;
  onOpenCheckout: (orderId: string) => void;
  sendEnvelope: (envelope: {
    type: "user_text" | "quick_reply" | "checkout_returned";
    payload: unknown;
  }) => Promise<void>;
}) {
  const { messages, onOpenCheckout, sendEnvelope } = props;
  const [text, setText] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">Yuno Commerce</div>
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="p-4">
              {messages.map((m) => {
                const align = m.role === "user" ? "end" : "start";
                let parsed: unknown = null;
                try {
                  parsed = JSON.parse(m.contentJson) as unknown;
                } catch {
                  parsed = { text: m.contentJson };
                }

                return (
                  <MessageScrollerItem key={m.id}>
                    <MessageGroup>
                      <Message align={align}>
                        <MessageContent>
                          <BubbleGroup>
                            <Bubble variant={m.role === "user" ? "tinted" : "muted"}>
                              <BubbleContent>
                                {m.type === "carousel" &&
                                typeof parsed === "object" &&
                                parsed &&
                                "cards" in parsed ? (
                                  <div className="min-w-[260px]">
                                    <div className="mb-2 text-xs font-medium">
                                      {"body" in parsed &&
                                      typeof (parsed as any).body === "string"
                                        ? (parsed as any).body
                                        : "Opções"}
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory]">
                                      {((parsed as any).cards as any[]).map((c) => (
                                        <div
                                          key={c.itemId}
                                          className="w-[240px] shrink-0 scroll-mx-2 rounded border bg-white/60 p-3 [scroll-snap-align:start]"
                                        >
                                          <div className="text-xs font-medium">
                                            {c.title}
                                          </div>
                                          <div className="text-muted-foreground mt-1 text-[11px]">
                                            {c.connectionName} · {c.subtitle ?? ""}
                                          </div>
                                          <div className="mt-2 text-xs font-semibold">
                                            {c.price}
                                          </div>
                                          <div className="mt-3 flex gap-2">
                                            {c.buttons.map((b: any) => (
                                              <button
                                                key={b.action}
                                                className="rounded border px-2 py-1 text-[11px]"
                                                onClick={async () => {
                                                  await sendEnvelope({
                                                    type: "quick_reply",
                                                    payload: {
                                                      action: b.action,
                                                      data: b.data,
                                                    },
                                                  });
                                                }}
                                                type="button"
                                              >
                                                {b.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : m.type === "purchase_summary" &&
                                  typeof parsed === "object" &&
                                  parsed &&
                                  "buttons" in parsed ? (
                                  <div className="min-w-[260px]">
                                    <div className="text-xs font-medium">
                                      {(parsed as any).title}
                                    </div>
                                    <div className="text-muted-foreground mt-1 text-[11px]">
                                      Total: {(parsed as any).total}
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                      {((parsed as any).buttons as any[]).map((b) => (
                                        <button
                                          key={b.action}
                                          className="rounded border px-2 py-1 text-[11px]"
                                          onClick={async () => {
                                            await sendEnvelope({
                                              type: "quick_reply",
                                              payload: {
                                                action: b.action,
                                                data: b.data,
                                              },
                                            });
                                            if (
                                              b.action === "pay_now" ||
                                              b.action === "swap_card"
                                            ) {
                                              onOpenCheckout(b.data.orderId as string);
                                            }
                                          }}
                                          type="button"
                                        >
                                          {b.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {"text" in (parsed as any)
                                      ? (parsed as any).text
                                      : JSON.stringify(parsed)}
                                  </div>
                                )}
                              </BubbleContent>
                            </Bubble>
                          </BubbleGroup>
                        </MessageContent>
                      </Message>
                    </MessageGroup>
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="border-t p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendEnvelope({ type: "user_text", payload: { text } });
            setText("");
          }}
        >
          <input
            className="flex-1 rounded border px-3 py-2 text-sm"
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            value={text}
          />
          <Button type="submit">Enviar</Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire chat panel into commerce page and reuse DeviceBrowserSheet**

Modify `apps/web/src/routes/_dashboard/commerce/index.tsx`:
- replace the left column with `<ChatPanel ... />`
- load messages via `trpc.commerce.getMessages`
- implement `sendEnvelope` via `trpc.commerce.sendEnvelope`
- implement `onOpenCheckout(orderId)` to open the device browser drawer to `/checkout?orderId=...`

Suggested wiring inside `CommercePage`:

```tsx
import { useMutation, useQuery } from "@tanstack/react-query";

const { queryClient, trpc } = Route.useRouteContext();
const messagesQuery = useQuery(trpc.commerce.getMessages.queryOptions());
const sendEnvelope = useMutation(trpc.commerce.sendEnvelope.mutationOptions());

async function send(envelope: { type: string; payload: unknown }) {
  await sendEnvelope.mutateAsync(envelope);
  await queryClient.invalidateQueries({
    queryKey: trpc.commerce.getMessages.queryKey(),
  });
  await queryClient.invalidateQueries({
    queryKey: trpc.commerce.getSessions.queryKey(),
  });
  await queryClient.invalidateQueries({
    queryKey: trpc.commerce.getLogs.queryKey(),
  });
}
```

- [ ] **Step 3: Manual verification**

Run dev and confirm:
- sending “ração 10kg” results in an assistant **carousel**
- clicking “Comprar” on a card creates a **purchase summary** message
- clicking “Pagar agora” opens `/checkout` in the drawer
- clicking “Voltar para o WhatsApp” closes the drawer and posts a **receipt** message

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/commerce/chat-panel.tsx apps/web/src/routes/_dashboard/commerce/index.tsx
git commit -m "feat(web): render chat with carousel and purchase flow"
```

---

## Task 8: Implement sessions + logs panels and connect to tRPC reads

**Files:**
- Create: `apps/web/src/commerce/sessions-panel.tsx`
- Create: `apps/web/src/commerce/logs-panel.tsx`
- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx`

**Interfaces:**
- Consumes:
  - `trpc.commerce.getSessions` query
  - `trpc.commerce.getLogs` query

- [ ] **Step 1: Create sessions panel**

Create `apps/web/src/commerce/sessions-panel.tsx`:

```tsx
export type SessionRow = {
  id: string;
  intent: string;
  status: string;
  updatedAt: string;
};

export function SessionsPanel(props: {
  sessions: SessionRow[];
  selectedSessionId: string | null;
  onSelectSessionId: (id: string) => void;
}) {
  const { onSelectSessionId, selectedSessionId, sessions } = props;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">Sessions</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <ul className="flex flex-col gap-1">
          {sessions.map((s) => {
            const active = selectedSessionId === s.id;
            return (
              <li key={s.id}>
                <button
                  className={
                    active
                      ? "w-full rounded border bg-[rgb(62_79_224_/_8%)] px-3 py-2 text-left text-xs"
                      : "w-full rounded border px-3 py-2 text-left text-xs"
                  }
                  onClick={() => onSelectSessionId(s.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.intent}</span>
                    <span className="text-muted-foreground">{s.status}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">
                    {s.id} · {s.updatedAt}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create logs panel**

Create `apps/web/src/commerce/logs-panel.tsx`:

```tsx
export type ExecutionLogRow = {
  id: string;
  sessionId: string;
  level: "info" | "warn" | "error";
  eventType: string;
  dataJson: string;
  createdAt: string;
};

export function LogsPanel(props: {
  logs: ExecutionLogRow[];
}) {
  const { logs } = props;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">Executions</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <ul className="flex flex-col gap-1">
          {logs.map((l) => (
            <li key={l.id} className="rounded border px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{l.eventType}</span>
                <span className="text-muted-foreground">{l.level}</span>
              </div>
              <div className="text-muted-foreground mt-1 text-[11px]">
                {l.createdAt} · {l.sessionId}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire panels into `/commerce`**

Modify `apps/web/src/routes/_dashboard/commerce/index.tsx` middle/right columns to use these components and load data via tRPC:

```tsx
import { useQuery } from "@tanstack/react-query";
import { SessionsPanel } from "@/commerce/sessions-panel";
import { LogsPanel } from "@/commerce/logs-panel";

// inside CommercePage:
const { trpc } = Route.useRouteContext();
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

const sessionsQuery = useQuery(trpc.commerce.getSessions.queryOptions());
const logsQuery = useQuery(
  trpc.commerce.getLogs.queryOptions(
    selectedSessionId ? { sessionId: selectedSessionId } : undefined
  )
);

// in JSX:
<SessionsPanel
  onSelectSessionId={(id) => setSelectedSessionId(id)}
  selectedSessionId={selectedSessionId}
  sessions={sessionsQuery.data ?? []}
/>
<LogsPanel logs={logsQuery.data ?? []} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/commerce/sessions-panel.tsx apps/web/src/commerce/logs-panel.tsx apps/web/src/routes/_dashboard/commerce/index.tsx
git commit -m "feat(web): render sessions and execution logs panels"
```

---

## Plan Self-Review (against spec)

- Payments: summary-before-pay + `/checkout` drawer + deep-link return + confirm-in-chat are covered (Tasks 4.5, 6, 7).
- Token wallet: modeled via `payment_methods` (Task 1) and created/updated on `checkout_returned` (Task 4.5).
- Queue/tick: MVP single-threaded tick loop + envelope processing are in Task 3 + Task 4.5.
- UI: `/commerce` 3 panels + interactive messages are covered (Tasks 5–8).

