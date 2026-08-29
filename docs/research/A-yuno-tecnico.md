# Frente A — Yuno técnico (hackability em 24h)

**Pergunta:** o que dá para plugar de verdade no sábado vs o que é slideware?  
**Data:** 22/08/2026  
**Conclusão em uma linha:** sandbox existe (`api-sandbox.y.uno` + Testing Gateway), mas a **conta não é self-serve** (sales@y.uno). Para o coringa: Payment Links + Agent Toolkit + webhooks de `payment.chargeback`; checkout Seamless só se a key vier cedo. Direct Flow é PCI — fora.

## Método

Docs oficiais via [llms.txt](https://docs.y.uno/llms.txt) e páginas `.md`. Não rodamos o npm nesta etapa.

## Ambientes e conta

| Item | Fato | Fonte |
| --- | --- | --- |
| Sandbox URL | `https://api-sandbox.y.uno` | [Environments](https://docs.y.uno/reference/getting-started/api-environments.md) |
| Prod US | `https://api.y.uno` | idem |
| Prod EMEA | `https://api.eu.y.uno` | idem |
| Keys | Sandbox ≠ production; toggle Test/Live no dashboard | idem |
| Timeout | 60s | idem |
| Abrir conta | Contact **sales@y.uno** → e-mail de verificação → dashboard | [Step 1](https://docs.y.uno/docs/how-yuno-works/step-1-set-up-your-account) |
| Credenciais | Dashboard → Developers: public (SDK) + secret (server) | idem |
| Postman | Coleção oficial para sandbox | [Postman](https://docs.y.uno/reference/getting-started/postman-collections.md) |

**Implicação:** não contar com key antes do sábado. Mentores Yuno no floor; pedir sandbox no check-in. Até lá, ports + fake. Se alguém do time tiver conta, usar Testing Gateway.

## Qual checkout usar no hackathon

Yuno recomenda **Seamless SDK** (UI pronta, métodos no dashboard, PCI deles).

| Tipo | Controle UI | Métodos no dashboard | PCI merchant | Tempo 24h |
| --- | --- | --- | --- | --- |
| **Payment Link** (API/dashboard) | Página hospedada Yuno | Sim | Não | **Mais rápido** — `paymentLinks.create` já está no MCP/toolkit |
| **Seamless SDK** | Componentes Yuno no vosso HTML | Sim | Não (Yuno) | Médio — session + mount + `continuePayment()` |
| **Lite SDK** | Vocês desenham métodos | Não | Não (Yuno) | Alto — vocês tratam 3DS/fraude |
| **Secure Fields** | Form próprio, campos tokenizados | — | Não | Médio-alto |
| **Direct Flow** | 100% API | — | **PCI-DSS merchant** | **Não** |

Quickstart Seamless: `POST /v1/checkout/sessions` → `yuno.startCheckout` → `yunoCreatePayment(ott)` → `POST /v1/payments` → se `sdk_action_required`, **`yuno.continuePayment()`** (obrigatório para 3DS, **Pix**, bank redirect).

Cartões de teste (quickstart):

| Número                | Cenário       |
| --------------------- | ------------- |
| `4111 1111 1111 1111` | Success       |
| `4000 0000 0000 0002` | Declined      |
| `4000 0000 0000 3220` | 3DS Challenge |

Testing Gateway (só sandbox): connection que simula PSP; dezenas de BINs para decline/3DS. [Docs](https://docs.y.uno/docs/direct-integration-use-cases/yuno-testing-gateway).

**Recomendação para o coringa:** agent cria **Payment Link** (ou payment) contra o port. UI mostra o link + estado. Não montar Seamless no scaffold até ter key. Pix é **assíncrono**: `PENDING` até webhook `SUCCEEDED` / `EXPIRED` / `DECLINED`. Fechar a UI **não** cancela o Pix — só o expiry.

## Webhooks (o loop do agente)

Config: Dashboard → Developers → Webhooks, ou Webhooks API. Auth: `x-api-key` / `x-secret`, HMAC opcional (`x-hmac-signature`), OAuth2 opcional. Esperam **HTTP 200**. Retry: 5 min → 50 min → 6h → 24h → 48h → 96h (7 tentativas).

Eventos que importam para o NextWave:

| type | type_event | Uso |
| --- | --- | --- |
| payment | purchase / authorize / capture / refund / cancel | Estado do pedido |
| payment | **chargeback** | H1 — dispara o investigation agent |
| payment | fraud_screening | Decline de fraude **sem** transação (array vazio) |
| payment | verify | 3DS |
| payout | payout | H2 |
| split_transfer | succeeded / failed | marketplace hold |
| onboarding | * | recipients KYC |

Payloads: [object-and-examples](https://docs.y.uno/docs/webhooks/object-and-examples.md).

No fake: emitir os mesmos `type` + `type_event` a partir do scenario engine. No sábado, um tunnel (Cloudflare/ngrok) no webhook se tiverem sandbox.

## Chargebacks — API real (não só dashboard)

Estados: `CREATED` → (evidência) `PENDING_REVIEW` → `WON` | `LOST`. Payment: `IN_DISPUTE` / `CHARGEBACK`.

Submit:

```
POST https://api-sandbox.y.uno/v1/payments/:payment_id/transactions/:transaction_id/dispute
```

Evidência: **PDF**, base64, **≤ 1 MB**, inglês ou idioma local.

`content_category` (enum oficial):

- `PROOF_OF_DELIVERY` ← o gancho H1
- `CUSTOMER_INTERACTION`
- `RECEIPT` / `PAYMENT_DETAIL`
- `PROOF_OF_AUTHENTICITY` (3DS / signed)
- `REFUND_POLICY` / `CANCEL_POLICY` / `TERMS_AND_CONDITIONS`
- `PROOF_OF_SERVICE` / `SERVICE_AGREEMENT`
- `OTHERS`

Fonte: [Chargeback management](https://docs.y.uno/docs/payouts-and-disputes/chargeback-management.md) + [Disputes API](https://docs.y.uno/reference/payments/disputes).

A própria Yuno lista _proof of delivery_ e _customer communications_ como exemplos de evidência. O produto **não monta o POD** — o merchant envia o PDF. Esse é o buraco que um agente com contexto logístico preenche.

Predispute (`PREVENTED`): chargeback desviado pela rede; **não pede evidência**. Fora do demo H1.

Nem todo provider aceita `Update Dispute`.

## Outras superfícies (não construir, saber que existem)

| Peça | Demo no sábado? |
| --- | --- |
| Smart Routing / Connections | Dashboard; não reimplementar |
| **Monitors** | Auto-fallback se approval cai — clone de “ops agent” |
| Payments Concierge / NOVA | Config de account, sem SDK. **Mencionar**, não clonar |
| Recipients + onboarding + split_transfer | Marketplace H12; KYC pesado para 24h |
| Payouts | H2; API existe (`/v1/payouts`) |
| Reconciliations | “Where is my money” — dashboard, não API óbvia no índice |
| Risk conditions | Regras no dashboard |
| Installment plans | MCP já tem tools |
| Stablecoins | Playbook; não priorizar no scaffold |

## Agent Toolkit / MCP (já mapeado na `02`)

Confirmação nesta frente:

- MCP tools incluem `paymentLinks.*`, `payments.*` (refund, cancel, capture), `recipients.*`
- **Não** vimos tool de `dispute` / chargeback evidence no MCP da `02`. **Buraco:** o agent do toolkit cria payment, mas o POST de disputa pode ter que ser fetch direto. Verificar no sábado no pacote; se não tiver, uma tool nossa `submit_dispute_evidence`.
- Adapters: Vercel AI SDK **e** OpenAI Agents SDK. `ToolLoopAgent` da AI SDK existe ([receita oficial](https://ai-sdk.dev/resources/recipes/node/web-search-agent)). Default do coringa continua **OpenAI Agents** (sponsor) + toolkit Yuno; AI SDK só se o stream Next pedir.

## O que o scaffold precisa (quando a `07` liberar repo)

Mínimo:

1. `PaymentPort`: createLink / getPayment / refund (fake + yuno)
2. `DisputePort`: submitEvidence(category=`PROOF_OF_DELIVERY`)
3. Webhook inbox que atualiza o scenario
4. Não: Seamless UI, Direct PCI, Concierge, Monitors

## Incerto

- Hackathon entrega account sandbox no kit?
- Chargeback dá para **criar** no Testing Gateway ou só receber webhook real?
- MCP tem dispute tool na versão latest?
- Pix no sandbox BR exige connection local?

Pedir aos mentores às 11:00 de sábado, não adivinhar agora.
