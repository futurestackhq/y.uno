# 03 — Nauta (supply chain / logística / agentes operacionais)

**Escopo:** o que a Nauta é, a tese de produto, e por que ela está no mesmo hackathon que uma empresa de pagamentos.

## O que é

Nauta se posiciona como **the operational brain for global trade**: uma camada de dados + agentes em cima de ERP, TMS e WMS. Não substitui esses sistemas. Unifica e-mails, planilhas, portais de fornecedor e sistemas enterprise numa camada “AI-ready”, e coloca agentes para **agir**, não só alertar.

Site: [getnauta.com](https://www.getnauta.com/)

Fundação: 2025. HQ EUA, presença em Porto Rico, time distribuído (Colômbia, EUA, Argentina, México, Uruguai — LinkedIn da CEO). CEO e co-founder: **Valentina Jordan** (ex-produto/engenharia em last mile na Rappi). Co-founder: **Rafael Santiago** (operação de importação no Caribe).

Funding: **USD 7M** reportado (BusinessWire, ago/2025), com anjos citados incluindo Simón Borrero (Rappi). Confirmar detalhes na frente B.

ICP declarado (entrevista Silk Road Nexus): wholesalers, distributors, manufacturers, traders; empresas ~USD 200M–2B de receita; pricing por volume de pedidos.

Valentina é **host da sede CDMX** junto com Mauricio Schwartzmann. Engenheiros Nauta mentorizam **nas quatro cidades**.

## Tese em uma frase (a mais importante do hackathon)

> Anyone can buy an agent. What an agent is worth depends entirely on the context underneath it.

E:

> Agents act. Humans decide. The layer in between is the hard part, and it is the part that gets skipped.

Isso é quase um briefing do júri. Projetos que começam no modelo e ignoram o contexto operacional vão levar feedback duro no floor.

## O problema que eles vendem contra

Não é “falta de visibilidade”. É **falta de execução**. Os números da home (claims da Nauta; origem da metodologia não auditada por nós):

| Dor | Número na home |
| --- | --- |
| Demurrage & detention pagos por importadores US em 5 anos | USD 15.4B — com free-time escrito no próprio BOL |
| Invoices com pelo menos um erro | 39% — detectável cruzando linha a linha com PO e BOL |
| Freight overbilling recuperável com audit linha a linha (não sample) | 3–7% do freight spend |
| Vendas perdidas em stockout | 7.4% |

Outros claims de case (home, sem detalhe metodológico nesta v1):

- USD 3M a menos de demurrage / ano; −65% trabalho manual
- Fill rate 74% → 90% (renewable energy)
- Volume +46% em dois meses, penalties −70% (home goods retail)

Go-live declarado: **< 60 dias**, sem time de data engineering.

## Como o produto se organiza

1. Ingere tudo: docs, e-mails, ações, rotinas, ERP/TMS/WMS, portais
2. Vira **um cérebro** (contexto da operação: quais fornecedores escorregam, quais lanes falham em agosto, qual exceção merece ligação)
3. Agentes rodam 24/7 **dentro** desse contexto
4. Falam nos canais que o time já usa: Slack, Teams, WhatsApp, SMS, voz, e-mail

### Workforce de agentes (nomes da home)

Não é um agente genérico. É uma **fábrica de agentes por problema**:

**Procurement / supplier:** Lauren (supplier reliability), Vera (price drift), Alec (contract compliance), Nora (backup activation), Lex (expedite communication), Cole (MOQ optimization), Sage (supplier onboarding)

**Inventory / demand:** Marcus (inventory watch), Ivy (seasonal prep), Axel (demand signal), Zara (forecast accuracy), Kai (overstock), Rio (landed cost), Derek (fill rate)

**Logistics / freight:** Nina (shipment watch), Rex (root cause), Blake (carrier score), Theo (freight anomaly), Quinn (consolidation), Tess (mode mix)

Inventory Optimization Engine (blog): dados no nível de **SKU**, não de container. Tese: o que importa não é “onde está o container”, é **o que tem dentro**.

Blog 2026: [AI in Supply Chain 2026](https://www.getnauta.com/blog/post/ai-in-supply-chain-2026-why-the-real-transformation-is-still-ahead-of-us) — agentes que monitoram, propõem e às vezes executam (re-rotear, re-bookar, re-ordenar) com guardrails humanos. “Control tower that actually controls.”

## Por que Yuno × Nauta no mesmo evento

Não é patrocínio aleatório. As duas empresas vendem a **mesma arquitetura mental** em indústrias diferentes:

|  | Yuno | Nauta |
| --- | --- | --- |
| Camada suja | PSPs, adquirentes, métodos, fraude, bancos | ERP, TMS, WMS, e-mail, planilha, portal |
| Dor | Fragmentação → approval baixo, custo alto, fraude | Fragmentação → demurrage, stockout, invoice errada |
| Produto | Orquestração + agentes | Cérebro operacional + agentes |
| Canal do agente | Slack / WhatsApp / voz | Slack / Teams / WhatsApp / voz |
| Inimigo | “Mais uma integração” / regras estáticas | “Mais um alerta” / agente sem contexto |
| Dinheiro | Pontos de approval, retry, false decline | Demurrage, overbilling, fill rate, cash |

A intersecção natural (hipótese nossa, aprofundar na `06` e frente C):

- **Cash conversion cycle do importador:** quando pagar o fornecedor / o frete em função de milestone logístico
- **Landed cost no checkout:** frete + duty + FX + método de pagamento
- **Chargeback de não-entrega:** prova logística alimentando disputa de pagamento
- **COD / contraentrega / boleto:** pagamento amarrado a tentativa de entrega
- **Freight audit → payout:** 39% de invoice errada antes de pagar o carrier
- **Exceção única:** atraso de container + falha de pagamento + stockout no mesmo thread de WhatsApp

Rappi aparece nos dois mundos (cliente Yuno; Valentina veio de last mile Rappi). Não é prova de integração conjunta, mas o ecossistema se toca.

## O que a Nauta **não** é (ainda)

- Não encontramos API pública / MCP / sandbox de developer equivalente ao da Yuno. Para o hackathon, o lado Nauta provavelmente é **dados mock + tese**, não SDK oficial.
- Não é last-mile B2C tipo Loggi/Rappi hoje: o ICP é **importador / distribuidor / manufacturer**, não o app de entrega do consumidor. Um projeto só de “otimizar rota de motoboy em SP” pode ficar longe do produto real deles — a menos que o brief puxe para e-comm.
- Pricing não público (custom pós-demo).

## Implicação para o time

- Mentores Nauta no floor vão perguntar: **quem usa, qual exceção, qual $ no P&L, o agente age ou só fala?**
- Diagrama de arquitetura precisa mostrar a **camada de contexto**, não só o LLM.
- Se o brief for Yuno-puro, ainda assim usar a linguagem Nauta (“context layer”, “exception → action”) diferencia o pitch.
- Se o brief for Nauta-puro, Yuno entra como trilho de **pagar / receber / disputar** quando a operação move.

## Buracos desta nota (frente B)

- Cases com números auditáveis
- Stack técnico real (warehouse, ontologia SKU, como o agente executa no ERP)
- Relação formal Yuno–Nauta além do hackathon
- Dados públicos de importação LATAM (demurrage em Santos/Manzanillo, etc.) vs claims US-centric da home
- Se existe qualquer API / webhook / export que um prototype possa fingir com fidelidade
