# Contract Model – Yuno Commerce Marketplace (B2C)

Updated: August 29, 2026

---

## 1. Parties

- **Yuno Commerce** (marketplace platform and payment-routing provider)
- **Partner Company** (merchant offering products or services through the Yuno Commerce channel)

## 2. Service Scope

The Partner Company makes its catalog, prices, and delivery terms available for sale through the Yuno Commerce WhatsApp channel. Yuno intermediates the conversational experience, processes payments, and distributes net proceeds.

## 3. Yuno Compensation

1. **Routing fee** — the same fee already charged when the merchant uses Yuno Smart Routing in its own checkout.
2. **Commission fee** — a percentage \(\_x\_%\) of each successful sale completed through Yuno Commerce, calculated on the gross transaction value.

> Payout formula:  
> `net_amount = gross_amount − routing_fee − (gross_amount × commission_fee%)`

## 4. Settlement and Payout Timing

- Settlement occurs in the same financial cycle agreed for the routing fee.
- The additional commission is withheld at payout time.

## 5. Partner Company Responsibilities

- Keep catalog, inventory, and prices updated through the agreed API or feed.
- Fulfill orders confirmed by Yuno Commerce.
- Provide post-sale support and logistics according to SLAs.

## 6. Yuno Responsibilities

- Ensure secure payment processing (PCI / LGPD).
- Provide an order and settlement dashboard.
- Make chat history available for dispute purposes.

## 7. Term and Termination

- The term is indefinite; either party may terminate with 30 days’ notice.
- Immediate termination applies in cases of serious compliance breaches or fraud.

## 8. Disputes and Chargebacks

- Yuno provides a mandate trail and logs for dispute defense.
- The routing fee is not refunded; the commission fee is proportionally refunded if the sale is reversed.

---

_This document is an internal reference for the marketplace financial model; legal versions will be issued by counsel._
