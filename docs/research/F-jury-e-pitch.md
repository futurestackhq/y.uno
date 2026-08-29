# Frente F — Júri, pitch e diagrama

**Pergunta:** o que o palco cobra, em inglês, em 3 minutos?  
**Data:** 22/08/2026  
**Não há rubrica pública.** Isto é inferência de entregáveis + 4thena + o que a Nauta escreveu sobre arquitetura.

## Quem está na sala (SP + global)

- Host SP: **Walter Campos** (GM Latam Yuno)
- Mentores: engenheiros Yuno + Nauta no floor (architecture review, pitch sharpening)
- CDMX (contexto de júri da org): Valentina Jordan (CEO Nauta) + Mauricio Schwartzmann
- Bogotá 2025: Julián Núñez, Simón Martinez — Yuno
- Final: 4 city champions, SP **abre** o livestream (16:30). Pitch **em inglês**

Luma: julgam _judgment, creativity, execution_, não só código. Inglês B1+.

## O que 4thena ensinou (repetir até enjoar)

Problema: contexto de sales da Yuno em 4 apps.  
Solução: memória consultável + **scoping docs sob demanda**.  
Não: o modelo.  
Entrega: 6 microserviços, 32h, demo.

Nauta, 2026: _start from the messy operation; ship less; it works._ Diagrama de arquitetura **não é formalidade**.

## Estrutura de 3 min (EN)

Timer no ensaio. SP tem 2h de pitches locais (13:00–15:00) para 10 times → ~10 min slot; a **história** tem que caber em 3 e o demo no resto.

1. **Who hurts (20s)** — um cargo + um $ (MED freeze, INR chargeback, demurrage, false decline). Sem tamanho de mercado.
2. **What is broken (20s)** — o sinal existe em N sistemas. 4thena pattern.
3. **What we built (30s)** — agent + context layer + **one action** (submit `PROOF_OF_DELIVERY` / refund / payment link). Não “AI platform”.
4. **Demo (90s)** — um cenário, trace de tools, resultado. Trocar o dropdown = segundo cenário se sobrar tempo.
5. **Why Yuno/Nauta (20s)** — Yuno já roteia/disputa; falta fulfillment evidence. Nauta já age na operação; falta o trilho de $ . _Same runtime, simulated providers, real-shaped APIs._
6. **If we had a week (10s)** — sandbox keys, webhook Intelipost, MED pack. Honestidade > roadmap de 12 meses.

Proibido: clone Concierge/NOVA/Smart Routing; “Uber de motoboy”; 5 agentes em handoff; três protocolos.

## Diagrama (o que mentores vão apontar o dedo)

Tem que responder, num slide:

```
[Event: chargeback | decline | delay]
        → Context layer (order + payment + shipment fixtures)
        → Agent (observe → investigate → decide)
        → Tools → Ports
              ├── FakeProvider (hoje)
              └── Yuno / TMS (sábado se key)
        → Action (PDF dispute | refund | link | hold payout)
        → Human if $ > threshold
```

Checklist:

- [ ] Quem é o usuário (ops, risk, CS) — não “the AI”
- [ ] Onde mora o contexto (não só o LLM)
- [ ] Qual tool muda estado no mundo
- [ ] O que é fake vs real
- [ ] Guardrail

Arquitetura 4thena (vários microserviços) **não** é o alvo. Um app + agent + ports é mais Nauta-2026.

## Entregáveis oficiais (não esquecer no freeze)

1. Presentation
2. Demo live ou vídeo (vídeo = backup de wifi)
3. GitHub **público** + README (a frase da `09`)
4. Architecture diagram

README em inglês. Pitch em inglês. Código pode ser PT nos comentários.

## Ensaio

Sábado 04:00: gravar o vídeo do demo. Domingo 12:00: freeze + export PDF do diagrama. Não editar código no pitch.
