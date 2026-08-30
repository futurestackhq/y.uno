# Yuno Commerce — Orchestration / Harness (MVP)

**Date:** 2026-08-30  
**Status:** Draft  
**Related:**

- `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-design.md`
- `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-implementation-spec.md`

---

## 0. Goal

Ship an MVP orchestration harness that is:

- **Demo-reliable**: progress happens without manual “tick spam” from the UI.
- **Durable enough**: avoids duplicate work and recovers from worker crashes.
- **Observable**: timeline shows what happened (and why) per session.
- **Minimal**: does not attempt to become Paperclip/Multica; only borrows the invariants that prevent orchestration footguns.

Non-goals: org charts, RBAC, multi-tenant governance, plugins, external agent runtimes/daemons, full cost accounting.

---

## 1. Conceptual model (what we copy from Paperclip/Multica)

The key “didactic” difference vs our current implementation is **separating three layers**:

1. **Inbound event** — user interaction (Envelope).
2. **Durable work unit** — something that must run with leasing/retry (Job).
3. **Execution attempt** — one run of a job, producing logs (Execution timeline).

This is the minimum control-plane structure that makes heartbeats, retries, and auditability natural.

---

## 2. Mapping to our MVP

### 2.1 Entities

- **Envelope** → inbound interaction (`user_text`, `quick_reply`, `checkout_returned`, …)
- **`message_queue`** → inbound event queue (store envelopes; consumed quickly)
- **`jobs`** → durable work queue (background tasks; leased; retried)
- **`execution_logs`** → immutable timeline (envelope/job/session state transitions)
- **`sessions`** → request scope (one intent/request)
- **`messages`** → chat transcript (what user sees)

### 2.2 How this differs from “AI SDK examples”

Vercel AI SDK patterns primarily cover: **model calls + tools + streaming output**.

Our MVP’s hard part is: **control plane orchestration** (durability, leasing, scheduling, retries, state transitions, auditability). That’s where Paperclip/Multica are more instructive.

---

## 3. Data model (MVP minimum)

### 3.1 `message_queue` (inbound events)

Keep as “fast ingest” only.

Add (MVP recommended):

- **`idempotency_key`**: prevents duplicates when UI retries (e.g. network double-submit).
  - Suggested shape: `clientEventId` generated in UI; or a stable hash of `{userId, sessionId?, type, payload}` with a timestamp window.

### 3.2 `jobs` (durable work)

Implement as a real runner-backed queue.

Minimal columns:

- `id` (pk)
- `session_id` (fk)
- `kind` (string enum-ish)
- `input_json` (payload)
- `status`: `queued | running | done | failed`
- **`lease_expires_at`**: lock expiry for crash recovery
- `attempts` (int)
- **`next_run_at`**: scheduling + backoff
- `created_at`, `updated_at`

Optional but helpful:

- `dedupe_key` (unique within `session_id` + `kind`): prevents enqueuing the same job twice.
- `parent_job_id` / `trace_id`: to group runs (nice for Panel 3).

### 3.3 `execution_logs` (timeline)

Standardize event types (MVP):

- `envelope_received`
- `envelope_processed`
- `job_queued`
- `job_started`
- `job_done`
- `job_failed`
- `session_status_changed`
- `checkout_*`, `payment_*`, `fulfillment_*`

Rule: log **small structured summaries**, not full payload dumps.

---

## 4. Runtimes (two loops, both tiny)

### 4.1 Dispatcher: consume envelopes, emit jobs

Purpose:

- Convert inbound envelopes into **jobs** and minimal synchronous state changes.

Rules:

- Must be **fast** and **side-effect light**.
- Should not run heavy calls (LLM, long catalog fetch, etc.).
- Must be **idempotent** by `idempotency_key`.

Output:

- create/update `sessions`
- write user `messages` (transcript)
- enqueue `jobs` for durable work
- write `execution_logs`

### 4.2 Job runner: claim job, run, persist outcome

Purpose:

- Execute durable work with leasing, retries, and timeouts.

Core invariant (copy from Paperclip):

- **Atomic claim**: only one worker can run a job at a time.
- **Lease expiry**: orphaned running jobs become runnable again after expiry.
- **Retry with backoff**: failed jobs reschedule via `next_run_at`.

---

## 5. Scheduling (“heartbeat”)

Today, if progress depends on the UI calling `tick()`, the system looks “manual”.

MVP requirement:

- Add a **heartbeat** (Cron Trigger / scheduler) that regularly runs:
  - `dispatchEnvelopes()` (or equivalent)
  - `runJobs()` (process N jobs per tick)

Keep `commerce.tick()` for demo/debug, but do not rely on it for normal progress.

---

## 6. What becomes a Job (MVP scope)

Make jobs for any work that can be:

- slow,
- retryable,
- parallelizable,
- or needs to happen later (fulfillment updates).

Suggested MVP job kinds:

- `classify_intent` (LLM call; stores intent + missing slots)
- `rank_catalog` (reads catalog + computes ranking)
- `compose_reply` (formats carousel/list/flow card)
- `charge_token` (mock payment; sets order state)
- `fulfillment_tick` (simulated status updates over time)

Keep the orchestration rule from the design doc:

- If required slots are missing → session `awaiting_user` → **do not release jobs** until satisfied.

---

## 7. Minimal failure policy (MVP)

- **Timeout**: each job has a max runtime; if exceeded, mark failed and retry (bounded).
- **Degradation**: partial failures (e.g. one connection fetch fails) do not block ranking/reply; log warn and continue.
- **Bounded retries**: e.g. `attempts <= 3`; after that → `session` becomes `failed` and a user-facing message is emitted.

---

## 8. Acceptance criteria (Definition of Done)

### 8.1 Orchestration correctness

- Duplicate envelope submits do not duplicate:
  - orders,
  - payment method creation,
  - receipt messages.

- Two workers running concurrently do not double-run the same job (atomic claim + lease).

### 8.2 Demo behavior

- The system progresses without manual UI `tick()` (heartbeat on).
- Fulfillment updates appear over time (background), visible in chat and logs.

### 8.3 Observability

- Panel 3 can show a clear timeline:
  - envelope → jobs queued → jobs started/done/failed → session transitions.

---

## 9. “MVP only” implementation order (recommended)

1. Add `idempotency_key` to `message_queue` and enforce uniqueness (or best-effort check).
2. Implement `jobs` table + minimal runner (claim/lease/backoff).
3. Refactor envelope handling so it emits jobs rather than doing heavy work inline.
4. Add heartbeat scheduler (Cron) that runs dispatcher + job runner.
5. Expand execution logs to include standardized `job_*` events.
