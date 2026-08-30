# Yuno Commerce — MVP Design (Hackathon)

**Date:** 2026-08-29  
**Status:** Draft (iterating live during brainstorming)  
**Related decisions:** `docs/superpowers/specs/2026-08-29-yuno-commerce-mvp-decisions.md`

---

## 1. Goal (what we are building)

Build a demoable **consumer-facing** sales channel called **Yuno Commerce** with:
- a **WhatsApp Web–like chat surface** (chat-only),
- an **orchestrator (host)** that turns messages into **sessions (one session = one request/pedido)**,
- **plans** per session (tasks + dependencies), where parallelizable tasks run via **subagents**,
- **full observability**: sessions panel + execution/logs panel.

This is a **mocked integration**: catalogs, providers, payments, and fulfillment updates are simulated.

---

## 2. Non-goals (explicitly out of scope for MVP)

- Real WhatsApp BSP integration and real Meta Flow publishing.
- Real partner catalogs/APIs (all mocked fixtures).
- Production-grade queue (Queues/DO) — see Decisions Log.
- Authentication/identity and privacy hardening.

---

## 3. Primary UX (web app)

### 3.1 Page: `/commerce` (3-panel layout)

One page with three fixed panels:

1. **Panel 1 — WhatsApp clone (chat-only)**
   - Chat header (“Yuno Commerce”) with a **Debug overlay toggle**.
   - Message thread (Marta ↔︎ Agent).
   - Composer (send messages as “Marta”).
   - Supports WhatsApp-like “rich replies”:
     - option list (list message style)
     - carousel cards (Meta Flows–style)
     - “Flow-like” card that opens a drawer
   - Checkout UX is simulated via a `/checkout` page opened in an in-app “device browser” drawer (see section 7.5).

#### 3.1.1 Rich reply components (MVP)

We will simulate a subset of WhatsApp interactive surfaces in a web-only UI:

- **Carousel (primary)** — “Meta Flows–style” horizontal cards
  - Horizontal scroll with **scroll-snap** (desktop trackpad friendly).
  - Each card: image placeholder/logo, title, 1–2 metadata lines (price/SLA), and a primary action.
  - **Interaction (MVP):** each card has its own CTA button (e.g. “Escolher”, “Ver detalhes”, “Agendar”).
  - Optional: allow **2 CTAs per card** *only when both are “quick-reply-like” actions* (see constraints below).
  - Used for: product recommendations (Raia/Carrefour), option comparison, and selectable time windows (Petz).
- **List message (secondary)** — compact list for 6–10 choices
  - Used when there are too many options for a carousel.
- **Flow card** — message that opens the Flow drawer
  - Used to collect required inputs without flooding the chat.

##### 3.1.1.1 WhatsApp “feel” constraints (inspired by Iris conventions)

Even though we render our own components (web-only), we will keep message UX within WhatsApp-like constraints:

- **Reply buttons**: max 3
- **List rows**: max 10 total
- **List row title**: short (≤24 chars)
- **List row description**: short (≤72 chars)
- **Header / footer text**: short (≤60 chars)
- **Carousel buttons (WhatsApp Cloud API behavior)**:
  - In **interactive media carousel messages**, each card supports **either**:
    - **1 URL button** *or*
    - **1+ quick-reply buttons** (e.g. 2 quick replies)
  - You **cannot** mix URL + quick-reply buttons in the same carousel.
- Prefer carousel for “top 3–5”, list for “6–10”.

2. **Panel 2 — Sessions (observability-only)**
   - Lists sessions opened by the orchestrator.
   - Shows: `S#`, `intent`, status, last update, task counts.
   - No controls that change orchestration decisions.
   - Optional click-to-filter for Panel 3 only.

3. **Panel 3 — Executions / Logs**
   - Timeline of orchestration events and subagent runs per session.
   - Events include: enqueue, plan creation, task lease, tool calls, completion/failure.
   - Viewer inspired by “agents transcript” surfaces (grouping, filtering, step inspector).

### 3.2 Debug overlay (discreet, optional)

- Default: OFF (chat looks “real”).
- When ON: each agent message shows a subtle label in the bubble header:
  - Format: `S#3 · pet_food`
  - Purpose: instant correlation with Panels 2–3 during pitch.

---

## 4. “Connections” (mock partners) used in pitch

We will use **known brands** as *mocked* connections (demo only, no implied partnership):

1. **Petz** — *service workflow* (end-to-end)  
   - “Banho & Tosa (leva‑e‑traz)” with pickup and status updates.
2. **Droga Raia / Drogasil** — product flow  
   - OTC + equivalents (genérico/referência).
3. **Carrefour** — product flow  
   - Market cart-like selection + substitution logic (mocked).

Each connection has its own mocked:
- catalog (SKUs / services)
- SLA metadata
- commission metadata (used for ranking)

### 4.1 Ranking defaults (MVP)
For product recommendations we rank using a simple weighted score:
- **Price**: 55%
- **SLA / availability**: 25%
- **Commission**: 20%

This is a pitch-friendly default (easy to explain) and is configurable per connection.

---

## 5. Session model (one session = one request)

### 5.1 Sessionization policy

- Policy: **intent-based**.
  - Follow-ups (“10kg”, “adulto”, “sem açúcar”) stay in the same session.
  - New intent (“também quero brinquedo”) creates a new session.

### 5.2 Session lifecycle

- Sessions end in terminal state when:
  - `done` (order created / payment simulated success), or
  - `expired` (TTL inactivity for sessions awaiting user input), or
  - `failed` (terminal errors after retries).

Recommendation: `done` after purchase + inactivity TTL for `awaiting_user` / `checkout_pending`.

#### 5.2.1 TTL defaults (MVP)
- `awaiting_user`: 30 minutes
- `checkout_pending`: 15 minutes
- `active` sessions: soft idle warning after 10 minutes (no state change), hard expire after 2 hours

---

## 6. Orchestrator (host) + plan per session (DAG)

### 6.1 Core rule: orchestrator asks when in doubt

If the orchestrator lacks required inputs to progress a session:
- it **asks a question** to the user (in chat and/or Flow drawer),
- sets the session to `awaiting_user`,
- does **not** release execution tasks to subagents until requirements are satisfied.

When the user answers:
- if it is a follow-up: it fills missing requirements in the same session,
- if it is a new intent: it starts a new session (without blocking the old one),
- orchestrator then **replans** and releases only the now-ready phases.

### 6.2 Plan shape

Each session has a plan as a **DAG** of tasks with dependencies, e.g. product intent:

- `detect_intent`
- `select_candidate_partners` (based on contracted connections)
- `fetch_catalog:partner_A` (parallel)
- `fetch_catalog:partner_B` (parallel)
- `fetch_catalog:partner_C` (parallel)
- `rank_products` (depends on fetch tasks)
- `compose_reply_options`
- `send_reply_to_chat`

### 6.3 Parallelism + failure policy

Parallel tasks run as separate jobs.  
If one partner fetch fails, the orchestrator:
- marks that task as `failed`,
- continues with other results (degradation),
- records a warning in logs (optional surface in UI).

---

## 7. Flow drawer (MetaFlows-like) inside Panel 1 (chat)

### 7.1 Why
Collect required inputs without flooding the chat, while keeping sessions/logs visible.

### 7.2 Behavior
- Agent sends a “Flow card” message (WhatsApp-like).
- **Drawer opens only by user intent**: user clicks “Preencher dados” → opens a **drawer** inside the chat panel.
- Drawer has: header, fields, CTA confirm, close.
 - Flow drawer can optionally render **a carousel of prefilled suggestions** (e.g. time windows), but the MVP must still work with plain fields only.

### 7.2.1 Source of Flow conventions
Flow UX constraints and interactive-message ergonomics are inspired by:
- `AI Docs/Iris/Iris - WhatsApp Conventions.md` (Obsidian vault)

### 7.3 Petz service workflow (MVP scope)

Required fields (minimal to simulate):
- `pickup_address`
- `pickup_window`
- `handoff_instructions`

After submit:
- orchestrator stores slots, replans, releases tasks.

### 7.4 Fulfillment updates (mock)

After “order created”, Petz session triggers background updates (jobs) that post status messages:
- “Estamos indo buscar seu pet…”
- “Retirada feita — pode entregar na portaria…”
- “Banho e tosa em andamento…”
- “Voltando para sua casa…”
- “Seu pet chegou.”

These updates must not block new chat messages or other sessions.

### 7.5 “Device browser” checkout drawer (simulated)

We simulate a mobile-like external browser for payments:

- **Trigger (first purchase / no saved card)**: after the user clicks “Comprar” (quick reply), the agent sends a message with a CTA “Pagar agora”.
- **Action**: clicking “Pagar agora” opens `/checkout` inside a **bottom drawer** (indent/scale effect), as if the device opened a browser view.
  - UI reference: Base UI drawer “indent effect”: `https://base-ui.com/react/components/drawer#indent-effect`
  - Implementation note: in shadcn ecosystems, an equivalent can be done via a Drawer that scales the background content when opened.
- **Checkout content (mock)**:
  - merchant/connection branding (Petz/Raia/Carrefour)
  - order summary
  - card form (first purchase) + “Salvar cartão (tokenizado)”
  - payment confirmation screen + “Voltar para o WhatsApp”

**Return to chat (deep link simulation):**
- The checkout confirmation screen includes a button “**Voltar para o WhatsApp**”.
- Clicking it simulates a deep link back to the chat app:
  - closes the drawer (browser view)
  - emits a `checkout_returned` event (with `order_id` + status) so the orchestrator can post the receipt and progress the session

**Important:** this is a web-only simulation; we are not integrating a real WhatsApp deep link.

### 7.6 Recurring purchases (saved card → in-chat confirm)

After the first successful purchase (and card saved/tokenized):

- Next purchases do **not** require opening `/checkout`.
- The agent sends an in-chat confirmation message:
  - A **purchase summary** message with item details + total:
    - Item title, merchant/connection, key attributes (size/variant), SLA, and **price breakdown** (item + fees if needed)
    - “Total: R$ 89,90”
    - “Pagar com Visa •••• 1234?”
  - Buttons (WhatsApp-like): **Confirmar** / **Trocar cartão**
- Clicking **Confirmar** completes the payment using the saved token and returns a receipt message.

**Token portability (pitch rule):**
We assume the saved token can be reused across different connections/merchants (mentor-confirmed Yuno capability), so the “saved card” experience works across the marketplace.

### 7.7 Buy-click behavior (always show a summary before payment)

When the user clicks **Comprar** on a carousel card:

- The agent must first send a **dedicated “purchase summary” message** with:
  - Item details (selected SKU/service + variant)
  - Connection/merchant name (Petz/Raia/Carrefour)
  - SLA / delivery window summary
  - Price + total
- Then present the next step CTA depending on whether a card is saved:
  - **If saved card exists**: show **Confirmar** (and optional **Trocar cartão**).
  - **If no saved card**: show **Pagar agora** (opens `/checkout` drawer) (and optional **Cancelar**).

---

## 8. Queue + processing strategy (MVP)

See decisions log. Summary for MVP:
- Queue: **D1/SQLite tables** (`message_queue`, `jobs`).
- Consumer: **on-demand tick** (UI-driven or server-called immediately after enqueue).

---

## 9. AI SDK (OpenAI)

- Provider: OpenAI
- Model: `gpt-4o-mini`
- Integration pattern mirrors `/Users/isaque/Development/better-t-stack-with-ai`:
  - server streaming endpoint,
  - web `useChat` + `Streamdown`.

The AI layer is used primarily for:
- intent detection + slot filling (safe, constrained),
- planning (task graph),
- response phrasing (formatting).

Tool execution is delegated to subagents/jobs and logged.

---

## 10. Open questions (to close before implementation spec)

- Exact TTL values (sessions awaiting user).
- Ranking weights (price vs SLA vs commission).
- Which WhatsApp-like rich components we’ll simulate first (carousel vs list vs both) — current default is: carousel + list + flow-card.
- Checkout return to chat is via “Voltar para o WhatsApp” (deep link simulation).

