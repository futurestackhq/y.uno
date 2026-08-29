# Frente G — Competitive set (curto)

**Pergunta:** se o produto existisse, contra o que o comprador compararia?  
**Data:** 22/08/2026  
**Uso:** uma frase no pitch, não war card. Status quo > concorrente startup.

## Yuno — orquestração

Yuno **não é adquirente** (neutralidade de roteamento — claim deles). Comprador enterprise compara:

| Alternativa | O que é | Onde perde / ganha vs Yuno |
| --- | --- | --- |
| **Não fazer nada** / um PSP | Stripe, Adyen, Mercado Pago só | 40% B2B “no decision”; approval XB ruim |
| **dLocal / EBANX / PayU** | PSP + métodos locais; orquestração limitada | Forte LATAM; lock-in no rail deles |
| **Juspay** | Orquestração, forte BR | Concorrente direto no discurso de approval |
| **Primer / Spreedly / Gr4vy** | Orquestração global, no-code/API | Primer ataca Yuno como “LATAM-first, menos maduro global” ([primer.io](https://primer.io/blog/yuno-alternatives)) |
| **Adyen / Stripe** | Stack próprio | Não orquestra o vizinho |

Pitch: não “somos melhores que a Primer”. _We’re not replacing Yuno’s router. We’re giving it fulfillment evidence it doesn’t have._

## Nauta — cérebro operacional

| Alternativa | O que o operador faz hoje |
| --- | --- |
| **Excel + e-mail + WhatsApp** | Status quo. Mentores Nauta vivem isso |
| project44 / FourKites | Visibilidade de transporte; alerta, pouco SKU/procurement |
| Flexport / 3PL portals | Um silo |
| Intelipost / Correios | Last-mile BR; POD incompleto (frente C) |
| Control tower clássico | Dashboard sem ação |

Pitch Nauta: _Not another alert. An evidence pack / a payout / a refund._

## A intersecção

Chargeback automation (Chargeflow, Disputeboss, Klarna-ish): evidência de **pagamento + 3DS**, fraco em TMS BR.  
WMS/TMS: evidência de **entrega**, zero disputa Yuno.  
**Quase ninguém junta reason code 13.1 + Intelipost-shaped POD + `POST .../dispute`.** Esse vazio é a frase. Não precisa de logo de concorrente.

Importer H2: freight audit (nShift, audit shops) × payouts Yuno — mesmo vazio.

## Como usar sábado 12:05

Ler o brief. Se for routing: posicionar contra **regras estáticas / um PSP**, não contra Smart Routing. Se for logistics: contra **alerta**. Se for os dois: esta nota.
