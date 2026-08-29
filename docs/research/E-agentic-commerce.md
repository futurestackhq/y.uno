# Frente E — Agentic commerce e stack OpenAI

**Pergunta:** o que o sponsor espera ver, sem teatro de protocolo?  
**Data:** 22/08/2026  
**Conclusão:** **não construir Instant Checkout / ACP checkout como produto.** Em 2026 o modelo OpenAI é discovery + **merchant-controlled checkout**. O fit NextWave é: agente usa tools → **Payment Link / payment Yuno** (e evidência logística). ACP/AP2/UCP cabem numa caixa do diagrama, não no happy path de 24h.

## O que mudou em 2026 (não usar o anúncio de 2025)

- Set/2025: Instant Checkout no ChatGPT + ACP (OpenAI + Stripe), US-first.
- **Mar/2026:** Instant Checkout deixa de ser a aposta universal. Checkout volta para o merchant (redirect ou app no ChatGPT). ACP permanece, puxado para **discovery / inventory / apps de varejista**. Fontes: [Checkout.com](https://www.checkout.com/blog/openai-agentic-commerce-shift), [Stellagent](https://stellagent.ai/insights/openai-checkout-acp-explained), [Juspay LATAM](https://juspay.io/en-br/blog/agentic-commerce-and-payments-for-brazil-and-latam).
- ACP spec ainda no GitHub (`agentic-commerce-protocol`, beta, checkout + `delegate_payment`). Útil se o brief for literalmente ACP. Senão, dívida.

LATAM: Visa **Agentic Ready** na região (abr/2026) — tokens, autenticação, bancos. Não é “ACP em PT”. Juspay: ganha quem for **protocol-agnostic** (TAP, MPP, ACP, UCP num conector). Yuno Playbook já dizia: _chasing every protocol is a losing strategy_.

**H5 da `06`:** rebaixa de “produto” para **módulo**. Se o brief for agentic commerce: o agente completa o pedido gerando **Yuno payment link** (Pix/cartão), merchant of record = merchant. Isso _é_ o pivot 2026. Implementar OpenAPI ACP inteira é como perder o domingo.

## O que usar de fato (sponsor + Yuno)

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Loop | **`@openai/agents`** (`Agent`, `tools`, `run`) | Palco OpenAI; Yuno toolkit tem adapter `openai-agents` |
| Opcional UI stream | Vercel AI SDK `ToolLoopAgent` / `streamText` | Só se o Next precisar; não é o harness |
| Pagamento | `@yuno-payments/agent-toolkit` + `paymentLinks` / `payments` | Já documentado na A |
| Guardrail | `inputGuardrail` / `outputGuardrail` do Agents SDK | HITL: não refundar/disputar acima de threshold sem approve |
| Handoff | 1 agent, N tools. Handoff só se o brief for dois papéis claros | Grafo Customer→Device→Merchant = overkill |

Exemplo mental (não código de produção):

```
Agent("Ops copilot")
  instructions: classify rail, investigate, then act
  tools: get_payment, get_shipment, submit_evidence, create_payment_link, refund
  outputGuardrail: block act if amount > X unless human_approved
```

API OpenAI no fim de semana: créditos do evento. Modelos: o que o palco anunciar sáb 11:30. Não travar o repo num snapshot de modelo.

## Protocolos — o mínimo para não parecer 2025

| Sigla | Dono | Uma linha |
| --- | --- | --- |
| ACP | OpenAI + Stripe | Discovery + (ainda) delegated pay; Instant Checkout não é o default |
| UCP | Google + coalizão | Search/Gemini; jan/2026 |
| AP2 | Google / Adyen-adjacente | Agent payments |
| TAP / MPP / X402 | redes / cripto | Yuno cita no playbook; não implementar |
| Visa Intelligent Commerce / Agentic Ready | Visa | LAC 2026; token + consent |

Uma frase no diagrama: _“Protocol-agnostic: tools talk to Yuno, not to ChatGPT checkout.”_

## O que o júri OpenAI provavelmente gosta

- Tool use visível (trace)
- Guardrail / human approve em $
- Latência honesta
- Não: wrapper ChatGPT sem tools; não: “implementamos ACP spec 2026-04-17” sem Pix

Padrão 4thena continua: fontes → memória → **artefato** (evidence pack, payment link, decisão). O artefato agora pode ser uma **ação Yuno**.

## Implicação

Repo (quando existir): Agents SDK + ports. Sem pacote `acp/`. Se o challenge 12:00 for ACP, um adapter overnight no `PaymentPort.createCheckoutSession`.
