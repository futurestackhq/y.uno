# 06 — Dores, intersecção e hipóteses de exploração

**Escopo:** síntese das notas 01–05. Tudo aqui que for ideia nossa está marcado como **hipótese**. Não é a tese final do time — é o menu para a pesquisa da `07`.

## O que as duas empresas realmente compartilham

Não é “IA”. É **orquestração sobre fragmentação**.

```
mundo sujo (muitos sistemas)
        ↓
   camada de contexto
        ↓
   agente com permissão limitada
        ↓
   ação mensurável em $
        ↓
   humano no loop só no que importa
```

Yuno faz isso no dinheiro da transação. Nauta faz isso no movimento da mercadoria. O comércio real é os dois ao mesmo tempo: **nada se paga certo se a carga não está onde o contrato diz, e nada se entrega certo se o trilho de pagamento quebrou.**

## Dores priorizadas (impacto × aderência ao júri × factível em 24h)

Escala 1–5, julgamento nosso nesta v1.

| # | Dor | Quem sente | $ | Yuno | Nauta | 24h | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Recusa / false decline / trilho errado | Merchant e-comm | altíssimo | nativo | baixo | alta | A |
| D2 | Chargeback “não recebi” sem POD no fluxo de disputa | Risk + CS | alto | alto | alto | média | **A** |
| D3 | Recuperação de pagamento recusado sem contexto do pedido/entrega | Revenue | alto | NOVA | médio | alta | A |
| D4 | Invoice de frete paga errada | Finance + logistics | alto | payouts | nativo | média | A |
| D5 | Detention/demurrage com free-time conhecido e ignorado | Importer | altíssimo | payout urgente | nativo | média | B |
| D6 | Stockout / fill rate sem ligar demanda ↔ pagamento de PO | Ops + procurement | alto | payouts | nativo | baixa (dados) | B |
| D7 | Landed cost invisível no checkout | Pricing + buyer | médio-alto | métodos | landed cost agent | média | B |
| D8 | Checkout agente (ChatGPT) sem trilho LATAM | Merchant + OpenAI | estratégico | orquestração | baixo | média (protocolo) | B |
| D9 | Anomalia de approval às 2h sem ação | Payments ops | alto | Concierge | baixo | alta | C (já produto Yuno) |
| D10 | Contexto de sales/onboarding espalhado em chats | Sales Yuno | médio | já ganhou 4thena | baixo | alta | **evitar clone** |
| D11 | COD / OXXO / boleto dessincronizado da tentativa de entrega | Last mile + finance | médio | métodos | execução | média | B |
| D12 | Split marketplace (seller só recebe pós-entrega) | Platforms | alto | recipients | POD | média | B |

**Leitura:** as apostas mais “NextWave 2026” (não 2025) estão na **costura pagamento × evidência operacional** (D2, D3, D4, D7, D11, D12), não no Concierge clone (D9) nem no 4thena 2.0 (D10).

## Hipóteses de produto (para aprofundar, não para escolher ainda)

### H1 — Dispute brain (chargeback ↔ POD)

Quando entra um chargeback de não-entrega, o agente junta tracking, foto, assinatura, timestamp, SLA e monta o evidence pack no fluxo Yuno; se a logística realmente falhou, inicia refund no trilho certo em vez de lutar à toa.

- Por que o júri: problema real, duas empresas, arquitetura clara, demo filmável (antes/depois).
- Risco: APIs de carrier/MELI no sábado; mock bem feito resolve se a narrativa for honesta.

### H2 — Exception-to-cash (freight audit → payout)

Agente estilo Alec/Theo da Nauta: cruza invoice × contrato × BOL, bloqueia overbilling, e só então dispara payout Yuno ao carrier. Humano aprova acima de threshold.

- Por que o júri: Nauta ama “age, não alerta”; Yuno ama recipients/payouts.
- Risco: domínio de accessorials é fundo; precisa de dataset fake convincente.

### H3 — Recovery com contexto de fulfillment (NOVA-aware)

Pagamento recusou **ou** entrega atrasou: um único fio de WhatsApp que sabe o estado dos dois e oferece Pix / novo checkout / reentrega / cancelamento com refund.

- Por que o júri: NOVA já existe sem contexto logístico — o delta é o cérebro Nauta.
- Risco: parecer “mais um chatbot WhatsApp”. Precisa de política e ação (link Yuno, label de carrier).

### H4 — Checkout orquestrado por landed cost e risco de entrega

No checkout, o agente escolhe método (Pix vs 12x vs OXXO) e até se oferece COD, em função de margem após frete, risco de endereço e SLA.

- Por que o júri: smart routing com **features que a Yuno ainda não tem** (sinal logístico).
- Risco: checkout completo em 24h é armadilha de escopo.

### H5 — Agentic commerce LATAM adapter

Agente de compra (OpenAI) completa pedido usando ACP-like flow, mas o payment token cai na Yuno e resolve em Pix/SPEI, não só card US.

- Por que o júri: OpenAI no palco; Yuno fala ACP/AP2 no playbook.
- Risco: spec instável, LATAM não é o happy path do ACP, fácil ficar no teatro de protocolo.

### H6 — Milestone treasury para importador

Pagar fornecedor / duty / freight quando o milestone acontece (customs clear, gate-out), em moeda certa, eventualmente stablecoin no weekend (tese Yuno), com o cérebro Nauta como fonte de verdade do milestone.

- Por que o júri: B2B, $ grande, as duas stacks.
- Risco: compliance KYC de recipients; parece mais “fintech pesada” que demo de 3 minutos.

### H7 — Control tower que paga ou segura o pedido

Pedido e-comm só captura / só libera fulfillment se risco combinado (fraude + endereço + carrier score) passar. Senão: 3DS, Pix, ou hold.

- Por que o júri: decisioning único.
- Risco: overlap com fraud vendors que a Yuno já orquestra; precisa de um ângulo novo (sinal de malha).

## O que **não** fazer (anti-padrões)

1. ChatGPT wrapper em cima da docs da Yuno sem ação.
2. Clone do Payments Concierge ou do 4thena.
3. Otimizador de rota de motoboy sem P&L e sem pagamento.
4. Dashboard bonito sem agente.
5. “Marketplace de tudo” — 24h mata escopo largo.
6. Começar pelo modelo (“vamos usar GPT-5 com voice”) em vez do usuário e da exceção.

## Critério de corte (usar depois das frentes da `07`)

Uma hipótese só segue para o Notion/tese se:

1. Dá para explicar o problema em 20 segundos em inglês
2. Tem $ explícito (approval, chargeback, demurrage, overbilling, stockout)
3. O diagrama mostra **context layer + agent + Yuno e/ou Nauta-shaped data**
4. O demo cabe em 2–3 minutos com mock honesto
5. Não depende de um brief que pode não aparecer — ou deforma fácil para o brief que aparecer (coringa)

## Leitura preliminar (não é decisão)

Se tivéssemos que apostar **hoje**, o cluster A para aprofundar é **H1 + H3** (mesmo esqueleto: estado do pedido × estado do pagamento × WhatsApp/agente × ação Yuno), com **H2** como variante B2B se o brief vier mais Nauta/importer.

H5 fica como **módulo técnico** no repo (OpenAI Agents + Yuno toolkit / payment link), não como produto ACP — ver [research/E](./research/E-agentic-commerce.md). Instant Checkout não é o default 2026.

Uma thread paralela (DeepSeek harness → ideias NextWave) chegou no mesmo cluster **Payment + Logistics** e no Chargeback Agent, mas também sugeriu clones (Routing Agent, Concierge, Uber de carrier). Mapeamento: [09](./09-sintese-harness-e-ideias.md). Frentes A–G em [`research/`](./research/A-yuno-tecnico.md).
