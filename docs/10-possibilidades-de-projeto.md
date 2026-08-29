# 10 — Possibilidades de projeto (menu, não tese)

**Escopo:** o que o time _pode_ construir no NextWave 2026, cruzando `06` + `research/A–G` + `09`.  
**Não é decisão.** Desafios selados até sáb 12:00. O time escolhe **junto no kickoff**.  
**Data:** 22/08/2026.

O esqueleto é o mesmo em todos os projetos viáveis:

```
evento (chargeback | recusa | atraso | invoice)
  → camada de contexto (pedido + pagamento + shipment/contrato)
  → agente (observa → investiga → decide)
  → uma ação em $ (dispute | refund | payment link | hold payout)
  → humano só acima do threshold
```

Yuno já roteia, disputa e recupera. Nauta já age na operação. O vazio é **evidência de fulfillment no trilho de dinheiro** (frente C, G).

---

## Ideação em três perspectivas

Gerado a partir das dores D1–D12 e hipóteses H1–H7. Não são 15 produtos — são ângulos sobre o mesmo loop.

### Product (valor, júri, $)

1. **Evidence Loop (H1)** — chargeback “não recebi” vira PDF `PROOF_OF_DELIVERY` ou refund no trilho certo.
2. **Exception-to-cash (H2)** — invoice de frete × contrato × BOL; só então payout Yuno ao carrier.
3. **Recovery com fulfillment (H3)** — recusa _ou_ atraso no mesmo fio: Pix / novo link / reentrega / cancel+refund.
4. **Milestone treasury (H6)** — pagar duty/freight/fornecedor quando o milestone Nauta dispara.
5. **Split pós-POD (D12)** — seller do marketplace só recebe depois de delivered (ou D+7).

### Design (usuário, artefato, demo)

6. **Pacote de evidência como o produto** — UI mostra reason code → tools → PDF, no padrão 4thena (artefato, não chat).
7. **Um fio WhatsApp que sabe os dois estados** — pedido + pagamento na mesma conversa (delta vs NOVA).
8. **Tela que muda com o reason code** — 10.4 pede 3DS/device; 13.1 pede POD. Pacote errado perde.
9. **Dropdown de cenário no palco** — o júri troca o fixture e vê a decisão mudar.
10. **Banner HITL** — se $ > threshold, o agente para e pede approve (Nauta: age, com guarda).

### Engenharia (24h, ports, Yuno)

11. **Runtime com ports** — Fake default + adapter Yuno (Payment Link / dispute) se a key aparecer.
12. **Classificar depois buscar** — um agente, 6–8 tools, não grafo de 5 agentes.
13. **Três packs pequenos** — payments / risk / logistics; o brief só _corta_ tools.
14. **Refund no trilho certo** — Pix refund ≠ card refund; COD/OXXO não são chargeback.
15. **Scenario engine** — 6–8 fixtures com um `expect` cada (decisão + 1 evidência).

---

## Top 5 para o hackathon

Prioridade = alinhamento ao palco (Yuno × Nauta × OpenAI) × $ explícito × factível em 24h × **não é clone**.

| # | Projeto | $ no pitch | Brief que desbloqueia | 24h | Risco |
| --- | --- | --- | --- | --- | --- |
| **P1** | Evidence Loop (H1) | chargeback INR / 13.1 | intersecção, payments, AI-native | alta | mock de POD precisa ser honesto |
| **P2** | Recovery + fulfillment (H3) | GMV perdido na recusa _e_ no atraso | payments, intersecção | alta | parecer chatbot WhatsApp |
| **P3** | Freight invoice → payout (H2) | overbilling / demurrage | logistics, importer, Nauta-heavy | média | domínio de accessorials |
| **P4** | Hold / release combinado (H7) | false capture / fraude × endereço | payments, fraude | média | overlap com fraud vendors Yuno |
| **P5** | Política cash/voucher/COD (D11) | RTO, despacho antes do pago | methods LATAM, logistics | média | fácil virar regra de if/else sem agente |

**Lean de trabalho (não é voto do time):** aprofundar **P1+P2 no mesmo esqueleto**. P3 se o brief for importador. P4 se for fraude. P5 entra como **fixture**, não como headline.

### P1 — Evidence Loop

Analista de chargeback recebe 13.1 / “item not received”. O agente classifica o reason code, junta tracking + POD + WhatsApp + match de endereço, e: (a) submete `PROOF_OF_DELIVERY` na Dispute API Yuno, ou (b) **não contesta** e faz refund no trilho.

- Por que ficou: intersecção vazia (G); loop fecha em 24h (C); demo filmável.
- Assunções: sandbox emite `payment.chargeback` _ou_ o fake replica o shape; júri aceita POD mock.

### P2 — Recovery com contexto de fulfillment

Pagamento recusou **ou** carrier travou. Um agente oferece Pix / payment link Yuno / reentrega / cancelamento. NOVA já existe sem o cérebro de pedido/entrega.

- Por que ficou: mesmo runtime que P1; Visa 58% é jornada, não só issuer.
- Assunções: dá para mostrar política (não só texto); ação = link Yuno ou label, não “desculpe o atraso”.

### P3 — Exception-to-cash

Agente estilo Alec/Theo: cruza invoice × contrato × BOL, bloqueia overbilling, payout Yuno acima de HITL.

- Por que ficou: Nauta “age, não alerta” + recipients/payouts Yuno.
- Assunções: dataset fake de accessorials convence em 3 minutos.

### P4 — Control tower que paga ou segura

Captura / fulfillment só se risco combinado (fraude + endereço + carrier) passar. Senão: 3DS, Pix, ou hold.

- Por que ficou: decisioning único; ângulo = sinal de malha, não score da Yuno.
- Assunções: o brief não é “faça um fraud graph”.

### P5 — Relógio de método (Pix / boleto / OXXO / COD)

O mesmo `OrderState` com `payment_rail`. OXXO não despacha antes de `confirmed`. COD MX confirma endereço antes da porta.

- Por que ficou: trilhos LATAM (D); diferencia de um agente “só cartão”.
- Assunções: headline fraco sozinho — vive melhor como cenário de P1/P2/P4.

---

## Os outros H — módulo, não produto

| Hipótese | Papel |
| --- | --- |
| **H4** landed cost no checkout | Fixture: se margem < threshold, não oferece 12x. Checkout completo = armadilha de escopo. |
| **H5** agentic commerce / ACP | **Infra:** OpenAI Agents SDK + Yuno Payment Link. Instant Checkout **não** é o default 2026 (`research/E`). |
| **H6** milestone treasury | $ enorme, compliance KYC, demo de 3 min pesada. Só se o brief for B2B importador _e_ o time já tiver P3 no ar. |
| **D9 / D10** | Concierge e 4thena — **não clonar**. |

---

## O que não construir (mesmo se o ChatGPT sugerir)

1. Payment Routing Agent — Smart Routing já é a Yuno.
2. Merchant Ops / Payments Concierge clone.
3. 4thena 2.0 (memória de sales em WhatsApp).
4. Uber de motoboy / marketplace de carrier.
5. Instant Checkout ACP como headline.
6. Grafo multi-agente de fraude.
7. Harness estilo Cordis/OpenHands antes de ter UI + 1 cenário.

---

## Sábado 12:05 — deformar, não reescrever

| Se o brief parecer | Levar para o palco | Cortar |
| --- | --- | --- |
| Payments / fraude / approval | P1 classificando 10.4 vs 13.1, ou P4 | POD como único ângulo se o brief for 10.4 puro |
| Logistics / exception / importer | P3, ou P1/P2 com hold+refund | Otimização de rota |
| AI-native / agentic | Evidence pack (artefato 4thena) no runtime H5 | Protocolo ACP como produto |
| Os dois / OpenAI + Yuno + Nauta | **P1+P2** | Somar P3+P4+P5 no mesmo pitch |

Demo: um cenário, trace de tools, uma ação. Dropdown = segundo cenário se sobrar tempo.

---

## Premissas comuns (validar no floor, não na sexta)

1. Conta Yuno sandbox **não** é self-serve — ports + fake até a key.
2. Nauta **não** tem API pública — logistics sempre fake, shape honesto.
3. Pitch e README em **inglês**.
4. Diagrama de arquitetura é entregável, não slide extra.

Fontes: [06](./06-dores-e-oportunidades.md), [09](./09-sintese-harness-e-ideias.md), [C](./research/C-interseccao-pay-logistics.md), [F](./research/F-jury-e-pitch.md), [G](./research/G-concorrencia.md).
