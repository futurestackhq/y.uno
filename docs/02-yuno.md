# 02 — Yuno (pagamentos / orquestração / IA)

**Escopo:** o que a empresa é, o que vende, o que um time de hackathon pode plugar. Não é análise financeira.

## O que é

Yuno se posiciona como **AI-native operating system of global payments and financial services**: uma camada de orquestração acima de PSPs, adquirentes, métodos locais, fraude, payouts e (agora) stablecoins.

Site: [y.uno/en](https://y.uno/en) · Docs: [docs.y.uno](https://docs.y.uno/)

Tese em uma linha: o merchant não deveria integrar 20–40 vendors; deveria ter **uma API** que roteia, retenta, recupera e reconcilia.

Clientes citados publicamente: McDonald’s / Arcos Dorados (21 países LATAM), NetEase Games, GoFundMe, Rappi.

Escala declarada (site + imprensa): **1.000+ métodos de pagamento**, **190 países**, **460+ integrações** (número da imprensa; o site fala 1.000+ methods/PSPs/fraud solutions). LATAM: **180+ providers, 30+ países**.

## O produto (mapa mental)

```
Checkout / pay-in  →  Smart routing + retries  →  Auth / 3DS / tokens
       ↓                      ↓                         ↓
  Métodos locais         Multi-PSP failover         Fraud / risk
       ↓                      ↓                         ↓
  Subscriptions          Payments Concierge         Chargebacks
       ↓                      ↓                         ↓
  Payouts / recipients   NOVA (recuperação)         Reconciliação
       ↓
  Stablecoins (rail híbrido, não substituto)
```

### Orquestração e Smart Routing

Docs: [Routing](https://docs.y.uno/docs/using-yuno/dashboard-overview/routing), [Connections & Routing API](https://docs.y.uno/reference/organizations/connections-routing-overview)

- **Connection** = conta de um provider (Stripe, Adyen, dLocal, PayU…) dentro da Yuno
- **Routing** = para um `(account, payment_method)`, qual connection usar, com branches por país, moeda, valor, bandeira, metadata
- **Smart Routing** = IA escolhe o provider segundo o objetivo do merchant:
  - conversion rate + latency
  - conversion rate + costs (usa custos cadastrados na connection)

API: `https://api.y.uno` com headers `public-api-key` + `private-secret-key` e `X-Idempotency-Key` em POST/PATCH.

### Camada de agentes (o que o hackathon vai amar)

| Peça | Função | Integração |
| --- | --- | --- |
| **Smart Routing** | Rota cada transação para o trilho que mais aprova / menos custa | Dashboard + API de routing |
| **Payments Concierge** | Analista 24/7 do stack: Slack / WhatsApp / Telegram / Teams. Briefings, anomalias, recomendações (e, no discurso comercial, “implementa o fix quando você aprova”) | Config no dashboard |
| **NOVA** | Recupera pagamento recusado: WhatsApp ou voz, no idioma do cliente (ES/PT), manda link de checkout Yuno | Config, sem SDK no merchant |
| **Account updater / network tokens / 3DS** | Credencial saudável, menos challenge inútil | Features de protect |
| **MCP + Agent Toolkit** | Agentes de código chamam a API Yuno via tools | npm |

Docs:

- [NOVA](https://docs.y.uno/docs/ai-capabilities/nova)
- [Payment Concierge](https://docs.y.uno/docs/ai-capabilities/payment-concierge)
- [MCP / LLMs](https://docs.y.uno/docs/ai-capabilities/building-ai-integrations-with-yunos-llms-and-mcp)
- [Agent Toolkit](https://docs.y.uno/docs/ai-capabilities/agent-toolkit)

### Superfície técnica para o hackathon (ouro)

Yuno **já publicou o atalho** que a maioria dos times vai descobrir tarde:

1. **Docs machine-readable:** qualquer página de docs + `.md` no fim da URL
2. **MCP local:** `npx @yuno-payments/yuno-mcp@latest`
3. **Agent Toolkit TS:** `@yuno-payments/agent-toolkit` com adapters para:
   - Vercel AI SDK
   - LangChain
   - OpenAI Chat Completions
   - **OpenAI Agents SDK** ← alinhado com o sponsor
   - Google Genkit

Tools do MCP (não-exaustivo): `customer.*`, `paymentMethod.*`, `checkoutSession.*`, `payments.*` (create, refund, cancel, authorize, capture), `paymentLinks.*`, `subscriptions.*`, `recipients.*` (payouts), `installmentPlans.*`, `documentation.read`.

Isso é a peça central do repo coringa futuro: um agente OpenAI que já sabe criar customer, checkout, payment, refund e recipient.

**Credenciais:** dashboard Yuno (`YUNO_ACCOUNT_CODE`, `YUNO_PUBLIC_API_KEY`, `YUNO_PRIVATE_SECRET_KEY`). Verificar se o hackathon entrega sandbox no sábado ou se dá para pedir acesso antes.

## Números que a Yuno usa (Playbook 2026)

Fonte: [Payment Orchestration in 2026](https://y.uno/en/blog/payment-orchestration-in-2026-the-enterprise-playbook) (18/05/2026). São números **da própria Yuno / rede Yuno** — úteis no pitch, não independentes.

| Claim | Número |
| --- | --- |
| Perda global de e-comm por false declines | > USD 440B / ano |
| Vendors por enterprise global | 20–40 |
| Engenharia gasta em plumbing de payments | 30–50% |
| Receita perdida por falha de aprovação | 7–15% |
| Falsos positivos de fraude | 40% dos “positivos” |
| Lift de approval com orquestração multi-rail | **5–8 pontos** |
| Recuperação de failed payments via smart retry | **20–40%** |
| Custo por transação aprovada | −10 a −40 bps |
| Predictive routing extra | +2 a +5 pontos em corredores específicos |
| LATAM e-comm | USD 231B (2024) → 376B (2030), CAGR 9% |
| Brasil Pix | 41% do e-comm e 46% do POS (valor) |
| México cash no POS | 34% |
| Uplift de approval citado no FAQ do site | até 7% |

Arcos Dorados (Ricardo Guther): “better checkout, higher approval rates, greater agility, stronger recurring payments.”

### LATAM, na voz da Yuno

- Localização de métodos **não é otimização, é pré-requisito**
- Pix **não é uma integração só**: performance varia por banco, horário e regras de risco
- Swing de 3–5 pontos de approval em mercado grande = milhões/mês
- 3DS na LATAM é em grande parte **problema de roteamento** (BIN × adquirente), não só de UX — [Why 3DS still fails in LATAM](https://y.uno/en/blog/why-3ds-still-fails-in-latin-america-and-what-smart-routing-does-about-it)
- Pix bypassa 3DS; roteamento inteligente deveria empurrar volume elegível para A2A

### Payments 3.0 (tese 2026 da Yuno)

1. Decisioning avançado (centenas de fatores por tx)
2. Predictive retries
3. Stablecoins como **rail híbrido** (payouts, FX, weekend settlement) — não especulação
4. Agentic support **e** agentic commerce (ChatGPT, Claude, Gemini, Perplexity, Copilot; protocolos X402, TAP, AP2, ACP)

Citação útil para o time: _chasing every new protocol is a losing strategy; adaptive infrastructure that absorbs change is how leaders stay ahead._

## Como a Yuno quer ser vista no hackathon

Walter Campos (GM Latam), na imprensa: formar talentos de engenharia de IA para **agentic commerce**; a Yuno como camada unificada de recebimento, fraude, stablecoins e identidade.

Mauricio Schwartzmann (host CDMX, LinkedIn sobre Concierge): bancos/FIs descobrem outage de pagamentos **horas depois**, via escalação, não em tempo real. Concierge = camada que detecta e corrige.

## Implicação para o time

- O “hello world” impressionante **não** é um checkout Stripe. É um **agente** que usa routing / recuperação / concierge / payouts com contexto.
- Yuno já tem chatbot de ops (Concierge) e agente de recovery (NOVA). Um projeto que só replique isso perde. Um projeto que **dê contexto novo** (logística, chargeback de não-entrega, landed cost, COD, B2B importer) para esses agentes diferencia.
- Plugar o Agent Toolkit no sábado de manhã é vantagem mecânica. Documentar o setup agora.

## Buracos desta nota (ir para a frente A da `07`)

- Sandbox: existe self-serve? Precisa de account manager?
- Checkout flavors: Lite vs Embedded vs Semi-lite — qual dá para demo em 24h?
- Webhooks / eventos de decline, 3DS, chargeback
- Recipients / payouts na prática (KYC do recipient)
- Stablecoins: quais rails, quais corredores
- MCP remoto vs local; rate limits
- Se o hackathon entrega API keys no kit do sábado
