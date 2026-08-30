# Yuno Commerce Conversational Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the keyword-only commerce flow with a model-backed conversational host that selects or creates sessions, persists a contextual plan before delegating work, and synthesizes user-facing responses.

**Architecture:** A `host_plan` job calls `gpt-5.6-luna` through the OpenAI Responses API, using a structured output contract plus bounded read-only host tools. Its decision is validated and durably persisted as a versioned session plan. The existing queue/lease/retry runner materializes only non-stale plan nodes as specialized jobs, then schedules `host_synthesis` to turn their structured results into the next response or plan.

**Tech Stack:** TypeScript, Cloudflare Workers/D1, Drizzle ORM, tRPC, Vercel AI SDK with `@ai-sdk/openai`, Zod 4, Bun test, React 19/TanStack Query.

## Global Constraints

- Use `gpt-5.6-luna` with `reasoning.effort: "low"` through the OpenAI Responses API.
- The model owns natural-language understanding, session selection, contextual reference resolution, planning and conversational decisions; do not reintroduce keyword intent classification as a fallback.
- Persist a concise decision summary and structured plan; never persist raw chain-of-thought or reasoning summaries.
- Enforce `think → persist plan → delegate`; a subagent never writes a final user-facing message or changes session state.
- A plan may delegate only when `session.revision === plan.baseRevision`.
- Keep the existing safety boundaries: ownership, schema validation, idempotency, job leasing/retries, and explicit confirmation before irreversible payment actions.
- The chat remains asynchronous: enqueueing an envelope returns without waiting for the host.
- Preserve the existing inspector’s prompt, job, result and execution-log observability.
- Use `bun x ultracite fix` and `bun x ultracite check` on changed files before every commit.

---

## File Structure

**Configuration**

- Modify: `packages/infra/alchemy.run.ts` — add the configurable `ORCHESTRATOR_MODEL` Worker secret/binding with `gpt-5.6-luna` default.

**Persistence**

- Modify: `packages/db/src/schema.ts` — add session revision/context fields, durable host plans, and job-to-plan linkage.
- Create: `packages/db/src/migrations/0003_<generated_name>.sql` — generated D1 schema migration.
- Modify: `packages/api/src/commerce/reset.ts` — clear `host_plans` before sessions.

**Host agent**

- Create: `packages/api/src/commerce/host-contract.ts` — Zod contracts for plans, decisions, messages, plan nodes and synthesis results.
- Create: `packages/api/src/commerce/host-context.ts` — bounded query functions that assemble safe host snapshots.
- Create: `packages/api/src/commerce/host-tools.ts` — read-only AI SDK tools built from a per-turn snapshot.
- Create: `packages/api/src/commerce/host-agent.ts` — `runHostPlan()` and `runHostSynthesis()` using `openai.responses`.
- Create: `packages/api/src/commerce/host-persistence.ts` — transaction-like persistence and stale-plan checks.
- Modify: `packages/api/src/commerce/prompts.ts` — stable host planning/synthesis prompts; retain the delegation prompt builder for specialized jobs.

**Orchestration**

- Modify: `packages/api/src/commerce/types.ts` — allow `host_plan` and `host_synthesis` job kinds and typed envelope/session transitions.
- Modify: `packages/api/src/commerce/dispatcher.ts` — enqueue one `host_plan` job per accepted user turn instead of classifying text locally.
- Modify: `packages/api/src/commerce/job-runner.ts` — execute host jobs, materialize ready delegated jobs after persistence, and gate old jobs by plan revision.
- Modify: `packages/api/src/commerce/plan.ts` — support agent-defined DAG validation, stable node status updates, and terminal nodes.
- Modify: `packages/api/src/commerce/job-runner-helpers.ts` — retain catalog ranking only as a specialized job helper; remove `classifyIntentFromText`.
- Modify: `packages/api/src/commerce/orchestrator.ts` — increment a supplied session revision atomically at ingestion and expose shared host composition.
- Modify: `packages/api/src/commerce/events.ts` — add host lifecycle and stale-plan events.
- Modify: `packages/api/src/routers/commerce.ts` — expose plan metadata and host decision summaries in the inspector.

**UI**

- Modify: `apps/web/src/commerce/chat-panel.tsx` — send each text envelope with a generated idempotency key; remove assumptions that the latest transcript session always owns follow-up input.
- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx` — keep polling while host jobs or superseded queue work exist; select the session returned by the mutation when supplied.
- Modify: `apps/web/src/commerce/session-inspector-panel.tsx` and `apps/web/src/commerce/plan-accordion.tsx` — display current revision, plan status and the host decision summary.

**Tests**

- Create: `packages/api/src/commerce/host-contract.test.ts`
- Create: `packages/api/src/commerce/host-context.test.ts`
- Create: `packages/api/src/commerce/host-persistence.test.ts`
- Create: `packages/api/src/commerce/conversation-replay.test.ts`
- Modify: `packages/api/src/commerce/job-runner.test.ts`
- Modify: `packages/api/src/commerce/plan.test.ts`
- Delete: `packages/api/src/commerce/small-talk.test.ts` after the deterministic small-talk classifier is removed.

---

### Task 1: Add durable session turns and plans

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: generated `packages/db/src/migrations/0003_<generated_name>.sql`
- Modify: `packages/api/src/commerce/reset.ts`

**Interfaces:**

- Produces `schema.hostPlans` and session fields consumed by all host orchestration code.
- Produces a `jobs.planId` linkage used to reject stale work.

- [ ] **Step 1: Write the persistence contract test**

Create `packages/api/src/commerce/host-persistence.test.ts` with tests for pure persistence helpers introduced in Task 4:

```ts
it("rejects delegation from a stale plan revision", () => {
  expect(canDelegatePlan({ baseRevision: 4, sessionRevision: 5 })).toBe(false);
});

it("allows delegation from the current revision", () => {
  expect(canDelegatePlan({ baseRevision: 5, sessionRevision: 5 })).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test packages/api/src/commerce/host-persistence.test.ts
```

Expected: FAIL because `canDelegatePlan` does not exist yet.

- [ ] **Step 3: Extend the Drizzle schema**

Add the following fields to `sessions`, a durable `hostPlans` table, and plan linkage to `jobs`:

```ts
export const sessions = sqliteTable("sessions", {
  // existing fields
  contextJson: text("context_json").notNull().default("{}"),
  revision: integer("revision").notNull().default(0),
});

export const hostPlans = sqliteTable(
  "host_plans",
  {
    baseRevision: integer("base_revision").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(now),
    decisionJson: text("decision_json").notNull(),
    decisionSummary: text("decision_summary").notNull(),
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    status: text("status", {
      enum: ["persisted", "delegated", "superseded", "completed", "failed"],
    }).notNull(),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
  },
  (table) => ({
    sessionRevisionUnique: uniqueIndex("host_plans_session_revision_unique").on(
      table.sessionId,
      table.baseRevision
    ),
  })
);

export const jobs = sqliteTable("jobs", {
  // existing fields
  nodeId: text("node_id"),
  planId: text("plan_id"),
});
```

Add `hostPlans` to the exported `schema` object. In `commerceResetTableNames`, delete `host_plans` before `sessions`, and add `db.delete(schema.hostPlans)` to the reset batch.

- [ ] **Step 4: Generate the migration**

Run:

```bash
bun run db:generate
```

Expected: a new numbered migration under `packages/db/src/migrations/` that creates `host_plans` and alters `sessions` and `jobs`.

- [ ] **Step 5: Verify the schema compiles**

Run:

```bash
bun run check-types --filter=@hackathon/db
```

Expected: PASS.

- [ ] **Step 6: Format, lint, and commit**

Run:

```bash
bun x ultracite fix packages/db/src/schema.ts packages/api/src/commerce/reset.ts
bun x ultracite check packages/db/src/schema.ts packages/api/src/commerce/reset.ts
git add packages/db/src/schema.ts packages/db/src/migrations packages/api/src/commerce/reset.ts packages/api/src/commerce/host-persistence.test.ts
git commit -m "feat(db): persist versioned host plans"
```

Expected: formatter/linter pass and a commit containing the schema migration.

---

### Task 2: Define validated host contracts and prompt boundaries

**Files:**

- Create: `packages/api/src/commerce/host-contract.ts`
- Create: `packages/api/src/commerce/host-contract.test.ts`
- Modify: `packages/api/src/commerce/prompts.ts`
- Modify: `packages/api/package.json`

**Interfaces:**

- Produces `hostPlanDecisionSchema`, `hostSynthesisDecisionSchema`, `HostPlanDecision`, `HostPlanNode`, and `HostSynthesisDecision`.
- `runHostPlan()` and persistence consume the contracts without casting model output.

- [ ] **Step 1: Write failing schema tests**

Create tests that accept a valid plan decision and reject a plan with cyclic/self-referential dependencies:

```ts
it("accepts a clarification without delegations", () => {
  expect(
    hostPlanDecisionSchema.parse({
      conversation: {
        missingInformation: ["animal"],
        question: "É para cachorro ou gato?",
        state: "needs_clarification",
      },
      decisionSummary: "O produto foi entendido, mas o animal não.",
      plan: { goal: "Clarificar a necessidade", nodes: [] },
      session: { action: "continue", sessionId: "sess_1" },
      understanding: {
        confidence: 0.74,
        constraints: {},
        entities: { product: "ração" },
        intent: "purchase_product",
        references: {},
        summary: "O usuário quer comprar ração.",
      },
      userMessage: "É para cachorro ou gato?",
    })
  ).toBeTruthy();
});
```

- [ ] **Step 2: Run the contract tests**

Run:

```bash
bun test packages/api/src/commerce/host-contract.test.ts
```

Expected: FAIL because the contract module is absent.

- [ ] **Step 3: Implement the contracts**

Use `z.object` schemas with strict finite limits so model output remains bounded:

```ts
export const hostPlanNodeSchema = z.object({
  dependsOn: z.array(z.string().min(1)).max(8),
  id: z.string().min(1).max(80),
  input: z.record(z.string(), z.unknown()),
  kind: z.enum([
    "catalog_search",
    "catalog_details",
    "create_order",
    "prepare_checkout",
  ]),
  objective: z.string().min(1).max(600),
  successCriteria: z.array(z.string().min(1).max(200)).max(8),
});

export const hostPlanDecisionSchema = z.object({
  conversation: z.object({
    missingInformation: z.array(z.string().min(1).max(120)).max(8),
    question: z.string().min(1).max(500).nullable(),
    state: z.enum([
      "needs_clarification",
      "ready_to_delegate",
      "waiting_result",
    ]),
  }),
  decisionSummary: z.string().min(1).max(1000),
  plan: z.object({
    goal: z.string().min(1).max(600),
    nodes: z.array(hostPlanNodeSchema).max(8),
  }),
  session: z.object({
    action: z.enum(["continue", "create", "close"]),
    sessionId: z.string().min(1).nullable(),
  }),
  understanding: z.object({
    confidence: z.number().min(0).max(1),
    constraints: z.record(z.string(), z.unknown()),
    entities: z.record(z.string(), z.unknown()),
    intent: z.string().min(1).max(120),
    references: z.record(z.string(), z.unknown()),
    summary: z.string().min(1).max(1000),
  }),
  userMessage: z.string().min(1).max(2000).nullable(),
});
```

Add a `hostSynthesisDecisionSchema` whose `assistantMessage` is a typed `{ type: "text" | "carousel" | "purchase_summary"; content: Record<string, unknown> }`, and whose `nextAction` is `"await_user" | "delegate" | "complete"`.

- [ ] **Step 4: Add stable prompt builders**

Add `buildHostPlanningPrompt()` and `buildHostSynthesisPrompt()` to `prompts.ts`. The planning prompt must state:

```text
You are the conversational host for a commerce orchestration system.
Interpret natural language using the supplied conversation and session context.
Return only the configured structured output.
Resolve references only when grounded in the supplied context.
Choose needs_clarification when context cannot safely determine a useful action.
Never expose private reasoning; decisionSummary must be a concise user-safe operational rationale.
Do not execute commerce effects. Propose plan nodes only.
```

Keep `buildDelegationPrompt()` unchanged for specialized jobs.

- [ ] **Step 5: Upgrade only if the installed SDK lacks Responses structured output**

First confirm the currently installed AI SDK supports `generateText`, `Output.object`, `openai.responses()`, and `providerOptions.openai.reasoningEffort`. If any is absent, update the two API dependencies together:

```bash
bun add --cwd packages/api ai@latest @ai-sdk/openai@latest
```

Do not add a second OpenAI client library; the existing AI SDK integration is the Responses API client.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
bun test packages/api/src/commerce/host-contract.test.ts packages/api/src/commerce/prompts.test.ts
bun x ultracite fix packages/api/src/commerce/host-contract.ts packages/api/src/commerce/host-contract.test.ts packages/api/src/commerce/prompts.ts packages/api/package.json
bun x ultracite check packages/api/src/commerce/host-contract.ts packages/api/src/commerce/host-contract.test.ts packages/api/src/commerce/prompts.ts packages/api/package.json
git add packages/api/src/commerce/host-contract.ts packages/api/src/commerce/host-contract.test.ts packages/api/src/commerce/prompts.ts packages/api/package.json bun.lock
git commit -m "feat(api): define conversational host contracts"
```

Expected: contracts reject malformed decisions and prompts retain deterministic delegation text.

---

### Task 3: Assemble bounded context and read-only host tools

**Files:**

- Create: `packages/api/src/commerce/host-context.ts`
- Create: `packages/api/src/commerce/host-context.test.ts`
- Create: `packages/api/src/commerce/host-tools.ts`

**Interfaces:**

- Consumes `Db`, user ID, optional explicit session ID and the current envelope.
- Produces `assembleHostContext(db, input): Promise<HostContextSnapshot>`.
- Produces `createHostTools(snapshot)` containing no mutation tools.

- [ ] **Step 1: Write failing context tests**

Test that the snapshot:

```ts
it("only exposes sessions belonging to the envelope user", async () => {
  const context = await assembleHostContext(db, {
    envelope: { text: "ver detalhes", type: "user_text", userId: "user_a" },
  });

  expect(
    context.sessionCandidates.every((session) => session.userId === "user_a")
  ).toBe(true);
});
```

Also test that it includes the latest 20 messages for an explicit session, at most five session candidates, at most ten recent jobs, and strips `paymentMethods.token`.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
bun test packages/api/src/commerce/host-context.test.ts
```

Expected: FAIL because the snapshot builder does not exist.

- [ ] **Step 3: Implement safe snapshot assembly**

Define serializable snapshot types and implement bounded D1 queries:

```ts
export interface HostContextSnapshot {
  envelope: Envelope;
  explicitSession: SessionSummary | null;
  recentMessages: MessageSummary[];
  recentResults: JobResultSummary[];
  sessionCandidates: SessionSummary[];
}

export const assembleHostContext = async (
  db: Db,
  input: { envelope: Envelope }
): Promise<HostContextSnapshot> => {
  // Query only input.envelope.userId.
  // Use the explicit session when present; otherwise fetch the five most-recent
  // active/awaiting_user sessions. Fetch at most 20 messages for the selected
  // session and at most 10 completed jobs. Serialize only public catalog/order ids.
};
```

Do not retrieve raw payment tokens, arbitrary historical messages, other users’ sessions, or raw model output.

- [ ] **Step 4: Implement read-only model tools**

Use the AI SDK `tool()` function to expose snapshot-backed operations:

```ts
export const createHostTools = (snapshot: HostContextSnapshot) => ({
  get_recent_messages: tool({
    description: "Read the recent transcript for this turn's selected context.",
    inputSchema: z.object({ sessionId: z.string().optional() }),
    execute: async () => snapshot.recentMessages,
  }),
  get_session_candidates: tool({
    description: "Read sessions that belong to this user.",
    inputSchema: z.object({}),
    execute: async () => snapshot.sessionCandidates,
  }),
  search_catalog: tool({
    description: "Search the catalog snapshot by a natural-language query.",
    inputSchema: z.object({ query: z.string().min(1).max(240) }),
    execute: async ({ query }) => searchCatalogSnapshot(snapshot, query),
  }),
});
```

`searchCatalogSnapshot()` may perform a deterministic text filter over the catalog data already fetched for this turn; it must not mutate D1 or call payments.

- [ ] **Step 5: Run checks and commit**

Run:

```bash
bun test packages/api/src/commerce/host-context.test.ts
bun x ultracite fix packages/api/src/commerce/host-context.ts packages/api/src/commerce/host-context.test.ts packages/api/src/commerce/host-tools.ts
bun x ultracite check packages/api/src/commerce/host-context.ts packages/api/src/commerce/host-context.test.ts packages/api/src/commerce/host-tools.ts
git add packages/api/src/commerce/host-context.ts packages/api/src/commerce/host-context.test.ts packages/api/src/commerce/host-tools.ts
git commit -m "feat(api): provide bounded host context"
```

Expected: tests demonstrate user isolation and bounded context.

---

### Task 4: Call Luna and persist validated host decisions

**Files:**

- Create: `packages/api/src/commerce/host-agent.ts`
- Create: `packages/api/src/commerce/host-persistence.ts`
- Modify: `packages/infra/alchemy.run.ts`
- Modify: `packages/api/src/commerce/events.ts`
- Modify: `packages/api/src/commerce/plan.ts`
- Modify: `packages/api/src/commerce/host-persistence.test.ts`

**Interfaces:**

- Produces `runHostPlan(input): Promise<HostPlanDecision>` and `runHostSynthesis(input): Promise<HostSynthesisDecision>`.
- Produces `persistHostPlan(db, input): Promise<PersistedHostPlan>`.
- Produces `canDelegatePlan({ baseRevision, sessionRevision }): boolean`.

- [ ] **Step 1: Extend the failing persistence tests**

Add tests for DAG validation and planning lifecycle:

```ts
it("marks a duplicate dependency plan invalid", () => {
  expect(() =>
    validateHostPlan({
      goal: "bad plan",
      nodes: [
        {
          dependsOn: ["a"],
          id: "a",
          input: {},
          kind: "catalog_search",
          objective: "x",
          successCriteria: ["x"],
        },
      ],
    })
  ).toThrow("cannot depend on itself");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test packages/api/src/commerce/host-persistence.test.ts packages/api/src/commerce/plan.test.ts
```

Expected: FAIL because host plan validation and persistence are absent.

- [ ] **Step 3: Configure the model binding**

In `packages/infra/alchemy.run.ts`, add:

```ts
ORCHESTRATOR_MODEL: Config.string("ORCHESTRATOR_MODEL").pipe(
  Config.withDefault("gpt-5.6-luna")
),
```

Do not place an OpenAI API key or any secret in source control. Existing `OPENAI_API_KEY` remains a Worker secret/binding.

- [ ] **Step 4: Implement Responses API calls**

Use the AI SDK’s Responses model and structured output:

```ts
const result = await generateText({
  model: openai.responses(env.ORCHESTRATOR_MODEL),
  output: Output.object({ schema: hostPlanDecisionSchema }),
  prompt: buildHostPlanningPrompt(snapshot),
  providerOptions: {
    openai: {
      reasoningEffort: "low",
      reasoningSummary: null,
      textVerbosity: "low",
    },
  },
  tools: createHostTools(snapshot),
});

if (!result.output) {
  throw new Error("Host returned no structured planning decision");
}

return hostPlanDecisionSchema.parse(result.output);
```

Use the synthesis schema/prompt analogously. Configure `stopWhen` with a small step limit so read-only tool use is bounded. Do not capture `result.reasoning` or provider reasoning metadata in logs or D1.

- [ ] **Step 5: Implement persistence before delegation**

`persistHostPlan()` must:

1. validate that the host-selected `sessionId`, if non-null, belongs to the envelope user;
2. create a new session when action is `"create"` and generate its ID server-side;
3. increment the selected session revision for this accepted turn;
4. validate every node’s id, dependencies and permitted kind via `validateHostPlan()`;
5. insert one `host_plans` row at that new base revision with status `"persisted"`;
6. update session intent, requirements/context JSON, current `planJson`, status and timestamps;
7. add `host_plan_started`, `host_plan_persisted`, and `session_status_changed` events.

Expose:

```ts
export const canDelegatePlan = (params: {
  baseRevision: number;
  sessionRevision: number;
}) => params.baseRevision === params.sessionRevision;
```

Use a D1 `batch()` for the plan row, session update and related logs where references permit; if a unique revision insert conflicts, treat it as a stale turn and retry the host job rather than overwriting a newer decision.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
bun test packages/api/src/commerce/host-persistence.test.ts packages/api/src/commerce/plan.test.ts
bun run check-types --filter=@hackathon/api
bun x ultracite fix packages/infra/alchemy.run.ts packages/api/src/commerce/host-agent.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/events.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.test.ts
bun x ultracite check packages/infra/alchemy.run.ts packages/api/src/commerce/host-agent.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/events.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.test.ts
git add packages/infra/alchemy.run.ts packages/api/src/commerce/host-agent.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/events.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.test.ts
git commit -m "feat(api): persist Luna host decisions"
```

Expected: host decisions are schema-checked and a stale revision cannot delegate.

---

### Task 5: Replace deterministic classification with host-plan jobs

**Files:**

- Modify: `packages/api/src/commerce/types.ts`
- Modify: `packages/api/src/commerce/dispatcher.ts`
- Modify: `packages/api/src/commerce/job-runner.ts`
- Modify: `packages/api/src/commerce/job-runner-helpers.ts`
- Modify: `packages/api/src/commerce/orchestrator.ts`
- Modify: `packages/api/src/commerce/job-runner.test.ts`
- Delete: `packages/api/src/commerce/small-talk.ts`
- Delete: `packages/api/src/commerce/small-talk.test.ts`

**Interfaces:**

- Consumes `runHostPlan()` and `persistHostPlan()`.
- Produces `host_plan` as the first durable job for every user text envelope.
- Removes `classifyIntentFromText()` and `isSmallTalk()` from the production path.

- [ ] **Step 1: Replace classifier tests with host scheduling tests**

Replace the two `classifyIntentFromText` tests with:

```ts
it("enqueues host_plan rather than a keyword classifier for user text", async () => {
  await dispatchOnce(db);

  expect(await listQueuedJobKinds(db)).toEqual(["host_plan"]);
});
```

Add a test showing `"oi"` also creates a `host_plan`: greetings are conversational input that the host decides how to answer.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/small-talk.test.ts
```

Expected: current implementation queues `classify_intent` and uses the greeting regex.

- [ ] **Step 3: Update orchestration types**

Expand the accepted job kinds:

```ts
export const hostJobKindSchema = z.enum([
  "host_plan",
  "host_synthesis",
  "catalog_search",
  "catalog_details",
  "create_order",
  "prepare_checkout",
]);
```

Permit the session statuses `planning` and `waiting_results` in both `sessionStatusSchema` and the Drizzle session enum. Generate a migration for the schema enum change if the database representation requires it.

- [ ] **Step 4: Enqueue host planning from the dispatcher**

Replace `handleUserText()`’s small-talk branch and `classify_intent` insertion with one `host_plan` job:

```ts
const jobId = crypto.randomUUID();
await db.insert(schema.jobs).values({
  attempts: 0,
  createdAt: nowIso(),
  id: jobId,
  inputJson: JSON.stringify({ envelope, messageQueueId: meta.messageQueueId }),
  kind: "host_plan",
  nextRunAt: nowIso(),
  sessionId: resolvedOrProvisionalSessionId,
  status: "queued",
  subagentName: "conversational-host",
  updatedAt: nowIso(),
});
```

An explicit `envelope.sessionId` must be ownership-checked before the job is linked. When no session ID exists, create a minimal provisional session for queue ownership; the host may keep it or supersede it with another user-owned session, but it must not produce an orphan plan.

- [ ] **Step 5: Execute and persist `host_plan` in the runner**

Add a `runHostPlanJob()` branch that:

```ts
const snapshot = await assembleHostContext(db, { envelope });
const decision = await runHostPlan(snapshot);
const persisted = await persistHostPlan(db, {
  decision,
  envelope,
  sourceJob: job,
});
await completeJob(
  db,
  job,
  { planId: persisted.planId },
  { session: persisted.session }
);

if (persisted.decision.conversation.state === "needs_clarification") {
  await writeAssistantMessage(db, persisted.session.id, envelope.userId, {
    content: { text: persisted.decision.userMessage },
    type: "text",
  });
  return;
}

await materializeReadyPlanNodes(db, persisted.planId);
```

The runner must not send the host’s `decisionSummary` to the user; send only the returned clarification message when required.

- [ ] **Step 6: Remove deterministic classification**

Delete `classifyIntentFromText`, its test imports, and `small-talk.ts`. Retain `rankCatalogItems()` only as implementation detail for the specialized `catalog_search` job, not as a conversation interpreter.

- [ ] **Step 7: Run checks and commit**

Run:

```bash
bun test packages/api/src/commerce/job-runner.test.ts
bun run check-types --filter=@hackathon/api
bun x ultracite fix packages/api/src/commerce/types.ts packages/api/src/commerce/dispatcher.ts packages/api/src/commerce/job-runner.ts packages/api/src/commerce/job-runner-helpers.ts packages/api/src/commerce/orchestrator.ts packages/api/src/commerce/job-runner.test.ts
bun x ultracite check packages/api/src/commerce/types.ts packages/api/src/commerce/dispatcher.ts packages/api/src/commerce/job-runner.ts packages/api/src/commerce/job-runner-helpers.ts packages/api/src/commerce/orchestrator.ts packages/api/src/commerce/job-runner.test.ts
git add packages/api/src/commerce packages/db/src/schema.ts packages/db/src/migrations
git rm packages/api/src/commerce/small-talk.ts packages/api/src/commerce/small-talk.test.ts
git commit -m "feat(api): route commerce turns through host planning"
```

Expected: no production path calls a regex greeting or keyword intent classifier.

---

### Task 6: Materialize plan nodes, synthesize results, and invalidate stale work

**Files:**

- Modify: `packages/api/src/commerce/job-runner.ts`
- Modify: `packages/api/src/commerce/plan.ts`
- Modify: `packages/api/src/commerce/host-persistence.ts`
- Modify: `packages/api/src/commerce/job-runner.test.ts`
- Modify: `packages/api/src/commerce/host-persistence.test.ts`

**Interfaces:**

- Produces `materializeReadyPlanNodes(db, planId)` and `scheduleHostSynthesis(db, planId)`.
- Specialized jobs consume `job.planId` and `job.nodeId`.

- [ ] **Step 1: Write failing lifecycle tests**

Add:

```ts
it("does not materialize nodes when a newer session revision exists", async () => {
  await materializeReadyPlanNodes(db, stalePlan.id);
  expect(await jobsForPlan(db, stalePlan.id)).toHaveLength(0);
});

it("queues host_synthesis once all terminal plan nodes complete", async () => {
  await completeAllPlanNodes(db, plan.id);
  await scheduleHostSynthesis(db, plan.id);
  expect(await queuedKindsForPlan(db, plan.id)).toContain("host_synthesis");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
bun test packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/host-persistence.test.ts
```

Expected: FAIL because plan-linked job materialization and synthesis scheduling are absent.

- [ ] **Step 3: Materialize validated ready nodes**

Implement:

```ts
export const materializeReadyPlanNodes = async (db: Db, planId: string) => {
  const plan = await getHostPlan(db, planId);
  const session = await getSession(db, plan.sessionId);

  if (
    !canDelegatePlan({
      baseRevision: plan.baseRevision,
      sessionRevision: session.revision,
    })
  ) {
    await markHostPlanSuperseded(db, plan.id);
    return { materialized: 0, stale: true };
  }

  // Insert one deduplicated job for each node whose dependencies are done.
};
```

Every created job must include `planId`, `nodeId`, the plan’s base revision in `inputJson`, and a deterministic dedupe key derived from `(planId, nodeId)`. Before running any specialized job, repeat the revision check; if stale, mark it done-without-effect and log `plan_superseded`.

- [ ] **Step 4: Convert current specialized work into plan-node handlers**

Map agent-approved kinds to bounded handlers:

```text
catalog_search  → rankCatalogItems() over active catalog entries
catalog_details → retrieve one catalog item by ID
create_order    → create a draft order only
prepare_checkout → create purchase_summary and await explicit user confirmation
```

Each handler returns structured result JSON only. Move all user-message writes out of `runRankCatalog()` and `runComposeReply()`.

- [ ] **Step 5: Schedule and execute host synthesis**

When every node for a current plan is terminal, enqueue exactly one `host_synthesis` job. Its runner branch must:

```ts
const decision = await runHostSynthesis({
  plan,
  recentMessages,
  results: completedNodeResults,
  session,
});
await persistHostSynthesis(db, { decision, plan, session });
```

`persistHostSynthesis()` writes one assistant message idempotently by synthesis job ID, updates context/session status, and either completes the session, waits for the user, or persists a successor plan before calling `materializeReadyPlanNodes()`.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
bun test packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/host-persistence.test.ts
bun x ultracite fix packages/api/src/commerce/job-runner.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/host-persistence.test.ts
bun x ultracite check packages/api/src/commerce/job-runner.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/host-persistence.test.ts
git add packages/api/src/commerce/job-runner.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/job-runner.test.ts packages/api/src/commerce/host-persistence.test.ts
git commit -m "feat(api): delegate durable host plan nodes"
```

Expected: stale plans have no effects and every complete current plan reaches host synthesis once.

---

### Task 7: Preserve concurrent input and expose host decisions in the UI

**Files:**

- Modify: `packages/api/src/routers/commerce.ts`
- Modify: `apps/web/src/commerce/chat-panel.tsx`
- Modify: `apps/web/src/routes/_dashboard/commerce/index.tsx`
- Modify: `apps/web/src/commerce/session-inspector-panel.tsx`
- Modify: `apps/web/src/commerce/plan-accordion.tsx`

**Interfaces:**

- `sendEnvelope` accepts a client-generated `idempotencyKey`.
- `getSessionInspector` returns `revision`, current host plan, `decisionSummary`, and plan status.

- [ ] **Step 1: Add API tests for inspector serialization**

Add a router-level or pure mapper test ensuring the response contains:

```ts
expect(inspector.currentHostPlan).toMatchObject({
  baseRevision: 3,
  decisionSummary: expect.any(String),
  status: "persisted",
});
expect(inspector.session.revision).toBe(3);
```

- [ ] **Step 2: Update query output**

In `getSessionInspector`, fetch the most recent `host_plans` row for the session and return a parsed, bounded `currentHostPlan`:

```ts
currentHostPlan: latestPlan
  ? {
      baseRevision: latestPlan.baseRevision,
      decision: parseJsonOrRaw(latestPlan.decisionJson),
      decisionSummary: latestPlan.decisionSummary,
      id: latestPlan.id,
      status: latestPlan.status,
    }
  : null,
```

Never return model reasoning metadata or raw malformed model output.

- [ ] **Step 3: Make input messages independently idempotent**

In `ChatPanel`, generate an ID per submit:

```ts
const idempotencyKey = crypto.randomUUID();
void sendEnvelope({
  payload: { ...payload, idempotencyKey },
  type: "user_text",
});
```

Extend `SendableEnvelope` and the page’s `send()` mapping so the key reaches `sendEnvelope`. Do not disable the input because `isWorking` is true; only disable while that specific submit mutation is in flight. This permits new user input while planning or delegated work is still running.

- [ ] **Step 4: Show plan revision and decision summary**

Add a compact inspector section:

```tsx
<p className="text-muted-foreground text-xs">
  Revisão {inspector.session.revision} · {inspector.currentHostPlan?.status}
</p>
<p className="text-sm">{inspector.currentHostPlan?.decisionSummary}</p>
```

Keep the summary in the inspector only; do not render it as an assistant message. Update the plan accordion to show `"Plano substituído"` when the plan status is `"superseded"`.

- [ ] **Step 5: Verify manually**

Run the dev stack:

```bash
bun run dev
```

In the commerce dashboard:

1. Send “quero ração pro meu cachorro”.
2. Before the host finishes, send “para adulto”.
3. Confirm the second message enters the transcript immediately.
4. Confirm the first host plan becomes superseded or is ignored before delegation.
5. Confirm the inspector displays the newer revision and concise decision summary.

Expected: the chat remains writable and only the newest plan delegates.

- [ ] **Step 6: Run checks and commit**

Run:

```bash
bun run check-types --filter=web
bun x ultracite fix packages/api/src/routers/commerce.ts apps/web/src/commerce/chat-panel.tsx apps/web/src/routes/_dashboard/commerce/index.tsx apps/web/src/commerce/session-inspector-panel.tsx apps/web/src/commerce/plan-accordion.tsx
bun x ultracite check packages/api/src/routers/commerce.ts apps/web/src/commerce/chat-panel.tsx apps/web/src/routes/_dashboard/commerce/index.tsx apps/web/src/commerce/session-inspector-panel.tsx apps/web/src/commerce/plan-accordion.tsx
git add packages/api/src/routers/commerce.ts apps/web/src/commerce/chat-panel.tsx apps/web/src/routes/_dashboard/commerce/index.tsx apps/web/src/commerce/session-inspector-panel.tsx apps/web/src/commerce/plan-accordion.tsx
git commit -m "feat(web): show conversational host plans"
```

Expected: the dashboard shows current host state and accepts overlapping messages.

---

### Task 8: Add replay evaluation and full verification

**Files:**

- Create: `packages/api/src/commerce/conversation-replay.test.ts`
- Modify: `packages/api/src/commerce/job-runner.test.ts`
- Modify: `docs/superpowers/specs/2026-08-30-yuno-commerce-conversational-host-design.md`

**Interfaces:**

- Produces a model-adapter seam that allows deterministic fixture responses in tests and real Luna calls in production.
- Produces replay assertions for session selection, plan persistence, reference resolution and stale-plan safety.

- [ ] **Step 1: Add a fake host adapter**

Define:

```ts
export interface HostModel {
  plan(snapshot: HostContextSnapshot): Promise<HostPlanDecision>;
  synthesize(input: HostSynthesisInput): Promise<HostSynthesisDecision>;
}
```

Make `host-agent.ts` accept this interface through an optional dependency-injection parameter. Production supplies the Luna adapter; tests supply fixture decisions. Do not call the OpenAI API from unit tests.

- [ ] **Step 2: Write the conversation replay**

Create a fixture-driven replay that asserts this progression:

```ts
const turns = [
  "quero ração pro meu cachorro",
  "ver detalhes",
  "pode ser",
  "sim, quero ela",
];

for (const text of turns) {
  await enqueueAndDrain(db, { text, type: "user_text", userId: "user_marta" });
}

expect(recordedHostPlans.at(-1)?.decision.understanding.entities).toMatchObject(
  {
    catalogItemId: "sku_petz_racao_premium_10kg",
  }
);
expect(recordedHostPlans.at(-1)?.decision.understanding.intent).toBe(
  "purchase_product"
);
```

Add fixtures/tests for:

```text
“não, quis dizer ração para gato” → current plan becomes superseded
“agora quero marcar banho e tosa” → host may create a distinct session
two queued messages during planning → first plan does not delegate after revision changes
duplicate envelope key → exactly one host_plan job
host malformed output → one repair attempt, then bounded job retry
```

- [ ] **Step 3: Verify the test suite**

Run:

```bash
bun test packages/api/src/commerce
```

Expected: PASS with no network access.

- [ ] **Step 4: Verify typechecking and production build**

Run:

```bash
bun run check-types
bun run build
```

Expected: PASS.

- [ ] **Step 5: Update the design status and commit**

Change the spec status to `Implemented` only if all preceding verification steps pass. Otherwise retain `implementation pending` and document the failing command in the PR/hand-off.

Run:

```bash
bun x ultracite fix packages/api/src/commerce/conversation-replay.test.ts packages/api/src/commerce/job-runner.test.ts docs/superpowers/specs/2026-08-30-yuno-commerce-conversational-host-design.md
bun x ultracite check packages/api/src/commerce/conversation-replay.test.ts packages/api/src/commerce/job-runner.test.ts
git add packages/api/src/commerce/conversation-replay.test.ts packages/api/src/commerce/job-runner.test.ts docs/superpowers/specs/2026-08-30-yuno-commerce-conversational-host-design.md
git commit -m "test(api): replay conversational host flows"
```

Expected: a full, offline replay suite protects the original ração conversation and concurrency behavior.

---

## Final Acceptance Checklist

- [ ] Every user text envelope creates a host planning turn; no keyword classifier chooses an intent.
- [ ] The host runs `gpt-5.6-luna` at low reasoning effort through `openai.responses`.
- [ ] The model receives bounded conversation/session/catalog context and only read-only tools during planning.
- [ ] A host plan is schema-validated and persisted before any specialized job is created.
- [ ] Sessions retain contextual state and monotonically increasing revisions.
- [ ] New input is accepted during planning and invalidates stale plans before delegation.
- [ ] Specialized jobs return structured results only; `host_synthesis` owns final chat responses.
- [ ] Payment remains an explicit confirmation boundary.
- [ ] Inspector displays plan revision, concise host decision summary, prompts, jobs, results and lifecycle logs.
- [ ] Unit/replay tests run without model network calls, and typecheck/build pass.
