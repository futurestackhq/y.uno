# Yuno Commerce (MVP) — Decisions Log (Hackathon vs Scale)

**Date:** 2026-08-29  
**Scope:** This document records _why_ we chose specific implementation shortcuts for the hackathon MVP, and what the “market/scale” version would look like.

---

## 1. Queue / Message Delivery

### Decision (MVP / hackathon)

Use **D1 (SQLite) tables** as the queue for:

- inbound user envelopes (`message_queue`)
- background work (`jobs`)

**Why (hackathon):**

- **Low setup risk**: no additional infra to provision/configure.
- **Best observability**: the same DB is the source of truth for Panels 2–3 (sessions + logs).
- **Sufficient concurrency**: we can run a controlled consumer (single-worker or small parallelism) and still show the orchestration story.

### What we would do for scale / market

Use **Cloudflare Queues** for async delivery + **Durable Objects** for per-session locking.

**Why (scale):**

- Real queue semantics (visibility timeout, retries, backpressure).
- Per-session consistency without DB-as-lock patterns.
- Safer parallelism when multiple sessions/jobs execute concurrently.

### Why we’re not doing “scale” now

Hackathon risk profile: more moving parts → higher chance of losing hours on provisioning, binding config, and edge cases unrelated to the product demo.

---

## 2. Consumer Strategy (“tick” vs background daemon)

### Decision (MVP / hackathon)

Run the orchestration consumer **on-demand** via an explicit endpoint (a “tick”):

- UI posts an envelope → calls `tick` (or the server triggers `tick` immediately)
- UI polls sessions/logs for updates (or uses streaming later)

**Why (hackathon):**

- Deterministic: easy to reproduce in a demo.
- No “always-on” process requirement.
- Works in local dev and Workers deployment with minimal extra wiring.

### What we would do for scale / market

Dedicated async processing:

- queue consumer(s) running continuously (Queues) and/or scheduled triggers
- bounded concurrency + retry policies

**Why (scale):**

- Lower latency without relying on UI-driven ticks.
- Better throughput under load.
- Clearer operational ownership (workers/consumers) and metrics.

---

## 3. AI SDK integration (without regenerating the repo)

### Decision (MVP / hackathon)

Keep the current Better‑T‑Stack scaffold and **copy the AI addon patterns** from the reference project: `/Users/isaque/Development/better-t-stack-with-ai`

Reference patterns we will mirror:

- Server: a streaming endpoint like `POST /ai` built with `ai` (`streamText`, `createUIMessageStreamResponse`, etc.).
- Web: `@ai-sdk/react` `useChat` + `DefaultChatTransport` + `streamdown` for message rendering.

**Why (hackathon):**

- Avoids risk of re-scaffolding/regenerating the monorepo.
- Still uses “maximum ready stuff” (AI SDK primitives + Streamdown) with minimal glue.
- Keeps the product work focused (orchestration + sessions + observability UI).

### What we would do for scale / market

Evolve the same pattern, but with:

- provider hardening (fallbacks, rate limits, request tracing)
- streaming + resumability
- tool call approvals/audit trail for compliance

---

## 4. UI reference strategy (“WhatsApp Web clone”)

### Decision (MVP / hackathon)

Use the provided WhatsApp Web HTML snapshots as **visual reference only**:

- `/Users/isaque/Downloads/(189) WhatsApp (8_29_2026 6：57：34 PM).html`
- `/Users/isaque/Downloads/(189) WhatsApp (8_29_2026 6：54：34 PM).html`

We will implement only the **chat pane** (header + message list + composer), not the full WhatsApp app chrome.

**Why (hackathon):**

- Keeps UI scope tight while still “feeling like WhatsApp”.
- Avoids importing WhatsApp code; we rebuild with our own components and Tailwind.

---

## 5. Checkout + tokenization (recorrência vs sempre pedir cartão)

### Decision (MVP / hackathon)

Use a **hybrid** approach:

- **First purchase**: send user to a simulated `/checkout` page (opened in a “device browser” drawer) to enter card data.
- Offer a checkbox “**Salvar cartão (tokenizado)**”.
- **Next purchases**: if a saved payment method exists, show an in-chat **confirmation step** (“Confirmar pagamento com Visa •••• 1234”) with a single “Confirmar” button, and complete the purchase without re-collecting the card.

**Token scope (confirmed for pitch):**

- We can **collect a token once** (via a merchant checkout) and then **charge other merchants using the same token** (mentor-confirmed Yuno capability).
- For the demo we treat it as a **Yuno Commerce wallet** (user-level), reusable across all connections.

**Why (hackathon):**

- Great demo: shows “checkout transparente + recorrência” without forcing the user to type card data every time.
- Keeps the UX fast for multiple purchases during the pitch.
- We can still fall back to “always link checkout” if something fails.

### PCI posture (how we explain it)

- The demo assumes **Yuno handles PCI** concerns (collection, vault/tokenization, and compliant storage).
- **Yuno Commerce does not store raw card data**; it only stores/uses **tokens** + last4/brand metadata for UX (“Visa •••• 1234”).
- In the hackathon MVP, this is simulated, but the story maps cleanly to a real platform integration.

### Checkout return (MVP)

- We simulate the device returning to WhatsApp via a button “Voltar para o WhatsApp” on `/checkout`.
- This behaves like a deep link: closes the drawer and posts a `checkout_returned` event to the orchestrator.

### What we would do for scale / market

Make token scope explicit and compliant, depending on the real payment architecture:

- **Merchant-of-Record / PayFac model**: a platform-level vault can reuse payment methods across merchants (subject to user consent, risk controls, and card network rules).
- **Per-merchant model**: tokens are often **merchant-scoped**, so reuse across connections would require network tokenization and/or a supported “token exchange” capability (not always available).

**Why (scale):**

- Avoids incorrect assumptions about token portability across different merchant IDs / acquirers.
- Enables correct handling of disputes, SCA/3DS triggers, and consent management.
