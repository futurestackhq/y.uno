# Yuno Commerce Harness (Host + Plan + Delegations + Subagents Live) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a DB-first orchestration harness where each session shows the host plan and delegations (with exact prompts), and a right-side “Subagents Live” panel shows running work with debounced UI updates and chat loading/typing.

**Architecture:** Split orchestration into `dispatcher` (envelopes → sessions/plan/jobs/logs) and `job runner` (claim/lease/backoff → execute job → logs/results). UI polls on a short cadence only while `pendingWork` exists; otherwise idle.

**Tech Stack:** Cloudflare Workers (Hono + tRPC), D1/SQLite (Drizzle), React 19 + TanStack Router/Query, shadcn (`components.json`), optional AI Elements components for rendering tool/log blocks.

## Global Constraints

- Use the chosen layout: **3 columns** → Chat | **Session Inspector** (minified accordions) | **Subagents Live**.
- In Session Inspector, **Delegations accordion opens by default** on session select; Plan is collapsed with summary in header.
- “Oi”/small talk must be **friendly** and must **not** trigger catalog/ranking jobs.
- UI must **not rely on manual `tick()`** for normal progress; keep `tick()` for debug only.
- **Persist exact delegation prompts** (auditable) and job outcomes in durable storage.
- Use **Ultracite** for formatting/linting: `bun x ultracite fix` / `bun x ultracite check`.
- Keep changes isolated: implement on a feature branch from `docs/harness-host-subagents-design`.

---

## File Structure (what we will touch)

**Database (Drizzle/D1)**

- Modify: `packages/db/src/schema.ts`
- Modify/Add migration(s): `packages/db/src/migrations/*`

**API / Orchestration**

- Modify: `packages/api/src/commerce/orchestrator.ts` (becomes thin façade for debug + composition)
- Create: `packages/api/src/commerce/dispatcher.ts`
- Create: `packages/api/src/commerce/job-runner.ts`
- Create: `packages/api/src/commerce/plan.ts` (plan DAG builder + pure helpers)
- Create: `packages/api/src/commerce/prompts.ts` (host/subagent prompt builders)
- Create: `packages/api/src/commerce/small-talk.ts` (cheap greeting classifier)
- Create: `packages/api/src/commerce/process.ts` (budgeted “process work” loop)
- Modify: `packages/api/src/routers/commerce.ts` (new queries for inspector/live; stop UI-driven tick dependency)
- Modify: `packages/api/src/context.ts` (expose `executionCtx` for `waitUntil`)

**Server worker (MVP)**

- No cron required for MVP: we use request-triggered background processing via `ExecutionContext.waitUntil()` inside tRPC procedures.

**Web UI**

- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx` (layout + polling wiring)
- Modify: `apps/web/src/commerce/chat-panel.tsx` (sending/loading/typing UX)
- Create: `apps/web/src/commerce/session-inspector-panel.tsx`
- Create: `apps/web/src/commerce/subagents-live-panel.tsx`
- Create: `apps/web/src/commerce/delegations-accordion.tsx`
- Create: `apps/web/src/commerce/plan-accordion.tsx`

**Optional: AI Elements (rendering primitives)**

- Create (via CLI): `apps/web/src/components/ai-elements/*` (e.g. `terminal.tsx`, `tool.tsx`, `task.tsx`)
- Modify: `apps/web/package.json` (deps pulled by AI Elements)

**Tests**

- Create: `packages/api/src/commerce/small-talk.test.ts`
- Create: `packages/api/src/commerce/prompts.test.ts`
- Create: `packages/api/src/commerce/plan.test.ts`

> Note: DB/Worker scheduling is hard to unit test without Miniflare/D1 harness. For MVP we’ll unit-test pure logic and validate DB/scheduling via manual verification steps per task.

---

### Task 1: Extend DB schema for idempotency, delegation prompts, and job live output

**Files:**

- Modify: `packages/db/src/schema.ts`
- Add: `packages/db/src/migrations/<timestamp>_harness_host_subagents.sql` (or generated via Drizzle)

**Interfaces:**

- Produces: new columns for `message_queue`, `jobs`, `execution_logs` required by later tasks.

- [ ] **Step 1: Add `idempotency_key` to `message_queue`**

Update the table definition:

```ts
// packages/db/src/schema.ts
export const messageQueue = sqliteTable("message_queue", {
  // ...
  idempotencyKey: text("idempotency_key"),
});
```

- [ ] **Step 2: Add delegation-persistence fields to `jobs`**

```ts
// packages/db/src/schema.ts
export const jobs = sqliteTable("jobs", {
  // existing columns...
  promptText: text("prompt_text"),
  resultJson: text("result_json"),
  errorText: text("error_text"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  nextRunAt: text("next_run_at"),
  subagentName: text("subagent_name"),
});
```

- [ ] **Step 3: Add `job_id` + `line` to `execution_logs` (for Subagents Live)**

```ts
// packages/db/src/schema.ts
export const executionLogs = sqliteTable("execution_logs", {
  // ...
  jobId: text("job_id"),
  line: text("line"),
});
```

- [ ] **Step 4: Generate/apply migrations**

Generate migrations:

```bash
cd /Users/isaque/Development/futurestack
bun run db:generate
```

Apply migrations by running the infra dev stack (D1 uses `migrationsDir`):

```bash
bun run dev:server
```

Expected:

- new migration file(s) exist under `packages/db/src/migrations`
- `alchemy dev` applies them to the dev D1 database
- the server and web workers come up successfully

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/src/migrations
git commit -m "feat(db): persist job prompts and live logs"
```

---

### Task 2: Standardize execution events helpers (session + job scoped)

**Files:**

- Modify: `packages/api/src/commerce/orchestrator.ts`
- Create: `packages/api/src/commerce/events.ts`

**Interfaces:**

- Produces: `logEvent()` that can include `sessionId` and optional `jobId`, and optional `line`.

- [ ] **Step 1: Create `ExecutionEvent` type**

```ts
// packages/api/src/commerce/events.ts
export type ExecutionEventLevel = "info" | "warn" | "error";

export type ExecutionEvent = {
  sessionId: string;
  jobId?: string;
  level: ExecutionEventLevel;
  // MVP note: we keep the core planned event types strongly typed, but allow
  // commerce-specific event strings while we migrate legacy event names.
  eventType:
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
    | "session_status_changed";
  data: unknown;
  line?: string;
};
```

- [ ] **Step 1.1 (MVP reality): allow commerce-specific event strings**

Because the branch already has legacy commerce events (e.g. `"carousel_rendered"`) and we want to preserve observability during migration, implementers may widen `eventType` to:

```ts
eventType: ExecutionEvent["eventType"] | (string & {});
```

This is allowed as long as:

- planned event types remain present and used for core orchestration lifecycle
- any extra event types are documented in `dataJson` payloads or follow a naming convention

- [ ] **Step 2: Implement `logEvent(db, event)` writing `jobId` + `line`**

```ts
// packages/api/src/commerce/events.ts
import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";

const nowIso = () => new Date().toISOString();

export const logEvent = async (db: Db, event: ExecutionEvent) => {
  await db.insert(schema.executionLogs).values({
    createdAt: nowIso(),
    dataJson: JSON.stringify(event.data),
    eventType: event.eventType,
    id: crypto.randomUUID(),
    jobId: event.jobId,
    level: event.level,
    // Preserve empty string and truncate to 1000 chars.
    line: event.line?.slice(0, 1000),
    sessionId: event.sessionId,
  });
};
```

- [ ] **Step 3: Add a tiny helper for progress lines**

```ts
export const logProgressLine = async (
  db: Db,
  params: { sessionId: string; jobId: string; line: string }
) => {
  await logEvent(db, {
    data: {},
    eventType: "job_progress",
    jobId: params.jobId,
    level: "info",
    line: params.line.slice(0, 1000),
    sessionId: params.sessionId,
  });
};
```

- [ ] **Step 3.1 (Branch hygiene): ensure `packages/api/src/commerce/*` is tracked**

If `packages/api/src/routers/commerce.ts` imports `../commerce/orchestrator`, ensure the referenced modules are committed so a clean checkout builds (even if they were previously present but untracked locally). Keep this change as small as possible: do not refactor logic in this task.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/commerce/events.ts packages/api/src/commerce/orchestrator.ts
git commit -m "feat(api): add job-scoped execution event helpers"
```

---

### Task 3: Add cheap “small talk / greeting” classifier (prevents “oi → catálogo”)

**Files:**

- Create: `packages/api/src/commerce/small-talk.ts`
- Test: `packages/api/src/commerce/small-talk.test.ts`

**Interfaces:**

- Produces: `isSmallTalk(text: string): boolean`
- Consumed by: dispatcher (Task 5)

- [ ] **Step 1: Write failing test**

```ts
// packages/api/src/commerce/small-talk.test.ts
import { describe, expect, it } from "bun:test";
import { isSmallTalk } from "./small-talk";

describe("isSmallTalk", () => {
  it("detects greetings", () => {
    expect(isSmallTalk("oi")).toBe(true);
    expect(isSmallTalk("Bom dia!")).toBe(true);
    expect(isSmallTalk("e aí")).toBe(true);
  });

  it("does not mark product intent as small talk", () => {
    expect(isSmallTalk("quero ração pro meu cachorro")).toBe(false);
    expect(isSmallTalk("banho e tosa amanhã")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test packages/api/src/commerce/small-talk.test.ts
```

Expected: FAIL with “module not found” or “isSmallTalk is not a function”.

- [ ] **Step 3: Implement minimal classifier**

```ts
// packages/api/src/commerce/small-talk.ts
const GREETING_RE =
  /^(oi|ol[áa]|bom dia|boa tarde|boa noite|e[\\s-]?a[ií]|fala|opa|oii+)\\b/i;

export const isSmallTalk = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return GREETING_RE.test(trimmed);
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test packages/api/src/commerce/small-talk.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/commerce/small-talk.ts packages/api/src/commerce/small-talk.test.ts
git commit -m "feat(api): add small-talk gate for greetings"
```

---

### Task 4: Implement delegation prompt builders (host + per-job template)

**Files:**

- Create: `packages/api/src/commerce/prompts.ts`
- Test: `packages/api/src/commerce/prompts.test.ts`

**Interfaces:**

- Produces:
  - `buildHostDecisionSummaryPrompt(...)` (optional, for later)
  - `buildDelegationPrompt(params: { kind: string; input: unknown; session: { id: string; intent: string } }): string`
- Consumed by: dispatcher job enqueue (Task 5)

- [ ] **Step 1: Write failing test**

```ts
// packages/api/src/commerce/prompts.test.ts
import { describe, expect, it } from "bun:test";
import { buildDelegationPrompt } from "./prompts";

describe("buildDelegationPrompt", () => {
  it("includes stable header and expected output contract", () => {
    const prompt = buildDelegationPrompt({
      kind: "classify_intent",
      input: { text: "quero ração" },
      session: { id: "sess_1", intent: "unknown" },
    });

    expect(prompt).toContain("You are a subagent");
    expect(prompt).toContain("Return JSON");
    expect(prompt).toContain("classify_intent");
    expect(prompt).toContain("sess_1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test packages/api/src/commerce/prompts.test.ts
```

- [ ] **Step 3: Implement prompt builder**

```ts
// packages/api/src/commerce/prompts.ts
type SessionLite = { id: string; intent: string };

export const buildDelegationPrompt = (params: {
  kind: string;
  input: unknown;
  session: SessionLite;
}): string => {
  const inputJson = JSON.stringify(params.input);
  return [
    "You are a subagent in an orchestration harness.",
    "You execute exactly one task and return JSON only.",
    "",
    `Task kind: ${params.kind}`,
    `Session: ${params.session.id}`,
    "",
    "Return JSON with shape:",
    JSON.stringify(
      {
        summary: "short",
        artifacts: [],
        warnings: [],
        toolCalls: [],
        next: null,
      },
      null,
      2
    ),
    "",
    "Input JSON:",
    inputJson,
  ].join("\\n");
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test packages/api/src/commerce/prompts.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/commerce/prompts.ts packages/api/src/commerce/prompts.test.ts
git commit -m "feat(api): add deterministic delegation prompt builder"
```

---

### Task 5: Build a minimal plan DAG builder (pure)

**Files:**

- Create: `packages/api/src/commerce/plan.ts`
- Test: `packages/api/src/commerce/plan.test.ts`

**Interfaces:**

- Produces: `buildPlan(intent: string): SessionPlan`
- Consumed by: dispatcher (Task 6)

- [ ] **Step 1: Write failing test**

```ts
// packages/api/src/commerce/plan.test.ts
import { describe, expect, it } from "bun:test";
import { buildPlan } from "./plan";

describe("buildPlan", () => {
  it("creates a DAG for product intent", () => {
    const plan = buildPlan("product_pet_food");
    const kinds = plan.nodes.map((n) => n.kind);

    expect(kinds).toContain("classify_intent");
    expect(kinds).toContain("rank_catalog");
    expect(kinds).toContain("compose_reply");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test packages/api/src/commerce/plan.test.ts
```

- [ ] **Step 3: Implement plan types + builder**

```ts
// packages/api/src/commerce/plan.ts
export type PlanNodeStatus =
  "pending" | "ready" | "running" | "done" | "failed" | "blocked";

export type PlanNode = {
  id: string;
  kind: string;
  deps: string[];
  status: PlanNodeStatus;
  jobId?: string;
};

export type SessionPlan = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  nodes: PlanNode[];
};

const nowIso = () => new Date().toISOString();

export const buildPlan = (intent: string): SessionPlan => {
  const ts = nowIso();
  const nodes: PlanNode[] = [
    {
      deps: [],
      id: "classify_intent",
      kind: "classify_intent",
      status: "ready",
    },
    {
      deps: ["classify_intent"],
      id: "rank_catalog",
      kind: "rank_catalog",
      status: intent === "generic_request" ? "blocked" : "pending",
    },
    {
      deps: ["rank_catalog"],
      id: "compose_reply",
      kind: "compose_reply",
      status: "pending",
    },
  ];

  return { createdAt: ts, nodes, updatedAt: ts, version: 1 };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test packages/api/src/commerce/plan.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/commerce/plan.ts packages/api/src/commerce/plan.test.ts
git commit -m "feat(api): add minimal session plan DAG builder"
```

---

### Task 6: Refactor orchestrator into dispatcher (envelopes → plan/jobs/logs)

**Files:**

- Create: `packages/api/src/commerce/dispatcher.ts`
- Modify: `packages/api/src/commerce/orchestrator.ts`

**Interfaces:**

- Produces:
  - `dispatchOnce(db: Db): Promise<{ processed: number }>`
  - `dispatchAll(db: Db, limit: number): Promise<{ processed: number }>`
- Consumes:
  - `isSmallTalk(text)`
  - `buildPlan(intent)`
  - `buildDelegationPrompt(...)`
  - `logEvent(...)`

- [ ] **Step 1: Create `dispatchOnce` skeleton**

```ts
// packages/api/src/commerce/dispatcher.ts
import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { eq } from "drizzle-orm";
import type { Envelope } from "./types";
import { isSmallTalk } from "./small-talk";
import { buildPlan } from "./plan";
import { buildDelegationPrompt } from "./prompts";
import { logEvent } from "./events";

const nowIso = () => new Date().toISOString();

export const dispatchOnce = async (db: Db) => {
  const [queued] = await db
    .select()
    .from(schema.messageQueue)
    .where(eq(schema.messageQueue.status, "pending"))
    .orderBy(schema.messageQueue.receivedAt)
    .limit(1);

  if (!queued) return { processed: 0 } as const;

  await db
    .update(schema.messageQueue)
    .set({ status: "processing" })
    .where(eq(schema.messageQueue.id, queued.id));

  try {
    const envelope = JSON.parse(queued.payloadJson) as Envelope;
    if (envelope.type === "user_text") {
      await handleUserText(db, envelope, { messageQueueId: queued.id });
    } else if (envelope.type === "quick_reply") {
      await handleQuickReply(db, envelope, { messageQueueId: queued.id });
    } else if (envelope.type === "checkout_returned") {
      await handleCheckoutReturned(db, envelope, { messageQueueId: queued.id });
    }

    await db
      .update(schema.messageQueue)
      .set({ status: "done" })
      .where(eq(schema.messageQueue.id, queued.id));

    return { processed: 1 } as const;
  } catch (error) {
    await db
      .update(schema.messageQueue)
      .set({
        error: error instanceof Error ? error.message : "unknown_error",
        status: "failed",
      })
      .where(eq(schema.messageQueue.id, queued.id));
    return { processed: 1 } as const;
  }
};
```

- [ ] **Step 2: Implement greeting path (“oi” friendly)**

In `user_text`:

- write the user message into `messages`
- if `isSmallTalk(text)`: write a friendly assistant message and stop (no jobs)

Assistant message content example:

```ts
{ "text": "Oi! Posso te ajudar a comprar ou agendar algo. O que você precisa?" }
```

Add a concrete handler (MVP):

```ts
// packages/api/src/commerce/dispatcher.ts
import { and, desc, eq } from "drizzle-orm";
import type { Envelope } from "./types";

const addMessage = async (
  db: Db,
  params: {
    userId: string;
    sessionId?: string;
    role: "user" | "assistant" | "system";
    type: "text" | "carousel" | "purchase_summary" | "receipt";
    content: unknown;
  }
) => {
  await db.insert(schema.messages).values({
    contentJson: JSON.stringify(params.content),
    createdAt: nowIso(),
    id: crypto.randomUUID(),
    role: params.role,
    sessionId: params.sessionId,
    type: params.type,
    userId: params.userId,
  });
};

const getLatestSession = async (db: Db, userId: string) => {
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.updatedAt))
    .limit(1);
  return rows.at(0) ?? null;
};

const handleUserText = async (
  db: Db,
  envelope: Extract<Envelope, { type: "user_text" }>,
  meta: { messageQueueId: string }
) => {
  const text = envelope.text.trim();
  const session = envelope.sessionId
    ? await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, envelope.sessionId))
        .limit(1)
        .then((r) => r.at(0) ?? null)
    : await getLatestSession(db, envelope.userId);

  const sessionId = session?.id ?? crypto.randomUUID();

  await logEvent(db, {
    data: {
      envelopeType: envelope.type,
      messageQueueId: meta.messageQueueId,
      text,
    },
    eventType: "envelope_received",
    level: "info",
    sessionId,
  });

  if (!session) {
    const plan = buildPlan("generic_request");
    await db.insert(schema.sessions).values({
      createdAt: nowIso(),
      expiresAt: undefined,
      id: sessionId,
      intent: "unknown",
      planJson: JSON.stringify(plan),
      requirementsJson: JSON.stringify({}),
      status: "active",
      updatedAt: nowIso(),
      userId: envelope.userId,
    });
    await logEvent(db, {
      data: { intent: "unknown" },
      eventType: "session_created",
      level: "info",
      sessionId,
    });
    await logEvent(db, {
      data: {
        planVersion: plan.version,
        nodes: plan.nodes.map((n) => ({
          id: n.id,
          kind: n.kind,
          deps: n.deps,
        })),
      },
      eventType: "plan_created",
      level: "info",
      sessionId,
    });
  }

  await addMessage(db, {
    content: { text },
    role: "user",
    sessionId,
    type: "text",
    userId: envelope.userId,
  });

  if (isSmallTalk(text)) {
    await addMessage(db, {
      content: {
        text: "Oi! Posso te ajudar a comprar ou agendar algo. O que você precisa?",
      },
      role: "assistant",
      sessionId,
      type: "text",
      userId: envelope.userId,
    });
    return { sessionId } as const;
  }

  // Delegate the first durable unit: classify_intent.
  const jobId = crypto.randomUUID();
  const promptText = buildDelegationPrompt({
    input: { sessionId, text, userId: envelope.userId },
    kind: "classify_intent",
    session: { id: sessionId, intent: "unknown" },
  });

  await db.insert(schema.jobs).values({
    attempts: 0,
    createdAt: nowIso(),
    finishedAt: null,
    id: jobId,
    inputJson: JSON.stringify({ sessionId, text, userId: envelope.userId }),
    kind: "classify_intent",
    leaseExpiresAt: null,
    nextRunAt: nowIso(),
    promptText,
    resultJson: null,
    errorText: null,
    sessionId,
    startedAt: null,
    status: "queued",
    subagentName: "intent-classifier",
    updatedAt: nowIso(),
  });

  await logEvent(db, {
    data: {
      jobKind: "classify_intent",
      promptPreview: promptText.slice(0, 240),
    },
    eventType: "delegation_created",
    jobId,
    level: "info",
    sessionId,
  });

  await logEvent(db, {
    data: { jobKind: "classify_intent" },
    eventType: "job_queued",
    jobId,
    level: "info",
    sessionId,
  });

  return { sessionId } as const;
};

const handleQuickReply = async (
  db: Db,
  envelope: Extract<Envelope, { type: "quick_reply" }>,
  meta: { messageQueueId: string }
) => {
  await logEvent(db, {
    data: { action: envelope.action, messageQueueId: meta.messageQueueId },
    eventType: "envelope_received",
    level: "info",
    sessionId: envelope.sessionId,
  });

  await addMessage(db, {
    content: {
      quickReply: envelope.action,
      orderId: envelope.orderId,
      catalogItemId: envelope.catalogItemId,
    },
    role: "user",
    sessionId: envelope.sessionId,
    type: "text",
    userId: envelope.userId,
  });

  await logEvent(db, {
    data: {
      action: envelope.action,
      orderId: envelope.orderId,
      catalogItemId: envelope.catalogItemId,
    },
    eventType: "intent_detected",
    level: "info",
    sessionId: envelope.sessionId,
  });
};

const handleCheckoutReturned = async (
  db: Db,
  envelope: Extract<Envelope, { type: "checkout_returned" }>,
  meta: { messageQueueId: string }
) => {
  await logEvent(db, {
    data: {
      status: envelope.status,
      orderId: envelope.orderId,
      messageQueueId: meta.messageQueueId,
    },
    eventType: "envelope_received",
    level: envelope.status === "paid" ? "info" : "warn",
    sessionId: envelope.sessionId,
  });

  await logEvent(db, {
    data: { status: envelope.status, orderId: envelope.orderId },
    eventType: "session_status_changed",
    level: envelope.status === "paid" ? "info" : "warn",
    sessionId: envelope.sessionId,
  });
};
```

- [ ] **Step 3: Implement session create/update + plan_json**

On actionable `user_text`:

- create/update `sessions` with `intent="unknown"` initially (or cheap detect)
- set `sessions.plan_json` = `buildPlan("generic_request")` initially
- emit `plan_created` event

- [ ] **Step 4: Enqueue first job as delegation (classify_intent)**

Insert `jobs` row with:

- `kind="classify_intent"`
- `input_json` includes `{ text, sessionId, userId }`
- `prompt_text = buildDelegationPrompt(...)`
- `subagent_name="intent-classifier"`
- `status="queued"`, `attempts=0`

Also emit:

- `delegation_created` (with `jobId` + prompt preview)
- `job_queued`

- [ ] **Step 5: Wire `orchestrator.tickOnce` to call dispatcher + runner (for debug)**

In `packages/api/src/commerce/orchestrator.ts`, keep a debug `tickOnce` that calls:

```ts
await dispatchOnce(db);
await runJobsOnce(db, { limit: 1 });
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/commerce/dispatcher.ts packages/api/src/commerce/orchestrator.ts
git commit -m "feat(api): add dispatcher loop for envelopes to jobs"
```

---

### Task 7: Implement job runner (claim/lease/backoff) + core job kinds

**Files:**

- Create: `packages/api/src/commerce/job-runner.ts`
- Modify: `packages/api/src/commerce/orchestrator.ts`

**Interfaces:**

- Produces:
  - `runJobsOnce(db, { limit }): Promise<{ ran: number }>`
- Consumes:
  - `logEvent`, `logProgressLine`
  - DB job fields (`lease_expires_at`, `next_run_at`, `prompt_text`, etc.)

- [ ] **Step 1: Implement atomic-ish claim (SQLite)**

Claim algorithm (MVP):

- select one `queued` job with `next_run_at <= now` and (no lease OR lease expired)
- update it to `running`, set `lease_expires_at = now + 60s`, increment `attempts`, set `started_at`

Code sketch:

```ts
// packages/api/src/commerce/job-runner.ts
export const runJobsOnce = async (db: Db, params: { limit: number }) => {
  let ran = 0;
  for (let i = 0; i < params.limit; i += 1) {
    const job = await claimNextJob(db);
    if (!job) break;
    ran += 1;
    await runJob(db, job);
  }
  return { ran } as const;
};
```

- [ ] **Step 2: Implement `classify_intent` job**

For MVP, re-use existing `classifyIntentWithAi` logic but move it behind job execution.

Emit:

- `job_started` / progress lines / `job_done`

Persist:

- `jobs.result_json` with `{ intent, entities?, missing? }`

- [ ] **Step 3: On job completion, update session plan + enqueue next job(s)**

When `classify_intent` completes:

- update `sessions.intent`
- update `sessions.plan_json` node statuses
- enqueue `rank_catalog` job

When `rank_catalog` completes:

- enqueue `compose_reply` job

When `compose_reply` completes:

- write an assistant message (carousel/text)

- [ ] **Step 4: Implement bounded retry/backoff**

Retry policy:

- max attempts: 3
- backoff: 2s, 5s, 12s
- set `jobs.next_run_at`
- emit `job_failed` with retry reason and next_run_at

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/commerce/job-runner.ts packages/api/src/commerce/orchestrator.ts
git commit -m "feat(api): add job runner with lease and backoff"
```

---

### Task 8: Add “heartbeat” via `ExecutionContext.waitUntil()` (no manual UI tick)

**Files:**

- Modify: `packages/api/src/context.ts`
- Modify: `packages/api/src/routers/commerce.ts`
- Create: `packages/api/src/commerce/process.ts`

**Interfaces:**

- Produces: request-triggered background processing using `ExecutionContext.waitUntil()` (no manual UI tick).

- [ ] **Step 1: Expose `executionCtx` in API context**

Update context to pass Worker execution context through:

```ts
// packages/api/src/context.ts
export const createContext = async function createContext(
  options: CreateContextOptions
) {
  const db = createDb();
  await Promise.resolve();

  return {
    auth: null,
    db,
    session: null,
    executionCtx: options.context.executionCtx,
  };
};
```

- [ ] **Step 2: Add `processWork()` loop (budgeted)**

```ts
// packages/api/src/commerce/process.ts
import type { Db } from "@hackathon/db";
import { dispatchOnce } from "./dispatcher";
import { runJobsOnce } from "./job-runner";

export const processWork = async (
  db: Db,
  params: { maxDispatch: number; maxJobs: number }
) => {
  for (let i = 0; i < params.maxDispatch; i += 1) {
    const r = await dispatchOnce(db);
    if (r.processed === 0) break;
  }
  await runJobsOnce(db, { limit: params.maxJobs });
};
```

- [ ] **Step 3: Schedule background processing after `sendEnvelope`**

```ts
// packages/api/src/routers/commerce.ts
sendEnvelope: publicProcedure
  .input(envelopeSchema)
  .mutation(async ({ ctx, input }) => {
    await enqueueEnvelope(ctx.db, input);

    // Fire-and-forget: progress without a manual tick.
    ctx.executionCtx?.waitUntil(processWork(ctx.db, { maxDispatch: 25, maxJobs: 25 }));

    return { ok: true } as const;
  }),
```

- [ ] **Step 4: Manual verification**

In dev/prod:

- send an envelope
- do **not** call tick
- confirm sessions/messages progress and `execution_logs` fills over time

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/context.ts packages/api/src/commerce/process.ts packages/api/src/routers/commerce.ts
git commit -m "feat(api): process envelopes/jobs in background via waitUntil"
```

---

### Task 9: Expand tRPC API for Inspector + Subagents Live (no UI tick)

**Files:**

- Modify: `packages/api/src/routers/commerce.ts`

**Interfaces:**

- Produces:
  - `commerce.getSessionInspector({ sessionId })` → session + plan + job summary + delegations list
  - `commerce.getJobLogs({ jobId })` → execution logs for that job
  - `commerce.getPendingWork({ sessionId })` → boolean + counts (for debounce polling)

- [ ] **Step 1: Add inspector query**

Return shape:

```ts
type SessionInspector = {
  session: {
    id: string;
    intent: string;
    status: string;
    updatedAt: string;
    planJson: string;
  };
  jobs: Array<{
    id: string;
    kind: string;
    status: string;
    attempts: number;
    startedAt: string | null;
    finishedAt: string | null;
    subagentName: string | null;
  }>;
  jobCounts: { queued: number; running: number; done: number; failed: number };
};
```

- [ ] **Step 2: Add `getJobLogs`**

Server-side filter by the new `execution_logs.job_id` column.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/commerce.ts
git commit -m "feat(api): add inspector and job log queries"
```

---

### Task 10: UI layout + accordions + debounced polling + typing indicator

**Files:**

- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx`
- Modify: `apps/web/src/commerce/chat-panel.tsx`
- Create: `apps/web/src/commerce/session-inspector-panel.tsx`
- Create: `apps/web/src/commerce/delegations-accordion.tsx`
- Create: `apps/web/src/commerce/plan-accordion.tsx`
- Create: `apps/web/src/commerce/subagents-live-panel.tsx`

**Interfaces:**

- Consumes:
  - `trpc.commerce.getSessionInspector`
  - `trpc.commerce.getJobLogs`
  - `trpc.commerce.getPendingWork`
- Produces:
  - 3-column layout
  - accordions: Delegations open by default
  - right panel live view
  - chat typing/loading while `pendingWork`

- [ ] **Step 1: Replace the middle panel with Session Inspector**

In `index.tsx`, replace SessionsPanel+LogsPanel with:

- middle: `SessionInspectorPanel`
- right: `SubagentsLivePanel`

- [ ] **Step 2: Implement debounced polling using React Query `refetchInterval`**

Pattern:

- query `pendingWork` every 500ms **only when pending**
- use that signal to set `refetchInterval` for inspector/jobs/logs queries

- [ ] **Step 3: Chat typing indicator**

Add props to `ChatPanel`:

```ts
isWorking: boolean;
```

Render a muted assistant bubble `"…"` or `"orquestrando…"` when `isWorking`.

- [ ] **Step 4: Implement Delegations accordion**

Default-open; each job row collapsed summary + expand shows prompt/input/output.

- [ ] **Step 5: Implement Subagents Live panel**

Default selection: most recent running job else most recent finished. Render logs (job_progress lines) in a terminal-like block.

- [ ] **Step 6: Manual verification**

In `/commerce`:

- send “oi” → friendly reply, no catalog
- send product intent → see Delegations open and Subagents Live updates while running

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_dashboard/commerce/index.tsx apps/web/src/commerce
git commit -m "feat(web): add inspector and subagents live panels"
```

---

### Task 11: Install AI Elements primitives (Tool/Terminal/Task) and wire into panels

**Files:**

- Create: `apps/web/src/components/ai-elements/*` (generated)
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/commerce/subagents-live-panel.tsx`
- Modify: `apps/web/src/commerce/delegations-accordion.tsx`

**Interfaces:**

- Produces: consistent minified rendering of tool/log blocks.

- [ ] **Step 1: Install Terminal/Tool/Task components**

Run from `apps/web`:

```bash
cd apps/web
bunx --bun ai-elements@latest add terminal
bunx --bun ai-elements@latest add tool
bunx --bun ai-elements@latest add task
```

Expected:

- files created under `apps/web/src/components/ai-elements/`
- dependencies added to `apps/web/package.json`

- [ ] **Step 2: Replace ad-hoc log rendering with `<Terminal />`**

Example:

```tsx
import { Terminal } from "@/components/ai-elements/terminal";

<Terminal autoScroll isStreaming={isStreaming} output={ansiOutput} />;
```

- [ ] **Step 3: Use `<Tool />` for expanded delegation details**

When job has `prompt_text` + `result_json`:

- map to a Tool-like view (input=prompt/input, output=result/error)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ai-elements apps/web/package.json bun.lock
git commit -m "feat(web): add ai-elements primitives for harness observability"
```

---

## Plan Self-Review Checklist (run after writing, before execution)

- Spec coverage: every requirement in `docs/superpowers/specs/2026-08-30-yuno-commerce-harness-host-subagents-design.md` maps to at least one task above.
- No placeholders: no TODO/TBD; every step includes concrete code/commands.
- Type consistency: `jobId`, `prompt_text`, and event types are consistent across DB/API/UI.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-30-yuno-commerce-harness-host-subagents.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
