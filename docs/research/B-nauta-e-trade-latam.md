# Frente B — Nauta e trade LATAM (calibra, não escolhe)

**Pergunta:** qual operação e qual $ um mentor Nauta trata como problema de verdade?  
**Data:** 22/08/2026  
**Conclusão em uma linha:** ICP = **importador / distribuidor / manufacturer** (não motoboy). $ que eles citam: detention/demurrage, fill rate, invoice de frete, SKU não container. **Não há API pública.** No hackathon o lado Nauta é **contexto + mock + linguagem**. E-comm last-mile entra se o brief puxar Yuno/shopper; não é o produto Nauta.

O time ainda não escolhe e-comm vs importer. Esta frente deixa os dois vocabulários prontos.

## Método

Site, solutions, cases Windmar e quotes Berrios; busca por API (nada). Trade LATAM: proxies, não primário de porto.

## Quem é o comprador

|  | Nauta | E-comm “Uber de entrega” |
| --- | --- | --- |
| Usuário | Ops / procurement / finance do shipper | Shopper ou last-mile dispatcher |
| Sistema | ERP + TMS + WMS + e-mail | App do motoboy |
| Unidade | **SKU dentro do container**, PO, BOL, free-time | Pedido B2C, rota urbana |
| $ | Demurrage, overbilling, stockout, fill rate, cash-to-cash | Frete last-mile, first-attempt |
| Go-live | < 60 dias, sem data eng | Integração carrier |

Valentina: last mile Rappi no currículo, produto Nauta é **global trade**. Mentores no floor vão cheirar “otimizador de rota Campinas” como off-ICP.

Cases nomeados:

| Case | $ / KPI | Fonte |
| --- | --- | --- |
| **Windmar** (solar, PR/FL, 100 instalações/dia) | Fill rate **74% → 90%**; nunca mais stockout; produtividade **+50%**; 10–15 players → uma plataforma | [Case](https://www.getnauta.com/blog/post/windmar-solar-logistics-transformation-with-nauta) |
| **Berrios / Ashley Furniture** (Milton Ruiz) | Uma empresa = **70%+** do detention/demurrage; renegociar free days | Quote no site Nauta |
| Home goods (anônimo, home) | Volume **+46%** em 2 meses; penalties **−70%** | Home |
| Demurrage (home) | **USD 3M/ano** a menos; −65% manual | Home — metodologia não auditada |
| Nina / free-time | “cut preventable charges **>80%**” | Link no case Windmar; página deep-dive redirecionou à home nesta busca |

ICP entrevista (Silk Road Nexus, v1): USD 200M–2B revenue; pricing por volume de PO.

Anjos/funding: USD 7M (BusinessWire 2025); Simón Borrero citado. Relação Yuno: hackathon + Mauricio/Valentina no mesmo palco CDMX. **Cliente conjunto não confirmado.** Rappi é cliente Yuno e background da CEO — não prova Nauta@Rappi.

## O que os agentes _fazem_ (para o diagrama)

Não alertar. Exemplos que mentores reconhecem:

- **Nina:** free-time no BOL → ação antes do relógio (pickup, clearance)
- **Alec:** documento × contrato; 80% dos delays de shipment = erro de documento, não carrier (claim do teaser “Alec prevents delays”)
- **Theo:** anomalia de freight invoice
- **Rio:** landed cost
- **Derek:** fill rate
- **Marcus:** inventory / stockout weeks ahead

Tese 2026 deles: control tower that **controls**; humano define política.

## API / sandbox

Busca: sem docs de developer, sem MCP, sem Postman. Acesso = demo comercial. **Port `LogisticsPort` só fake** até prova em contrário no sábado.

Mock no idioma deles (importer):

```
container:
  bol, free_time_ends_at, gate_in_at, demurrage_rate_per_day
sku_lines: [{sku, qty, po}]
freight_invoice: [{line, billed, contract_rate, mismatch}]
fill_rate_7d: 0.74
```

Mock e-comm (se o brief for shopper): o da frente C (`shipment` + POD). **Dois fixtures packs, um runtime.**

## Trade LATAM — o que podemos dizer sem inventar

Números Nauta de demurrage são **US importers**. Não achar, nesta leva, série equivalente Santos / Manzanillo / Buenaventura. Para o pitch:

- LATAM e-comm logistics ~USD 35B (2025) e last-mile caro (já na `05`)
- Chargeback não-entrega é o proxy **local** do “sinal logístico que o pagamento não vê”
- Importação BR/MX tem o mesmo padrão (BOL, free-time, aduana) — qualitativo, sem USD 15.4B colado em Santos

Se o brief for Nauta-puro: usar Windmar/Berrios. Se for Yuno-puro: não forçar demurrage.

## Relação com as hipóteses (ainda menu)

| Hipótese | Mentor Nauta reage |
| --- | --- |
| H1 POD → disputa | “contexto operacional no pagamento” — sim, mesmo se ICP for e-comm |
| H2 invoice → payout | **Língua nativa** (Theo/Alec + Yuno payouts) |
| H3 recovery + shipment | Exceção → ação; canal WhatsApp que eles já usam |
| H4 landed cost checkout | Rio; mais e-comm |
| H6 milestone treasury | Cash-to-cash 15–22 dias (claim distributors page) |
| Uber carrier | **Não** |

## Implicação

Não precisamos que o time escolha agora. Precisamos de:

- Vocabulário Nauta no README/diagrama (context layer, exception→action, $ no P&L)
- Fixtures **A** e-comm e **B** importer
- Zero dependência de API Nauta

## Incerto

- Nauta mentora com dataset de exemplo no sábado?
- Case “USD 3M demurrage” — quem é o cliente?
- Integração formal Yuno–Nauta além do evento
