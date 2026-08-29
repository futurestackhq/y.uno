# 09 — Síntese: conversa harness × ideias de hackathon

**Origem:** thread que começou em `deepseek-ai/deepseek-harness` / Vercel AI SDK e terminou no NextWave. Fonte da conversa: [ChatGPT share](https://chatgpt.com/share/6a8a3db2-e0a8-83e9-9071-8b097afeafd3) (não auditamos o código do DeepSeek linha a linha nesta v1).

**Julgamento:** a **estratégia de plataforma** (runtime + tools + providers + cenários) agrega e alinha com o que já tínhamos. A **shortlist de produtos** mistura ouro com clone da Yuno. O **harness estilo Cordis** é o modelo mental certo e o escopo de build errado para 24h.

Cronograma SP do flyer oficial (anexo do time) confirma o site, não o ChatGPT. Ver `01`.

---

## 1. O que o harness ensina (agrega)

### Distinção que vale ouro

```
LLM SDK  ≠  Agent harness
```

| Camada | Exemplos | Função |
| --- | --- | --- |
| Primitive / LLM | `generateText`, `streamText`, `tool()`, providers | Falar com o modelo |
| Agent loop | ToolLoopAgent, OpenAI Agents SDK, Cordis loop | tool → observe → next step |
| Harness | DeepSeek Cordis, OpenHands, o “mini runtime” do ChatGPT | lifecycle, cancel, retry, context, persistence, replay, plugins, várias UIs |

DeepSeek (segundo essa leitura) **não** usa Vercel AI SDK como runtime. Núcleo próprio (Cordis, “everything is a plugin”), pacotes `dsh-llm` / `dsh-tools` / `dsh-web`, e replay de sessão (`dsh-llm-replay`) sem re-chamar o modelo.

Isso importa para o hackathon **como critério de corte**, não como coisa para clonar:

- O júri Nauta vai perguntar se o agente tem **contexto e ação**, não se vocês reinventaram Cordis.
- Replay/eval de cenário é um diferencial de **pitch** (“o agente acerta o caso X”) se for fino. Um sistema de gravação SSE→loop→tools é overkill.

### Referências úteis (quando formos ao repo)

Nível certo de leitura, não de fork:

| Repo | Para quê | Risco |
| --- | --- | --- |
| `vercel-labs/open-agents` | Até onde o AI SDK chega sozinho | Copiar runtime demais |
| `ai-sdk-agents` | Agente-como-tool (composição) | Grafos de 5 agentes em 24h |
| `vercel/lead-agent` | Workflow + **human-in-the-loop** + Slack | App de CRM, não payments |
| `ai-code-agents` | Environment (local/docker) vs tools | Sandbox de código ≠ Yuno |

Para **este** evento, o adapter que a Yuno já publicou (`@yuno-payments/agent-toolkit` → OpenAI Agents SDK **e** Vercel AI SDK) é mais importante que qualquer um desses repos. O ChatGPT subestimou isso porque a thread começou em DeepSeek, não nas docs da Yuno.

### Stack recomendada (correção nossa)

OpenAI é sponsor. Yuno já tem adapter para **os dois**. Default do coringa:

1. **OpenAI Agents SDK** como loop (alinha palco + toolkit Yuno)
2. Vercel AI SDK só se o UI/stream Next pedir — não como “o harness”
3. **Não** construir Cordis / plugin bus / session replay engine

O ChatGPT acertou a frase: _“o LLM é uma dependência do harness, não o harness inteiro.”_ Errou o tamanho do harness que cabe em 24h.

---

## 2. Números da thread (verificados)

### Visa 58% — verdadeiro, fácil de usar errado

Fonte: Visa Conecta / On The Go, 1.521 entrevistados, 18–26 dez 2025. [TI Inside](https://tiinside.com.br/26/02/2026/maioria-das-desistencias-de-compras-online-acontecem-na-hora-do-pagamento-constata-estudo/), [PDF](https://www.visa.com.br/content/dam/VCOM/regional/lac/brazil/visa-conecta/panorama-ecommerce-2026.pdf).

- **58% dos que desistiram** abandonam **na etapa de pagamento** — não “58% de todos os checkouts falham”.
- Quebra: 37% na **escolha do método** + 21% na **inserção/confirmação de dados**.
- Fricção citada: sair da loja para o app do banco no Pix (copia-e-cola). 87% acham atraente pagar Pix **sem sair** da loja.

Implicação: um “Checkout Recovery Agent” que só faz retry de cartão recusado ignora metade da dor Visa (UX de método + Pix initiation). NOVA da Yuno ataca a recusa; a fricção de jornada é outra tese (e a Visa está vendendo iniciação de pagamentos em cima disso).

### Serasa 2,3M / R$ 2,4 bi — verdadeiro, recorte da base deles

Fonte: [Serasa Experian, sala de imprensa](https://www.serasaexperian.com.br/sala-de-imprensa/prevencao-a-fraude/prevencao-a-fraude-evitou-prejuizos-de-rdollar-24-bilhoes-em-2025-no-e-commerce-brasileiro-aponta-serasa-experian/).

- 2,3 milhões de tentativas **na parcela monitorada pelas soluções da Serasa** (e-comm, marketplace, venda direta, app delivery), 2025.
- R$ 2,4 bi = prejuízo **evitado** naquela base, não perda nacional total.
- Ticket médio fraude R$ 1.057 vs R$ 539 legítimo.
- Definição deles de “tentativa”: suspeita + confirmada + retorno de chargeback.

Usar no pitch com o recorte. Não dizer “o e-commerce BR perdeu R$ 2,4 bi”.

---

## 3. Ideias da shortlist × o que já temos

| Ideia ChatGPT | Nosso mapa | Veredito |
| --- | --- | --- |
| Checkout Recovery Agent | H3 + NOVA | **Delta só se** tiver contexto de pedido/entrega/Pix journey. Sem isso, clone de NOVA + smart retry |
| Fraud Investigation Agent | D1/fraude; vizinho de H7 | Demo forte. Risco: Yuno já orquestra fraud vendors. Precisa de sinal que eles **não** têm (device graph ok; **POD / endereço / carrier** é o ângulo NextWave) |
| Payment Routing Agent | Smart Routing nativo Yuno | **Não construir como produto.** No máximo: o agente _explica_ uma rota que o mock/Yuno já escolheu |
| “Uber da logística” | anti-padrão da `05`/`06` | Fora do ICP Nauta (importador/SKU, não motoboy Campinas). Mentores vão esfriar |
| Delivery Exception Agent | Nauta Nina/Rex; falta $ de pagamento | Bom se fechar loop (notificar + reroute **+ hold/refund/retry de captura**). Isolado é control tower |
| Where is my money? | reconciliação Yuno | Demo fácil, tese fina. Bom **módulo**, produto fraco sozinho |
| Payment + Logistics Agent | **H1/H3/H4/H7** | **O cluster certo.** É a intersecção que o outro modelo também sentiu |
| Merchant Operations Agent | Payments Concierge | Clone. Não |
| Chargeback / Dispute Agent | **H1** | Alta prioridade. Evidência > texto de LLM |

Três arquiteturas reutilizáveis (Investigation / Optimization / Operations) **agregam**. Encaixe:

| Arquitetura | Serve | Não é |
| --- | --- | --- |
| Investigation | fraude, chargeback, “where is money”, atraso | chatbot de FAQ |
| Optimization | routing, carrier, landed cost | reimplementar o motor da Yuno |
| Operations | observe → act com HITL | Concierge 2.0 sem dado novo |

O padrão 4thena que os dois lados citam continua válido: **várias fontes → memória → artefato/ação mensurável.**

---

## 4. “Não vou integrar na ferramenta deles” — quase certo, com um asterisco

O ChatGPT está certo: **não** vai ter SAP da Nauta nem produção Yuno. Protótipo ≠ integração.

O asterisco que faltou na thread: a Yuno **já publicou** MCP + Agent Toolkit. Estratégia correta:

```
Agent
  └── tools
        └── PaymentPort / LogisticsPort / RiskPort
              ├── fake/          ← sempre, para demo e eval
              ├── yuno/          ← tentar sandbox/MCP no sábado (ou antes)
              └── nauta/         ← provavelmente fake para sempre
```

Não é “só fake”. É **porta + fake default + adapter real se a chave aparecer**. O pitch continua honesto: _same runtime, simulated environment, pluggable providers._

### Scenario engine — agrega, com escopo mínimo

Isso é o melhor pedaço da thread para o repo coringa.

Não precisa de YAML de 40 campos. Precisa de **6–8 fixtures** que o demo troca num dropdown:

- `soft_decline_bin` — recusa, outro trilho aprova (Pix)
- `3ds_friction` — challenge que falha
- `psp_degraded` — approval caiu nos últimos 20 min
- `cnpj_ok_address_bad` — fraude baixa, POD improvável (CO/BR)
- `chargeback_not_received_but_delivered` — H1 happy path
- `freight_invoice_overbill` — H2
- `carrier_stuck_vip_paid` — H3/H4
- `pix_abandoned_app_switch` — dor Visa (jornada, não issuer)

Evaluator: **um** `expect` por cenário (decisão + 1 evidência obrigatória). Comparar GPT-5 vs mini é vaidade se o UI não estiver no ar.

### Três packs de tools — sim, pequenos

O ChatGPT listou 4 tools por domínio. É o tamanho certo. Não 50.

Cruzamento com o brief:

- Challenge payments → payments + fraud
- Challenge logistics → logistics (+ payment se der)
- Challenge intersecção → os três, **cortando** tools, não somando

---

## 5. O que **não** levar da thread

1. Horário 09:00 / freeze 11:00 — **errado para SP.** Flyer: desafios 12:00, código 12:30→12:30, pitches 13:00.
2. Monorepo com `loop.ts` + `memory.ts` + `policy-engine.ts` + `evaluation/` + `observability` completos **antes** de ter UI e um cenário que roda. Isso é como perder sexta.
3. Multi-agent Fraud Investigator → Customer → Transaction → Device → Merchant. Um `ToolLoopAgent` / um Agent OpenAI com 8 tools ganha de um grafo.
4. Routing Agent como headline.
5. Uber de carrier.
6. DeepSeek como modelo default no palco OpenAI (pode ser tool interno; não é a história).

---

## 6. Contrato do coringa (quando a `07` liberar o repo)

Objetivo de sexta, não de plataforma eterna:

```
apps/web          UI: cenário → trace do agente → decisão → ação
packages/agent    1 agent genérico (objective + tools + policies)
packages/tools    3 packs: payments, risk, logistics
packages/ports    interfaces
packages/fake     scenario engine + fixtures
packages/yuno     adapter toolkit/MCP (pode estar stub)
```

Pronto no kickoff: runtime, 1 investigation flow, 1 optimization flow, 6 fixtures, diagrama.  
Deixa para o sábado: tools do brief, copy do pitch, adapter Yuno se derem key.

Frase de README/pitch (da thread, boa):

> We didn't build a chatbot on top of the challenge. We built an agent runtime that can operate on payment and logistics infrastructure. The demo uses a simulated environment because the same runtime can be connected to real providers.

Completar com: _the missing context is fulfillment evidence — that's the layer Yuno's NOVA/Concierge don't have and Nauta's agents live in._
