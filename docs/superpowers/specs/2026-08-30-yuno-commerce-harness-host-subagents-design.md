# Yuno Commerce — Harness (Host + Plan + Delegations + Subagents Live) — Design

**Date:** 2026-08-30  
**Status:** Draft (approved in chat; pending spec review)  
**Related:**
- `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-design.md`
- `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-implementation-spec.md`
- `docs/superpowers/specs/2026-08-30-yuno-commerce-orchestration-harness-mvp.md`

---

## 0) Goal

Upgrade the orchestration harness so a demo operator can:

- **See the host plan** per session (what it intends to do next, with dependencies).
- **See what the host delegated** (subagent/job), including the **exact prompt** passed.
- **Watch subagents working live** in a dedicated right panel.
- **Feel correct UX** in the chat: debounce, loading, and friendly behavior on “oi”.

This design is **DB-first and demo-reliable** (observability is sourced from durable state + timeline events), and aligns with the control-plane model:

**Envelope (inbound event)** → **Job (durable work)** → **Execution logs (immutable timeline)**.

### Non-goals

- Perfect real-time streaming infra (SSE/WebSocket) in MVP (can be added later).
- Full external agent runtime integration (we model “subagents” as jobs + structured events).
- Cost accounting, RBAC, multi-tenant governance, plugin systems.

---

## 1) Page layout (Option A — chosen)

Use a 3-column layout:

1. **Chat** (WhatsApp-like surface)
2. **Session Inspector (Host)** (minified, accordion-based)
3. **Subagents Live** (right-side live execution viewer)

### 1.1 Session Inspector (middle column)

**Always visible header** (non-collapsible):

- Session identity: `S#` / `intent` / `status` / `updatedAt`
- Work summary counters (computed): `jobs: X running · Y queued · Z done · W failed`

**Accordion: Delegations** (default **OPEN** on session select)

- Shows delegated work units (jobs/subagent-runs), **minified by default**.
- Ordering: `running` first, then most-recent.
- Each row (collapsed): `status · subagentName · jobKind · startedAt · duration · attempt · resultSummary`.
- Expanded details show:
  - **Delegation prompt** (exact final prompt string; copy button)
  - Input/context (session requirements, constraints)
  - Output summary + artifacts (if any)
  - Tool calls / errors / retries (if recorded)

**Accordion: Plan (DAG)** (default **CLOSED**)

- Accordion header shows summary: `nodes: N · ready: R · blocked: B · running: K · failed: F`.
- Inside renders a phase/list view (MVP) with ability to expand a node:
  - deps
  - payload
  - linked job(s) if created
  - timestamps

### 1.2 Subagents Live (right column)

Top:

- Compact list of **Running** chips + **Queued** count.
- Default selection: “most recent running”, else “most recent finished”.

Body:

- Live viewer for the selected run/job:
  - streaming-like output blocks (minified), expandable
  - tool call blocks if applicable
  - retries/errors surfaced as first-class events

---

## 2) Chat UX (debounce, loading, “oi”)

### 2.1 Friendly on “oi” (no catalog)

If inbound text is **small talk / greeting** (e.g. “oi”, “bom dia”, “e aí”), host:

- Replies **friendly** and asks what the user wants to buy/schedule.
- Does **not** create a heavy plan nor delegate catalog/ranking jobs.

This can be a cheap heuristic gate before any LLM call.

### 2.2 Loading/typing state

After the user sends an envelope:

- Disable send while the envelope is being accepted.
- Show an “orchestrating…” / typing indicator while the session has **pending work** (running/queued jobs or unprocessed envelopes).

### 2.3 Debounce (UI refresh rhythm)

The UI should not “spam refresh” nor rely on manual `tick()`.

Behavior:

- When a new envelope is sent or a session is selected, enter **Active Refresh** mode.
- While `pendingWork === true`, poll for updates on a fixed cadence (target: **400–800ms**).
- When `pendingWork === false` for a stability window, stop polling and return to idle.

`pendingWork` is derived from server state (envelopes/jobs) rather than guessing.

Recommended definition (MVP):

- `pendingWork === true` if **either**:
  - the selected session has `jobs.status in ("queued","running")`, or
  - there exists any `message_queue.status in ("pending","processing")` for that user/session scope (depending on routing model).

---

## 3) Orchestration model (align with 2026-08-30 harness MVP doc)

We standardize into two minimal loops plus a heartbeat.

### 3.0 MVP schema expectations (explicit)

To support “plan + delegation + live”, the MVP must additionally support:

- `message_queue.idempotency_key` (or equivalent) to avoid duplicate envelopes
- job scheduling fields for backoff: `jobs.next_run_at` (or encode via `lease_expires_at` + runner policy)
- persistence for delegation prompt + job outcome (see 4.2)

### 3.1 Dispatcher loop (envelopes → plan + jobs)

Input: rows from `message_queue` with `status=pending`.

Responsibilities (fast, idempotent):

- Create/update `sessions` and transcript `messages`.
- Update `sessions.requirements_json` (slot filling state).
- Create/update `sessions.plan_json` (DAG nodes, statuses).
- Enqueue `jobs` for “ready” plan nodes.
- Emit `execution_logs` events (envelope + session + plan + delegation).

Must not perform heavy operations directly (LLM, large fetches).

### 3.2 Job runner loop (claim/lease → run → persist outcome)

Input: `jobs` in `queued` state, runnable by `next_run_at` (if present).

Responsibilities:

- Atomic claim + lease (`lease_expires_at`) so only one worker runs a job.
- Run job logic (LLM calls, ranking, simulated fulfillment, etc.).
- Persist job outcome and emit `execution_logs` timeline events.
- Retry with backoff (bounded attempts) and degradation when possible.

### 3.3 Heartbeat (no manual tick)

System progresses without UI calling `tick()`:

- Heartbeat runs `dispatchEnvelopes()` + `runJobs()` periodically.
- Keep `tick()` only as debug (can run one step on demand).

---

## 4) Data & events needed to support “plan + delegation + live”

### 4.1 Plan storage (`sessions.plan_json`)

Store a minimal DAG shape:

- `version`
- `nodes[]`: `{ id, kind, deps[], status, jobId?, outputRef? }`
- `createdAt`, `updatedAt`

Node `status` (MVP):

- `pending | ready | running | done | failed | blocked`

### 4.2 Delegations (job/subagent-run) must persist prompt

Requirement: when host delegates, it passes a prompt and we can inspect it later.

Minimum design (MVP):

- Persist the **exact prompt** associated with the job (stable across attempts).
- Persist job input/output in a queryable form (summary-level, not huge dumps).
- Represent attempt-level lifecycle (start/done/fail + duration + retry reason) via `execution_logs`.

Concrete MVP choice (recommended):

- Add columns to `jobs`:
  - `prompt_text` (exact delegation prompt)
  - `result_json` (small structured result; optional)
  - `error_text` (terminal error message; optional)
  - `started_at`, `finished_at` (optional but helpful for UI without reconstructing from logs)
  - `subagent_name` (string label for UI grouping)

If we later need per-attempt prompt variants, we can introduce `job_attempts` (out of MVP scope).

### 4.3 Execution timeline (`execution_logs`)

Standardize event types needed for UI:

- `envelope_received`
- `session_created`
- `intent_detected`
- `plan_created` / `plan_updated` (replan)
- `delegation_created` (**must include** `jobId` + `promptPreview` + `jobKind` + `subagentName`)
- `job_queued`
- `job_started`
- `job_progress` (optional; for “live” feel)
- `job_done`
- `job_failed`
- `session_status_changed`

Rule: `execution_logs` stores **structured summaries**, not full payload dumps.

For “Subagents Live” (MVP), `job_progress` events may include a short `line` string payload (bounded length) keyed by `jobId`, allowing the UI to render a Terminal-like stream without introducing SSE/WebSockets.

---

## 5) Prompt contracts (host vs subagent)

### 5.1 Host (orchestrator) prompt contract

Host responsibilities:

- Keep session state consistent (state machine).
- Decide if user input is small talk vs actionable.
- If missing requirements: ask, set `awaiting_user`, and do not release jobs.
- When actionable: create/update plan DAG and delegate ready nodes.

### 5.2 Subagent prompt contract

Subagent responsibilities:

- Execute **one task** and return **structured output**.
- Do not “write nice chat text”; that’s the host’s job.
- Never invent side effects; only produce outputs the host can apply.

MVP structured output (shape, not final schema):

```json
{
  "summary": "short",
  "artifacts": [],
  "warnings": [],
  "toolCalls": [],
  "next": null
}
```

### 5.3 Delegation prompt must be deterministic

The final delegation prompt should be constructed from:

- a stable template per `job.kind`
- job input fields (objective, constraints, expected output)
- session context (requirements, guardrails)

This makes auditing, reruns, and debugging predictable.

---

## 6) UI implementation notes (AI Elements)

The project currently does **not** import AI Elements components in `apps/web/src` yet.

Design intent:

- Use AI Elements building blocks for:
  - tool call rendering (`Tool`, `ToolHeader`, `ToolInput`, `ToolOutput`)
  - streaming-like logs (`Terminal`)
  - collapsible task lists (`Task`, `TaskTrigger`, `TaskContent`, `TaskItem`)

Integration options (implementation decision later):

- Install AI Elements into `apps/web` and use directly, or
- Port selected components into `@hackathon/ui` for reuse.

MVP constraint:

- Even if AI Elements is not yet installed, the **information architecture** (minified accordions + tool/log blocks) must be implemented now; AI Elements is a rendering choice, not a data dependency.

---

## 7) Acceptance criteria

### 7.1 Observability correctness

- For any session, UI can display:
  - plan DAG summary and node statuses
  - delegation list with **exact prompt per delegated job**
  - job lifecycle events (`queued → running → done/failed`) with durations/retries
  - “Subagents Live” can reconstruct a coherent run view by filtering `execution_logs` by `jobId`

### 7.2 Demo UX

- “Oi” yields a friendly response, **not** a catalog dump.
- After sending a message, user sees loading/typing until work finishes.
- UI refreshes smoothly (debounced polling) without manual `tick()`.
- Right panel always shows what is running now (or last run), with expandable details.

---

## 8) Migration notes (current code → target)

Current state:

- `packages/api/src/commerce/orchestrator.ts` runs most work in `tickOnce()` and does not populate `sessions.plan_json`.

Target:

- Refactor into dispatcher + job runner, with standardized timeline events and job attempt records.
- Update UI to use the 3-column layout with minified accordions and a Subagents Live panel.

