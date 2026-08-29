# Frente C — Intersecção pagamento × fulfillment

**Pergunta:** onde o loop fecha com evidência, não com slogan?  
**Data:** 22/08/2026  
**Conclusão em uma linha:** o loop fechável em 24h é **chargeback INR / “não recebi” → POD → `PROOF_OF_DELIVERY` na API Yuno** (ou refund no trilho certo se a malha realmente falhou). O resto (COD, split, landed cost) entra como cenário, não como produto único.

Time ainda **não escolhe** tese. Esta nota diz o que _pode_ fechar, para qualquer brief.

## Método

Docs Yuno (frente A) + regras de bandeira (Visa/MC 2026) + prática BR (contestação, Intelipost, MELI/MP) + cash/voucher LATAM (OXXO, boleto, COD MX).

## Dois tipos de disputa (não misturar)

| Família | Pergunta do emissor | Evidência que ganha | Código típico |
| --- | --- | --- | --- |
| **Fraude / unauthorized** | O dono do cartão autorizou? | 3DS, device, IP, histórico, CE 3.0 | Visa **10.4**; MC 4837/4863 |
| **Consumer / item not received** | O bem chegou como combinado? | **POD assinado / delivered no endereço**, não só tracking | Visa **13.1**; MC **4855** |

Fontes: [Intelligent Fraud](https://intelligentfraud.com/2026/08/03/chargeback-representment/), [Chargeflow INR](https://www.chargeflow.io/pt-br/chargebacks-101/item-not-received-chargeback), [contestacaodechargeback.com.br](https://contestacaodechargeback.com.br/como-contestar-chargeback).

Kloutit (já na `05`): MX mistura fraude CNP + “recebi e mesmo assim disputei”; CO é endereço/não-entrega; AR é atraso. O agente **primeiro classifica o reason code**, depois busca evidência. Pacote errado (3DS num 13.1, POD num 10.4) perde.

### Compelling Evidence 3.0 (só fraude 10.4)

Visa: 2 transações anteriores incontroversas, 120–365 dias, ≥2 data points em comum (IP, e-mail, endereço, phone/device). **Não** cobre INR. Mastercard tem First-Party Trust (device + delivery + identity) — outro programa.

Para o hackathon: um fixture `fraud_10_4_with_history` e outro `inr_13_1_with_pod`. Não fingir que POD ganha 10.4 sozinho.

### O que “prova de entrega” significa

Chargeflow: tracking **não** basta; precisa status **delivered** (idealmente assinado / foto). Match endereço de entrega × billing/AVS ajuda. Timestamp de pick/pack/ship no OMS.

BR (guia de lojista): AR Correios, NF com confirmação, foto com geo, print de WhatsApp do cliente dizendo que recebeu. Prazo de representment via adquirente: faixa 7–30 dias (não padronizar no pitch).

Yuno: PDF ≤1MB, categoria `PROOF_OF_DELIVERY` + `CUSTOMER_INTERACTION` + `RECEIPT`. Ver frente A.

## Onde o POD mora hoje (status quo = 4thena da operação)

| Sistema | O que existe | O que falta |
| --- | --- | --- |
| **Intelipost** | TMS; anexos no histórico (“Ver anexos”); webhook por macro/micro status (em trânsito, falha, entregue) | Comprovante **não é obrigatório** na integração transportador. Muitos pedidos entregues **sem** PDF |
| **Correios** | AR / rastreio | Lojista caça o PDF na mão |
| **Mercado Pago** | API chargeback: `POST /v1/chargebacks/{id}/documentation` (jpg/png/pdf, 10MB total); `coverage_eligible` + `documentation_required` + prazo | Seller ainda tem que **achar** o comprovante |
| **MELI Log** | Status no pedido | Não é o stack Yuno; merchant híbrido Yuno+MELI é comum |
| **WhatsApp do CS** | “chegou sim, obrigado” | Sem timestamp/arquivo no case da bandeira |

O agente vencedor não “inventa IA de rastreio”. Ele **junta o que já existe em quatro sítios** (mesmo padrão 4thena) e gera o PDF do evidence pack.

Mock crível para o demo (campos mínimos):

```
shipment:
  carrier: "Correios" | "Loggi" | "MELI"
  tracking: "AB123456789BR"
  status: delivered | failed | in_transit | unknown
  delivered_at: ISO
  address_match_billing: bool
  pod:
    type: signature | photo | none
    url: mock
  events: [{at, code, desc}]
order:
  merchant_order_id
  sla_promise
  whatsapp: [{at, from, text}]   # CUSTOMER_INTERACTION
payment:
  yuno_payment_id
  reason_code: "13.1" | "10.4"
  status: IN_DISPUTE
```

Webhooks Intelipost no sábado: **não integrar**. Fixture troca `status` e `pod.type`.

## Três desfechos do agente (H1)

1. **INR + delivered + POD** → monta PDF → `DisputePort.submit(PROOF_OF_DELIVERY)` → estado `PENDING_REVIEW`
2. **INR + never delivered / failed** → **não** contestam; `payments.refund` no trilho (Pix refund ≠ card refund) + mensagem ao shopper
3. **10.4 fraude** → pacote 3DS + device + histórico (CE3 se o fixture tiver 2 txs velhas); POD é apoio, não o núcleo

O valor é a **decisão**. Contestação cega de não-entrega que não chegou é o que o analista humano erra.

## Cash, voucher, COD — outro relógio

Não são chargeback de cartão. São **captura amarrada a um evento fora do PSP**.

| Método | Quando o $ existe | Relação com logística |
| --- | --- | --- |
| **Pix** | Auth instantânea; irrevogável; refund é outro trilho | Atraso → CS/refund, não representment clássico |
| **Boleto** | Emissão ≠ pagamento; default 5–15% (Nexforce) | Não despachar (ou despachar e perder) até webhook pago — política de merchant |
| **OXXO / OXXO Pay** | Voucher; Pay ≈ real-time, OXXO clássico D+1 até 3d úteis (EBANX) | **Não fulfillment antes de `confirmed`** |
| **Pago contra entrega (MX)** | $ na porta; remessa 3–30 dias pelo carrier | Confirmação por telefone **antes** do despacho corta RTO 15–25 pp (Fufills). Carrier = PSP |

Implicação: um único `OrderState` precisa de `payment_rail: card | pix | boleto | oxxo | cod` e regras diferentes. Fixture `oxxo_unpaid_do_not_ship` e `cod_unconfirmed_address` mostram o mesmo agente sem ser o produto inteiro.

Boleto “pago na entrega” no BR varejo é raro vs boleto bancário pré-pago; não forçar no pitch.

## Marketplace split

Yuno: recipients + onboarding + `split_transfer` webhooks. Padrão de plataforma: hold até janela de disputa / POD. Em 24h: um toggle `release_payout_on: pod | d_plus_7 | manual` no fake. Não fazer KYC de recipient no demo.

## Landed cost

Agente Rio da Nauta. No e-comm BR: frete + (se importação) imposto. Checkout que escolhe Pix vs 12x **depois** do landed cost é H4. Para o mock: `landed_cost = sku + freight + duty_est`; se margem < threshold, não oferecer parcelado. Não precisa de calculadora Receita na sexta.

## O que **não** fecha em 24h

- Webhook Intelipost real + todos os carriers
- CE 3.0 com dados de produção
- Representment até o emissor (Yuno encaminha; sandbox provavelmente não “ganha” de verdade)
- COD MX com 3PL real

O júri precisa ver: reason code → tools → PDF/categoria certa → chamada (mesmo fake) ao `DisputePort` **ou** refund.

## Implicação para tese (ainda sem escolher)

| Brief provável        | Loop desta frente                                 |
| --------------------- | ------------------------------------------------- |
| Payments / fraude     | Classificar 10.4 vs 13.1; não usar só risk score  |
| Logistics / exception | POD incompleto + ação (reroute **e** hold/refund) |
| AI-native / agentic   | Evidence pack como artefato (4thena-shaped)       |
| Os dois               | **Este** documento                                |

H1/H3 continuam o esqueleto mais demo-ável; H2 (invoice → payout) é o mesmo padrão com `PROOF` de contrato/BOL em vez de POD.

## Incerto

- Sandbox Yuno emite `payment.chargeback` sintético?
- Qual adquirente LATAM no kit aceita update de disputa?
- Intelipost API de anexo é pública o bastante para citar no diagrama (sim como **sistema do merchant**, não como integração do sábado)
