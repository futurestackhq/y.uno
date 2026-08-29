# 07 — Plano de pesquisa (antes de Notion e repo)

**Gate:** Notion de tese e repo ainda fechados. Frentes **A–G** têm markdown. Time sem produto até o kickoff.

## O que já está fechado

- Pacote v1 (`01`–`09`)
- **A** [`research/A-yuno-tecnico.md`](./research/A-yuno-tecnico.md) — sandbox, Payment Link, webhooks, `PROOF_OF_DELIVERY`
- **B** [`research/B-nauta-e-trade-latam.md`](./research/B-nauta-e-trade-latam.md) — ICP importer, zero API
- **C** [`research/C-interseccao-pay-logistics.md`](./research/C-interseccao-pay-logistics.md) — 10.4 vs 13.1, POD
- **D** [`research/D-trilhos-latam.md`](./research/D-trilhos-latam.md) — 3 fatos de pitch (MED 2.0, local vs XB, abandono/INR)
- **E** [`research/E-agentic-commerce.md`](./research/E-agentic-commerce.md) — ACP não é o produto; Agents SDK + Yuno link
- **F** [`research/F-jury-e-pitch.md`](./research/F-jury-e-pitch.md) — 3 min EN + diagrama
- **G** [`research/G-concorrencia.md`](./research/G-concorrencia.md) — status quo; vazio na intersecção

## O que ainda **não** está fechado

- Tese única do time
- Qual hipótese sobrevive a um brief selado
- Stack exata do coringa
- Texto para Notion

## Como trabalhar

Cada frente gera **um markdown em `docs/research/`** com: pergunta, método, evidências (URL + citação), conclusão, implicação para tese/repo, e o que continua incerto.

Prioridade: **P0 desta semana** (hackathon é 28–30/08; hoje 22/08). Inscrição/aceite é operacional, não pesquisa — mas é bloqueante.

---

## P0 — Operacional (não é research, é checklist)

- [ ] Time de 4 confirmado, **mesmo team name** no Luma
- [ ] Aceite por e-mail (Luma SP já aparecia closed em 22/08)
- [ ] Inglês B1+ no pitch (ensaiar 3 min)
- [ ] Quem apresenta em inglês; quem demo; quem diagrama

Dono: o time. Eu ajudo a redigir se pedirem.

---

## Frente A — Yuno técnico (hackability em 24h)

**Pergunta:** o que dá para plugar de verdade no sábado vs o que é slideware?

**Buscar / ler**

- [docs.y.uno/llms.txt](https://docs.y.uno/llms.txt) (índice completo)
- Checkout Lite vs Embedded vs Direct API
- Webhooks: payment, decline, 3DS, refund, chargeback/dispute
- Sandbox self-serve vs sales-gated
- `@yuno-payments/yuno-mcp` e `@yuno-payments/agent-toolkit` — versões, auth, se funciona sem account real
- Recipients / payouts / installment plans (H2, H6, H12)
- NOVA e Concierge: dá para demo ou só mencionar?
- Playbook PDF 2026 se baixar (números primários)

**Output:** `docs/research/A-yuno-tecnico.md`  
**Implicação:** decide o esqueleto do repo (Next + Agents SDK + toolkit vs mocks).

---

## Frente B — Nauta em profundidade + dados LATAM de trade

**Pergunta:** qual operação e qual $ um mentor Nauta considera “problema de verdade”?

**Buscar / ler**

- Cases no site (demurrage, fill rate, home goods)
- Entrevista Valentina (Silk Road Nexus) + round de USD 7M
- Blog Inventory Engine + AI in Supply Chain 2026
- Proxies LATAM: demurrage Santos / Manzanillo / Buenaventura; invoice fraud; lead time
- Existe API, webhook, export, ou só demo fechada?
- Relação Yuno–Nauta além do evento (clientes em comum? Rappi?)

**Output:** `docs/research/B-nauta-e-trade-latam.md`  
**Implicação:** calibra H2/H5/H6 vs H1/H3 (e-comm vs importer).

---

## Frente C — Intersecção pagamento × fulfillment (a tese)

**Pergunta:** onde o loop fecha com evidência, não com slogan?

**Buscar / ler**

- Fluxos de chargeback Visa/MC + regras BR/MX (chargeback representment)
- POD de Correios, MELI, Intelipost — o que um mock precisa ter para ser crível
- COD / boleto / OXXO: captura vs baixa de entrega
- Marketplace split: hold period
- Landed cost: calculadoras públicas, duty BR (imposto importação e-comm)

**Output:** `docs/research/C-interseccao-pay-logistics.md`  
**Implicação:** mata ou promove H1, H3, H4, H7.

---

## Frente D — Trilhos e fraude por país (BR âncora, MX/CO/AR de contexto)

**Pergunta:** quais 3 fatos inatacáveis entram no pitch em inglês?

**Buscar / ler**

- Pix: MED 2.0, Pix automático, Pix biométrico — o que é real em ago/2026
- Bre-B Colômbia: status
- Approval rates por adquirente BR (números além da Juspay)
- Chargeback ratios por país (fontes primárias: redes, BC, CNP)
- 3DS exemption rules locais

**Output:** `docs/research/D-trilhos-latam.md`  
**Implicação:** vocabulário de roteamento no demo (não inventar BIN magic).

---

## Frente E — Agentic commerce e stack OpenAI

**Pergunta:** o que o sponsor espera ver, sem virar um tutorial de protocolo?

**Buscar / ler**

- ACP spec 2026-04-17 (checkout + delegate_payment)
- OpenAI Agents SDK + ChatGPT Apps / merchant-controlled checkout (pivot 2026)
- Como Yuno Agent Toolkit encaixa no Agents SDK (já há adapter)
- X402 / AP2 / UCP — só o suficiente para não parecer desatualizado
- Limites LATAM (ACP US-first)

**Output:** `docs/research/E-agentic-commerce.md`  
**Implicação:** H5 como produto vs só como infra do coringa.

---

## Frente F — Júri, pitch e o que “arquitetura” significa aqui

**Pergunta:** como 4thena ganhou na prática, e o que mudou com Nauta no floor?

**Buscar / ler**

- Posts LinkedIn do time UNjavaHater / Yuno sobre NextGen
- Quem julga em SP (Walter Campos + ?) e na final global
- Rubrica se existir em T&Cs / Luma
- Exemplos de architecture diagrams que mentores de supply chain respeitam (control tower vs agent graph)

**Output:** `docs/research/F-jury-e-pitch.md`  
**Implicação:** template de pitch de 3 min + checklist do diagrama (vai para o Notion).

---

## Frente G — Competitive set curto (para posicionar, não para copiar)

**Pergunta:** se o produto existisse, contra o que o comprador compararia?

**Yuno-lado:** Primer, Spreedly, Juspay, dLocal, PayU, Adyen  
**Nauta-lado:** project44, FourKites, Flexport, Intelipost, “Excel + WhatsApp”  
**Intersecção:** quase vazio — esse vazio é o pitch se H1–H4 se sustentarem.

**Output:** `docs/research/G-concorrencia.md` (1–2 páginas, não war card de 40 linhas)

---

## Frente H — Runtime do coringa (o que a thread de harness realmente destrava)

**Pergunta:** qual é o menor harness que ainda deixa trocar o brief às 12:00 sem reescrever o app?

Já decidido na [09](./09-sintese-harness-e-ideias.md): OpenAI Agents SDK + ports + fake fixtures; **não** Cordis; **não** multi-agent graph; Yuno adapter se a key existir.

**Ainda falta (quando formos ao repo, depois do gate):**

- Confirmar `ToolLoopAgent` vs Agents SDK no toolkit Yuno (os dois adapters existem)
- 6–8 fixtures da lista da `09`
- UI mínima: escolher cenário → ver trace → ver ação
- Uma política HITL (approve acima de threshold) — o `lead-agent` da Vercel é a referência, não o produto

**Output:** entra no desenho do repo, não em mais um PDF. Esta frente **não** começa agora.

---

## Ordem sugerida (nós dois)

Pesquisa das frentes **A–G fechada**.

Próximo: **documento de estudo para o time** (markdown `10` e/ou Notion — ainda sem aposta de produto) **ou** **repo coringa** (agent + ports + fixtures). Sem escolher H1 vs H2.

## O que eu faço na próxima mensagem sua

O briefing do time ou o scaffold. Diz qual.
