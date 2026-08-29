# 05 — Mercado: logística e e-commerce (LATAM)

**Escopo:** dores de fulfillment, last mile, importação e a ponte com pagamento/chargeback. A Nauta vende sobretudo para **importador/distribuidor**, não para o app de motoboy — mas o hackathon mistura as duas lentes (e-comm + supply chain).

## Tamanho

| Claim | Número | Fonte | Nota |
| --- | --- | --- | --- |
| E-comm logistics LATAM 2025 | USD 34.7B → 91.9B em 2035, CAGR 10.3% | OMR Global | Mercado de **logística de e-comm**, não GMV |
| Custo logístico como % do preço | 15–20% na região vs single-digit em cadeias otimizadas | Verified Market Research | Ordem de grandeza útil |
| Last mile | frequentemente ≥50% do custo de delivery do parcel | VMR | Padrão global, agravado na LATAM |
| Demurrage/detention US (5 anos) | USD 15.4B | Nauta home | US-centric; achar proxy Santos/Manzanillo na frente B |

Crescimento de e-comm (ver `04`) empurra last mile, warehousing, cross-border e returns. A infraestrutura não acompanhou.

## Dores recorrentes (e-comm / last mile)

Síntese: [Parcel Perform](https://www.parcelperform.com/insights/latin-americas-e-commerce-delivery-success), VMR, OMR, Optimum7, Kloutit.

1. **Endereço ruim / sem geocoding** — tentativas múltiplas, “não-entrega”, chargeback. Colômbia é o case clássico.
2. **Congestão urbana** — SP, CDMX, Bogotá concentram demanda e atrasam SLA.
3. **Interior / rural** — multimodal, mais caro, mais lento; expectativa do consumidor é next-day (Mercado Libre / Amazon).
4. **First-attempt fail** — Parcel Perform: Chile com first-attempt ~85.7% (pior entre o recorte citado). Cada reentrega come margem.
5. **Reverse logistics imatura** — devolver cross-border pode custar mais que o SKU; política de troca ruim derruba conversão.
6. **Roubo de carga** — custo de seguro e rota.
7. **Aduana / regulação por país** — não existe “LATAM shipping”; existe BR + MX + CO + …
8. **Cash / contraentrega** — ainda relevante onde cartão/Pix não pegou (MX OXXO, partes da região). COD mistura logística e pagamento: o entregador é o PSP.
9. **Expectativa vs rede** — same-day nas capitais vs 5–10 dias no interior. SLA mentiroso gera disputa.
10. **Mercado Libre como infra** — fulfillment + Mercado Pago + ads. O “status quo” do seller pequeno não é SAP, é o ecossistema MELI.

## Dores recorrentes (importação / supply chain — língua Nauta)

Estas são as que mentores Nauta vão reconhecer:

1. **Sistemas que não se falam** — ERP ≠ TMS ≠ WMS ≠ e-mail do forwarding. O free-time do container está no BOL e mesmo assim paga-se detention.
2. **Exceção sem dono** — atraso no porto, SKU crítico, fornecedor slip: alerta chega, ninguém age.
3. **Invoice de frete suja** — 39% com erro; 3–7% de overbilling se auditar linha a linha (Nauta). Pagar o carrier sem o agente de compliance é queimar margem.
4. **Stockout vs overstock** — 7.4% de venda perdida no stockout (Nauta); working capital preso no overstock. Precisa de dado **SKU**, não container.
5. **Landed cost opaco** — produto + frete + duty + FX + last mile. Sem isso, pricing e checkout mentem.
6. **Cash cycle** — pagar fornecedor / tax / demurrage no pior dia do calendário, não no milestone real (gate-in, customs clear, delivered).
7. **Conhecimento tribal** — “esse fornecedor sempre atrasa em agosto” mora na cabeça de uma pessoa. Agente off-the-shelf não sabe.
8. **Fill rate** — case Nauta 74% → 90%. Em B2B, fill rate é o NPS do comprador.

## A ponte pagamento ↔ logística (a mais importante desta nota)

Chargebacks em LATAM **não são só fraude de cartão**. Kloutit, por país:

| País | Padrão de disputa | Mitigação clássica |
| --- | --- | --- |
| México | Fraude CNP + chargeback mesmo após receber | 3DS 2.0 + prova de entrega (foto/assinatura) |
| Colômbia | “Não recebi” / endereço | Verificar endereço no checkout + WhatsApp pós-compra |
| Argentina | Atraso logístico | SLA honesto + carrier local |
| Chile | Consumer protection | Evidência e processo |

Ou seja: **o analista de chargeback da Yuno precisa do POD (proof of delivery) da operação**. Isso hoje é e-mail, PDF, print do Correios/MELI. É o mesmo anti-padrão que o 4thena atacou no sales (sinal espalhado em quatro chats).

Outras pontes:

- **COD / boleto / OXXO** — o “pagamento” acontece na malha. Falha de entrega = falha de captura.
- **Parcelamento + atraso** — cliente recusa a parcela porque o SKU não chegou; recovery (NOVA) sem contexto logístico é tom surdo.
- **Split de payout** — marketplace precisa pagar seller só depois de janela de disputa / confirmação de entrega.
- **Cross-border refund** — AR/FX: estornar no trilho certo (Yuno) quando a logística falha.
- **Landed cost no checkout** — mostrar total real e ofertar Pix vs 12x de acordo com margem após frete.

## Players de contexto (status quo)

- Marketplaces: Mercado Libre, Amazon MX/BR, Shopee, Magalu
- Last mile / full: MELI Log, Correios, Loggi, Rappi (quick commerce), 99, carriers locais
- TMS/WMS/ERP: SAP, Oracle, TOTVS, tiny/bling no SMB, Kunaike, Intelipost (BR shipping os)
- Visibilidade global: project44, FourKites, Flexport (mais US/EU)
- Exception management clássico: “control tower” que só alerta

Nauta compete menos com Loggi e mais com **Excel + e-mail + control tower burra**. No pitch, o inimigo é o WhatsApp do operador e a planilha de detention, não o Flexport.

## Implicação

Um projeto “logística” vencedor no NextWave provavelmente:

- fala em **$ no P&L** (demurrage, chargeback, stockout, overbilling), não em “visibilidade”
- tem **agente que executa** com guardrail (pagar, re-rotear, abrir disputa, avisar o shopper)
- usa contexto (SKU, BOL, POD, contrato) — mesmo que mock
- se possível, fecha o loop com um trilho Yuno (captura, payout, refund, evidence)
