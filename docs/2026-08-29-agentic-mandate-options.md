# Agentic Purchase Mandate – Options Ahead (29 Aug 2026)

> Documentation requested by the team before selecting the final thesis. The goal is to record the _facts_ uncovered so far and the alternative paths discussed – without favouring any single direction.

---

## 1. What the Challenge Asks For

| Requirement excerpt | Practical meaning |
| --- | --- |
| “A human creates a purchase **mandate** for their agent: what, how much, until when, payment method” | Persisted, revocable permission object – _not_ the raw card – with amount, category, expiry, instrument. |
| “The **merchant verifies** the mandate before accepting” | An API or contract the merchant must call (`verify`) before it charges. |
| “Agent completes purchase, human sees record, merchant sees verification, auditor sees full trail” | One append-only log queried from three views. |
| “Handle outside-mandate attempts, revocation, impersonation, dispute” | Gate out-of-scope transactions, kill switch, audit trail for 10.4/13.1 disputes. |
| “Trial-by-fire: judges revoke / change limits live” | Live mutation of the mandate must instantly block the next charge – no code change, no prompt change. |

---

## 2. Layers in Today’s Ecosystem

| Layer | Existing products | Gap surfaced by the brief |
| --- | --- | --- |
| **Checkout handshake**<br>(agent ↔︎ merchant) | ACP (OpenAI + Stripe), UCP, TAP, X402 | _Covered_ – integration cost, not permission. |
| **Payment-consent / mandate** | Visa Intelligent Commerce (cards), Google AP2 (cryptographic mandate) | **Missing for LATAM A2A / Pix / wallets** and for merchants on Yuno. |
| **Rails & routing** | Yuno orchestration, Smart Routing, tokens, Pix | Yuno moves money but does **not** supply mandates / verify. |
| **Ops agents** | Yuno Concierge, NOVA retry, fraud/chat | Different job – recovery/ops, not authorisation. |

---

## 3. Market Context (LATAM 2026)

- 20–40 vendors per enterprise ↔︎ 30–50 % engineering on plumbing (Yuno Playbook 2026).
- Pix owns **41 %** of Brazilian e-commerce value; card declines vary 55–90 %.
- Agentic commerce already ~20 % of e-commerce tasks (Yuno ACP post, May 2026).
- Visa IC / AP2 focus on cards & passkeys — **Pix / SPEI / PSE have no mandate layer yet**.

Implication: merchants on Yuno need a permission layer _above_ Pix/OXXO and _below_ ACP/UCP.

---

## 4. Candidate Theses (Neutral List)

| # | Option | Validates the brief | Strengths | Risks / open questions |
| --- | --- | --- | --- | --- |
| **A** | **Merchant-sold mandate control-plane**.<br>Create / revoke / verify API; append-only trail; Yuno remains the payment rail. | Matches every checklist line. | Uses existing repo scaffold; demoable with fake Pix + Yuno token pay. | Needs crisp value story (why Yuno doesn’t build it). |
| **B** | **Consumer wallet / personal agent** (Marta-first). | Shows mandate and agent identity but flips buyer vs merchant. | Fits “agent buys for me” narrative. | Competes with Visa IC & banks; changes Yuno ICP; higher scope. |
| **C** | **Merchant gate without persisted mandate**.<br>Simple bot detection / risk rule. | Handles some ugly cases. | Lower build effort. | Fails revocation + dispute evidence; likely judged incomplete. |
| **D** | **Protocol implementation (ACP / AP2 / TAP)**. | Implements formal spec. | Standards buzzword. | Large surface; risk of spending hours on protocol instead of circuit; Yuno says protocol-agnostic infra wins. |
| **E** | **Chargeback dispute pack (10.4/13.1) from mandate trail**. | Bonus line in brief. | Extends A; evidences Yuno dispute API. | Only shines if A exists; alone misses “verify before pay.” |

---

## 5. Segment Fit Snapshot

| Segment | Why they care | Demo viability |
| --- | --- | --- |
| Travel OTA (e.g. VuelaYa) | Fare drops + agent book; chargeback risk high | **High** (official fiction). |
| LATAM marketplace (Pix/A2A heavy) | Agents restock stores; Pix has no mandate | Medium (needs A2A demo). |
| Cross-border subscription | Recurring mandate & revocation | Medium (needs recurring logic). |
| Corporate procurement (Nauta) | Policy-based spend by company agents | Low for weekend; mention in pitch. |

---

## 6. Technical Building Blocks Already in Repo

- Cloudflare Workers + D1 SQLite (free limits OK).
- tRPC API scaffold – place `verify()` here.
- UI shell (dashboard nav) – three views can be wired quickly.
- Ports pattern; fake provider adapter ready; Yuno Agent Toolkit can slot in.

---

## 7. Decision Gates Ahead

1. **Choose thesis** (A/B/C/D/E). The canvas _mandate-briefing_ shows trade-offs visually.
2. If **A**, define mandate schema + verify flow detail.<br> • Amount, currency, category, expiry, payment instrument id, agent id.<br> • Revocation: `status = "revoked"`, timestamp.
3. Lock demo script (four beats: create → in-mandate buy → over-limit denial → revoke).
4. Confirm scope for bonus features (dispute trail, price-condition trigger, adversarial agent scenario).

---

_Document generated 29 Aug 2026 18:41 UTC by request. No option is endorsed yet._
