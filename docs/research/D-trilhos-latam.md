# Frente D — Trilhos e fraude LATAM (3 fatos de pitch)

**Pergunta:** quais 3 fatos inatacáveis entram no pitch em inglês?  
**Data:** 22/08/2026  
**Conclusão:** usar **no máximo três** números, com recorte. O resto é vocabulário de roteamento (não inventar BIN magic).

## Os 3 fatos (recomendados)

### 1. Pix não é “sem risco” para o merchant

Payer: instantâneo e, no arranjo, **sem chargeback de cartão**.  
Recebedor (ago/2026): **MED 2.0** obrigatório para participantes do Pix desde **2 fev 2026** (Res. BCB 493/2025; operação facultativa desde nov/2025; fiscalização plena após janela até mai/2026). Rastreia até **5 camadas** de contas; bloqueio cautelar **antes** da apuração de boa-fé; contestação digital. Fontes: [Valor](https://valor.globo.com/financas/noticia/2026/02/02/mecanismo-de-devolucao-do-pix-que-amplia-rastreio-de-fraudes-passa-a-ser-obrigatorio-a-partir-de-hoje.ghtml), [TafelliRitz](https://tafelliritz.com.br/blog/med-2-0-e-bloqueio-cautelar-do-pix-o-que-sua-empresa-precisa-saber-para-nao-ter-recebiveis-retidos-pelo-banco/).

**Frase:** _Pix is irrevocable for the payer. It is not automatically safe for the merchant — MED 2.0 can freeze receivables down the chain._

Implicação de produto: evidência comercial (pedido, POD, NF) não é só cartão. É defesa de **recebível Pix**.

### 2. Cartão LATAM cross-border perde de doméstico por dezenas de pontos

- EBANX _Beyond Borders 2025_ (via [Nexforce](https://nexforce.ai/blog/pagamentos-cross-border-guia-saas-b2b)): cartões emitidos na AL em tx **cross-border** = aprovação **30–50% abaixo** da doméstica; emissores BR/MX/CO bloqueiam internacional por default.
- Mesma fonte, modelo: gateway intl puro **50–70%** vs adquirente local **85–95%**.
- [Juspay BR](https://juspay.io/en-br/blog/brazil-payment-orchestration-lifting-authorization-rates): baseline **71–74%** → **84–85%** com roteamento a adquirente local (~13 pts no case).
- Yuno Playbook: orquestração multi-rail **+5–8 pts** (rede deles).

**No slide:** um só. Preferir Juspay (case BR, números estreitos) **ou** “local vs cross-border 50–70 vs 85–95” (EBANX via Nexforce). Não somar os dois.

**Frase:** _A Brazilian card on a foreign acquirer is a different product from Pix or local acquiring._

### 3. O abandono e a disputa moram no checkout / na entrega — não no “score”

- Visa Conecta (n=1.521, dez/2025): **58% dos que desistiram** caem na etapa de pagamento (37% método, 21% dados); fricção Pix = sair da loja. Já na `04`.
- Serasa 2025 (base **deles**): 2,3M tentativas; R$ 2,4 bi evitados; ticket fraude ~2×. Já na `04`.
- Chargeback por país: **causa** (Kloutit) é mais seguro que **taxa**. Dataset Chargeback.io com BR **3,48%** / MX **2,81%** — vendor, não citar como “taxa nacional” sem recorte.

**Frase:** _Most drop-off is method choice and data entry, not ‘the model said fraud.’ Most INR disputes are a logistics evidence problem._

---

## Vocabulário por país (para o agente, não para o slide)

| País | Trilho A2A | Cartão | Cash/voucher | Nota 2026 |
| --- | --- | --- | --- | --- |
| **BR** | Pix (SPI); Pix Automático obrigatório nas IFs desde out/2025, contratos antigos até jan/2026 ([G1](https://g1.globo.com/economia/noticia/2025/10/13/pix-automatico-passa-a-ser-obrigatorio-a-partir-desta-segunda-feira-13-veja-perguntas-e-respostas-sobre-a-modalidade-de-pagamento.ghtml)) | Elo + Visa/MC; 3DS por MCC (ABECS Normativo 31) — pisos, não “3DS em tudo” | Boleto | **Pix biométrico não é lei.** PL 5132/2025. Alguns bancos oferecem produto. Não falar “obrigatório” |
| **MX** | SPEI 24/7 | CNP fraude alta | OXXO / OXXO Pay | Cash 34% POS (Yuno) |
| **CO** | **Bre-B live 6 out 2025** (BanRep); PSE ainda existe | Local vs XB | — | Não dizer “upcoming”. [BanRep](https://www.banrep.gov.co/es/noticias/bre-b-continua-avanzando) |
| **AR** | Transferencias 3.0 | Wallets / cuotas | — | Chargeback puxado por atraso + FX no refund |

Pix: `PENDING` até webhook; fechar UI ≠ cancelar (frente A).

3DS BR: [ABECS 31](https://abecs.org.br/storage/pages/01JD7E67FB06D15HTVB65V0DTE.pdf) — obrigatório **acima de pisos por MCC**; abaixo é faculdade; exceções (recorrente, corp) via credenciadora. Yuno: 3DS na LATAM é em grande parte **problema de rota BIN×acquirer**; Pix **bypassa** 3DS. TRA/low-value são linguagem de PSD2/EU — no BR usar ABECS + “exemption o adquirente aceitar”, não copiar €30.

## O que **não** falar no palco

- “Pix 100% approval, zero fraud” (MED 2.0 + golpes sociais)
- “Bre-B vai lançar”
- “Pix biométrico já é regra do BC”
- Taxa de chargeback 3,48% sem dizer a fonte
- Três tamanhos de mercado e-comm no mesmo slide (`08`)

## Implicação para o coringa

Fixtures que ensinam trilho:

- `card_xb_declined_pix_recovers`
- `pix_pending_then_succeeded`
- `pix_med_freeze_need_evidence` (merchant, não payer)
- `3ds_challenge_fail_route_other_acquirer` (só se tiverem sandbox)
- `breb_or_spei_async` (rótulo, mesmo mock que Pix)

O agente deve **nomear o trilho** na explicação. Isso é Smart Routing em linguagem humana — sem reimplementar o motor da Yuno.
