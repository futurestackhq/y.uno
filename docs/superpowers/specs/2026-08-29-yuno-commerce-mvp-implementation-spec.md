# Yuno Commerce — MVP Implementation Spec (Hackathon)

**Date:** 2026-08-29  
**Status:** Draft  
**Design:** `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-design.md`  
**Decisions log:** `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-decisions.md`

---

## 0. Scope

This spec defines the **minimum implementable** backend + data + event contracts for:
- WhatsApp-like chat UI (web-only)
- Orchestrator sessionization + planning + job execution
- Observability (sessions + logs panels)
- Mocked partner connections (catalog/service)
- Payments:
  - first purchase via `/checkout` (drawer “device browser”)
  - recurring purchases via in-chat confirmation using a saved token
  - **token reuse across merchants/connections** (confirmed Yuno capability; simulated)

Non-goals remain as stated in the design doc (no real WhatsApp BSP; no real Meta Flows publishing; mocked providers).

---

## 1. Key concepts

### 1.1 Session
One **session** represents one user request/intent (e.g. “ração pro meu cachorro”).

### 1.2 Envelope
An **envelope** is any inbound user interaction that the orchestrator consumes:
- text message
- quick reply click (button)
- flow submit
- checkout return (“Voltar para o WhatsApp”)

### 1.3 Connection
A **connection** is a mocked merchant/provider (Petz, Raia, Carrefour), with:
- catalog/service data
- SLA metadata
- commission metadata
- optional fulfillment simulator

### 1.4 Payment method (token)
A saved payment method is represented as a **token** + UX metadata (brand/last4).
For MVP, it is modeled as a **Yuno Commerce wallet** reusable across connections.

---

## 2. Data model (D1 / Drizzle)

> Naming is indicative; implement with Drizzle tables in `packages/db`.

### 2.1 `users`
- `id` (pk)
- `display_name` (e.g. “Marta”)
- `created_at`

### 2.2 `connections`
- `id` (pk)
- `slug` (e.g. `petz`)
- `display_name` (e.g. “Petz”)
- `type` (`product` | `service`)
- `commission_bps` (integer; used in ranking)
- `sla_minutes_default` (integer)
- `created_at`

### 2.3 `connection_catalog_items`
For products and services (unified).
- `id` (pk)
- `connection_id` (fk)
- `kind` (`sku` | `service`)
- `title`
- `subtitle` (optional)
- `price_cents`
- `currency` (e.g. `BRL`)
- `image_url` (optional; placeholder ok)
- `attributes_json` (variant/size/category)
- `is_active`
- `created_at`

### 2.4 `sessions`
- `id` (pk)
- `user_id` (fk)
- `intent` (string; e.g. `pet_food`, `pet_grooming`)
- `status` (`active` | `awaiting_user` | `checkout_pending` | `done` | `expired` | `failed`)
- `requirements_json` (slot filling state)
- `plan_json` (DAG tasks + dependencies)
- `created_at`
- `updated_at`
- `expires_at` (computed per status)

TTL defaults:
- `awaiting_user`: +30 minutes
- `checkout_pending`: +15 minutes
- `active`: soft idle warn +10 minutes; hard expire +2 hours

### 2.5 `messages`
Chat transcript (Panel 1), normalized.
- `id` (pk)
- `user_id` (fk)
- `session_id` (fk, nullable for pre-session system messages)
- `role` (`user` | `assistant` | `system`)
- `type` (`text` | `carousel` | `list` | `flow_card` | `receipt` | `purchase_summary`)
- `content_json` (render payload)
- `created_at`

### 2.6 `message_queue`
Inbound envelopes to be consumed by the orchestrator.
- `id` (pk)
- `user_id`
- `received_at`
- `type` (see section 3)
- `payload_json`
- `status` (`pending` | `processing` | `done` | `failed`)
- `error` (nullable)

### 2.7 `jobs`
Background work units created by the orchestrator (subagent tasks, fulfillment updates).
- `id` (pk)
- `session_id`
- `kind` (e.g. `fetch_catalog`, `rank`, `compose_reply`, `fulfillment_tick`, `charge_token`)
- `input_json`
- `status` (`queued` | `running` | `done` | `failed`)
- `lease_expires_at` (for MVP leasing/locking)
- `attempts`
- `created_at`
- `updated_at`

### 2.8 `execution_logs`
Panel 3 timeline.
- `id` (pk)
- `session_id`
- `level` (`info` | `warn` | `error`)
- `event_type` (string)
- `data_json`
- `created_at`

### 2.9 `orders`
- `id` (pk)
- `session_id`
- `connection_id`
- `payment_method_id` (fk, nullable; set when charging)
- `status` (`draft` | `checkout_started` | `paid` | `failed` | `fulfilled`)
- `total_cents`
- `currency`
- `created_at`
- `updated_at`

### 2.10 `order_items`
- `id` (pk)
- `order_id` (fk)
- `catalog_item_id` (fk)
- `qty`
- `unit_price_cents`
- `line_total_cents`

### 2.11 `payment_methods`
Wallet entry (tokenized).
- `id` (pk)
- `user_id` (fk)
- `token` (string; mocked)
- `brand` (e.g. `visa`)
- `last4`
- `is_default`
- `created_at`

---

## 3. Envelope / event types (inbound)

All inbound interactions are stored in `message_queue` as an envelope:

- `user_text`
  - payload: `{ text: string }`
- `quick_reply`
  - payload: `{ action: string; data: Record<string, string> }`
  - examples:
    - `details` + `{ itemId }`
    - `buy` + `{ itemId }`
    - `confirm_payment` + `{ orderId }`
    - `swap_card` + `{ orderId }`
- `flow_submit`
  - payload: `{ flowId: string; fields: Record<string, string> }`
- `checkout_returned`
  - payload: `{ orderId: string; status: "paid" | "failed"; tokenSaved?: boolean }`

---

## 4. Orchestrator behavior

### 4.1 Sessionization (intent-based)
- If envelope continues the current intent → same session.
- If envelope introduces a new intent → new session, without blocking the old.

### 4.2 Clarification loop (hard rule)
If required slots are missing:
- orchestrator sends a question (text or flow card)
- session → `awaiting_user`
- does **not** release jobs until requirements are satisfied

### 4.3 Plan model (DAG)
Store a minimal DAG in `sessions.plan_json`:
- nodes: `{ id, kind, deps[], status, outputRef? }`
- the orchestrator creates `jobs` for ready nodes (deps satisfied)

### 4.4 Degradation policy
If one connection fails to fetch:
- mark that task failed
- continue ranking with remaining results
- log a warning

---

## 5. Payments (MVP)

### 5.1 Always show a purchase summary before charging
When user clicks **Comprar**:
- orchestrator creates/updates an `order` (`draft`)
- assistant posts a **purchase_summary** message:
  - item details + connection name + SLA + price + total
- then:
  - if user has a default `payment_method` → show **Confirmar** / **Trocar cartão**
  - else → show **Pagar agora** (opens `/checkout` drawer)

### 5.2 First purchase via `/checkout` (drawer)
- `/checkout?orderId=...` renders:
  - merchant branding (connection)
  - order summary
  - card form (mock)
  - checkbox “Salvar cartão (tokenizado)”
  - success/failure screen
  - button “Voltar para o WhatsApp”
- “Voltar para o WhatsApp” triggers `checkout_returned` envelope.
- If `tokenSaved=true`, the orchestrator must **create or update** a `payment_methods` row for the user:
  - set `is_default=true`
  - persist `brand`/`last4` for UX
  - persist a mocked `token` string (represents the tokenized PAN stored by Yuno)

### 5.3 Recurring purchase (in-chat)
- user clicks **Confirmar**
- orchestrator enqueues `charge_token` job (mock)
- on success:
  - mark order `paid`
  - set `orders.payment_method_id` to the default saved `payment_methods.id`
  - send receipt message
  - session → `done`

If the user clicks **Trocar cartão** (`swap_card` envelope):
- always open `/checkout?orderId=...` (drawer) as fallback to re-collect and re-tokenize
- on success, update the default `payment_methods` and re-attempt `confirm_payment`

### 5.4 Token reuse across connections
MVP rule: one saved token can be used across all connections (wallet model).
Implementation: `payment_methods` is user-scoped; orders reference it implicitly (default).

---

## 6. Ranking (MVP default)

Weighted score:
- price 55%
- SLA 25%
- commission 20%

The orchestrator should log ranking inputs and the computed ordering to `execution_logs`.

---

## 7. API surface (minimal)

This repo uses Hono + tRPC; keep the surface minimal for the MVP:

### 7.1 Chat / commerce
- `commerce.sendEnvelope(envelope)` → inserts into `message_queue` and immediately triggers `commerce.tick()`
- `commerce.tick()` → consumes pending envelopes and advances sessions/jobs
- `commerce.getSessions()` → Panel 2
- `commerce.getLogs({ sessionId? })` → Panel 3
- `commerce.getMessages()` → Panel 1 transcript

### 7.2 Checkout
- `/checkout` page reads `orderId` and posts `checkout_returned` on “Voltar para o WhatsApp”

---

## 8. Observability requirements

Every state transition and job lifecycle emits an `execution_logs` event:
- `envelope_received`
- `session_created`
- `intent_detected`
- `plan_created`
- `job_queued` / `job_started` / `job_done` / `job_failed`
- `checkout_opened`
- `checkout_returned`
- `payment_confirmed` / `payment_failed`
- `session_done` / `session_expired`

Panel 3 must be able to render a timeline grouped by session.

---

## 9. Failure modes (MVP)

- If `/checkout` is closed without return → session stays `checkout_pending` until TTL expires.
- If token charge fails → send a message offering “Pagar agora” (fallback to `/checkout`).
- If a job lease expires → another tick can retry with `attempts + 1`.

