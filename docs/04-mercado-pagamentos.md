# 04 — Mercado: pagamentos e roteamento (LATAM)

**Escopo:** por que orquestração existe, o que dói na região, quais trilhos importam. Números vêm de fontes mistas (Yuno, Juspay, Cobre, Nexforce, EBANX/PCMI, Pillar). Onde divergem, a faixa fica explícita.

## A tese estrutural

Pagamentos globais **não estão convergindo**. Estão ficando mais locais (Pix, SPEI, PSE/Bre-B, UPI, wallets). Cada país = métodos, regulador, fraude e issuer behavior diferentes. Orquestração é a camada que decide **por transação** qual trilho aprova, custa menos e fricciona menos.

Sem orquestração, o merchant escolhe um gateway e engole a taxa de aprovação daquele adquirente. Com orquestração, a transação vai para o adquirente/rail com maior P(approval) naquele BIN, horário, país e valor — com failover se o trilho cair.

## Tamanho e ritmo (e-comm que puxa payments)

| Claim | Número | Fonte | Confiança |
| --- | --- | --- | --- |
| LATAM e-comm 2024 → 2030 | USD 231B → 376B, CAGR 9% | Yuno Playbook 2026 | Empresa (usar no pitch, triangular) |
| Volume digital commerce LATAM 2025 | ~USD 769B, +12% YoY, rumo a USD 1T em 2027 | Pillar / EBANX–PCMI | Alto para “direção”; definição de “volume” varia |
| Retail e-comm LATAM 2025 | ~USD 191B | eMarketer via Optimum7 | Outra definição (retail vs all digital) |
| Concentração | >90% do volume em BR, MX, CO, AR, CL, PE | EBANX/PCMI | Razoável |
| Brasil + México | >55% do retail e-comm regional | Optimum7 | Razoável |
| Wallets + A2A no e-comm LATAM | 46% do turnover, vs 21% em 2023 | Pillar | Verificar metodologia |
| Pix | 165M users, 63B tx em 2025 (Pillar); 41% e-comm / 46% POS valor (Yuno) | Pillar, Yuno | Dois recortes, mesma direção |
| Mercado Pago TPV | USD 71–84B, +40% YoY (faixa entre matérias) | Pillar / Zacks | Ordem de grandeza |
| Fintechs LATAM | 703 (2017) → 3.069 (2023) | Pillar | Ok |

**Como usar:** no pitch, um número âncora + um número de performance (pontos de approval). Não empilhar três tamanhos de mercado conflitantes.

## O que “smart routing” significa na prática LATAM

### Brasil

Fonte principal independente: [Juspay — Brazil Payment Orchestration](https://juspay.io/en-br/blog/brazil-payment-orchestration-lifting-authorization-rates); complemento [Nexforce](https://nexforce.ai/en/blog/b2b-payment-processing-infrastructure-latin-america).

| Trilho | Aprovação típica (faixa reportada) | Nota |
| --- | --- | --- |
| Pix (SPI) | ~100% auth; irrevogável; sem chargeback clássico de cartão | Performance ainda varia por banco, horário, risco (Yuno) |
| Cartão doméstico + adquirente local | 75–90% | Elo / Visa / MC com issuer local |
| Cartão internacional **sem** acquiring local | 55–70% | O buraco clássico do merchant global |
| Cartão sem orquestração (baseline Juspay) | 71–74% → 84–85% com roteamento local | Lift até ~13 pontos no case |
| Boleto | Emissão ~100%; default 5–15% | Não é auth, é crédito/inadimplência |
| 3DS | Fricção alta e desigual por issuer; Pix bypassa | Yuno: tratar como problema de rota BIN×acquirer |

Roteamento útil no BR: Pix vs cartão vs boleto; cartão por bandeira/BIN para o adquirente certo; 3DS exemption / network token quando o challenge vai falhar.

Fraude: CNP + Pix (social engineering / ATO). Juspay cita modelos globais ruins em identidade sintética BR; CPF, 3DS dinâmico, Pix Biométrico. Perdas Pix ~R$6,5B em 2025 e MED 2.0 (mecanismo de devolução) aparecem na síntese de busca — **validar na frente D** antes de usar no pitch.

### México

- SPEI 24/7 para A2A
- Cash-like ainda importa: OXXO; Yuno cita cash em 34% do POS
- Cartão CNP com fraude e chargeback altos (Kloutit: muitos chargebacks mesmo após receber o pedido; 3DS 2.0 + prova de entrega)
- Cobre: B2B via SPEI performa melhor em horário comercial — routing pode ser **time-of-day**

### Colômbia

- PSE: auth >95% (login bancário)
- Cartão local 70–85%; internacional cross-border 50–70% (Nexforce)
- **Bre-B** lançado out/2025 como equivalente Pix — oportunidade de “local rail novo” no pitch
- Chargebacks frequentemente por **não-entrega / endereço ruim** (Kloutit) → ponte com Nauta

### Argentina

- Wallets (Mercado Pago), cuotas
- Controles de câmbio / refunds internacionais complicados
- Chargebacks puxados por **atraso logístico** (Kloutit)

### Chile

- WebPay, Khipu; consumer protection forte (SERNAC)
- First-attempt delivery mais baixo em alguns recortes (Parcel Perform) — de novo, payments × logistics

## Dois números BR para o pitch (com recorte)

**Abandono no pagamento (Visa Conecta, dez/2025, n=1.521):** entre quem desistiu, **58%** abandonam na etapa de pagamento — 37% na escolha do método, 21% nos dados. Fricção forte: sair da loja para o app do banco no Pix. Fonte: [TI Inside](https://tiinside.com.br/26/02/2026/maioria-das-desistencias-de-compras-online-acontecem-na-hora-do-pagamento-constata-estudo/). Não é “58% dos checkouts falham”.

**Fraude e-comm monitorada (Serasa Experian, 2025):** 2,3 milhões de tentativas **na base das soluções deles**; R$ 2,4 bi de prejuízo **evitado**; ticket fraude ~2× o legítimo (R$ 1.058 vs R$ 539). Inclui suspeita + confirmada + chargeback. Fonte: [sala de imprensa](https://www.serasaexperian.com.br/sala-de-imprensa/prevencao-a-fraude/prevencao-a-fraude-evitou-prejuizos-de-rdollar-24-bilhoes-em-2025-no-e-commerce-brasileiro-aponta-serasa-experian/).

---

## Dores de orquestração (o que um agente pode atacar)

1. **False decline** — cliente de verdade recusado. Yuno: USD 440B global; 40% dos “fraud positives” são falso. Cada ponto de approval em volume enterprise = milhões.
2. **Acquiring errado** — cartão BR/MX passando em adquirente estrangeiro.
3. **3DS que falha** — challenge em issuer ruim; deveria ter ido para outro acquirer, exemption, token ou Pix.
4. **Trilho único** — PSP fora do ar = checkout morto. Failover é tabela-stakes; 2026 pede **preditivo**.
5. **Custo vs conversion** — o trilho mais barato recusa mais. Smart routing da Yuno otimiza os dois juntos.
6. **Retry burro** — retentar no mesmo acquirer no mesmo segundo. Smart retry recupera 20–40% (Yuno).
7. **Ops cega** — queda de approval às 2h da manhã descoberta no dia seguinte (pitch do Concierge).
8. **Recuperação humana lenta** — recusa no checkout e o cliente some. NOVA liga/WhatsApp.
9. **Payout / split / marketplace** — pagar seller, carrier, tax; recipients + onboarding.
10. **Agentic commerce** — agente de compras (ChatGPT etc.) precisa de checkout tokenizado e trilho local. ACP hoje é US-first / Stripe-first; LATAM é gap.

## Agentic commerce (sponsor OpenAI — alta relevância)

- [ACP](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) (OpenAI + Stripe), beta. Checkout sessions + delegated payment token. Merchant of record continua o merchant.
- [Instant Checkout no ChatGPT](https://openai.com/index/buy-it-in-chatgpt/) — depois houve pivot para modelos mais controlados pelo merchant (Checkout.com, 2026).
- Concorrentes de protocolo: Google UCP, AP2 (Adyen/Google), X402, TAP (lista da Yuno).
- Limitação atual reportada: ACP **internacional / LATAM ainda imaturo**; fee ~4% citado em guias US; multi-item cart “coming 2026”.

**Hipótese:** um adapter ACP/agente → Yuno (Pix/SPEI/OXXO em vez de só Stripe card) é exatamente o tipo de ponte que o júri OpenAI + Yuno entende. Risco: brief pode não ser isso; protocolo é superfície grande para 24h. Avaliar na frente E.

## Concorrência de categoria (não copiar, saber o status quo)

Orquestração / smart routing: Primer, Spreedly, Gr4vy, Payoneer/Skyee, Juspay, dLocal, PayU, Adyen (own stack), Stripe (orchestration limitada), Cobre (LATAM B2B), Solidgate.

Status quo do merchant médio LATAM: **um gateway + Mercado Pago + Pix/SPEI nativo**, regras no dashboard, Excel de chargeback. 40% das deals B2B se perdem para “não fazer nada” (April Dunford via skill de competitive analysis) — o inimigo no pitch pode ser a planilha do analista de pagamentos, não a Primer.

## Implicação

Qualquer demo de pagamento no sábado que **não** mostre escolha de trilho / retry / recusa recuperada / anomalia parece 2019. O mínimo bar Yuno é: o agente **explica por que** roteou assim.
