# 01 — Contexto do NextWave Hackathon 2026

**Escopo desta nota:** o que o evento é, o que o júri espera, o que já ganhou, e o que isso implica para o time. Não é tese de produto.

## O evento em uma frase

Maratona de 24h, 4 cidades em paralelo, times de 4, desafios reais de **pagamentos + logística + IA nativa**, co-organizada por Yuno e Nauta, com OpenAI no palco e na API.

Fontes: [nextwavehackathon.tools.y.uno](https://nextwavehackathon.tools.y.uno/), [Nauta — NextWave 2026](https://www.getnauta.com/blog/post/nextwave-hackathon-2026-latam).

## Ficha

| Item | Dado | Fonte |
| --- | --- | --- |
| Nome | NextWave Hackathon 2026 (2ª edição; 1ª foi Bogotá, dez/2025) | Site oficial, Nauta |
| Quando | 28–30 ago 2026 (sexta abertura; sáb–dom competição) | Site + blog Nauta |
| Onde | Bogotá, CDMX, Buenos Aires, **São Paulo** | Site |
| Host SP | Walter Campos (GM Latam, Yuno) | Site, Brasil Inovador |
| Escala | 10 times × 4 cidades = 40 times / 160 pessoas | Site |
| Time | 4 pessoas, travado | Site, Luma |
| Idioma oficial | Materiais e **pitch em inglês**. Trabalho interno no idioma que quiserem | FAQ do site |
| Custo | Grátis; refeições cobertas; ChatGPT + API OpenAI no fim de semana | Site |
| Apoio | OpenAI, Tec de Monterrey, UTDT, ECBR | Nauta |
| Premiação global | USD 25k (cash + créditos OpenAI) | Site |

## Premiação

Valores do site oficial (pool USD 25k):

| Rank | Total | Cash | Créditos OpenAI | Por pessoa (como o site apresenta) |
| --- | --- | --- | --- | --- |
| 1º | USD 12.000 | 7.000 | 5.000 | USD 3.000 / crew member |
| 2º | USD 8.000 | 5.500 | 2.500 | USD 2.000 |
| 3º | USD 5.000 | 4.000 | 1.000 | USD 1.250 |

Campeões de cidade: palco global, merch, certificado. Todos os 160 saem com certificado + merch.

Há **dois filtros**: ganhar a cidade (10 times → 1 campeão) e depois a final global (4 campeões → top 3). Ordem do pitch global: **São Paulo → Buenos Aires → Bogotá → CDMX**. SP picha primeiro.

## Cronograma — São Paulo (oficial Brasil)

Flyer oficial da sede (`docs/assets/cronograma-sp.jpg`), confirmado pelo time em 27/08/2026. **Horário de São Paulo.** Sujeito a ajustes.

| Marco                          | Horário SP       |
| ------------------------------ | ---------------- |
| Chegada                        | sáb 29 **10:30** |
| Check-in                       | sáb 29 **11:00** |
| Abertura OpenAI                | sáb 29 **11:30** |
| Desafios anunciados            | sáb 29 **12:00** |
| Início do desenvolvimento      | sáb 29 **12:30** |
| Fim do desenvolvimento         | dom 30 **12:30** |
| Início dos pitches             | dom 30 **13:00** |
| Fim dos pitches                | dom 30 **15:00** |
| City Champions anunciados      | dom 30 **15:30** |
| Pitch final dos City Champions | dom 30 **16:30** |
| Vencedores anunciados          | dom 30 **17:30** |

Coding clock = **24h redondas** (sáb 12:30 → dom 12:30). Não usar os 09:00 / 11:00 que aparecem em blogs e em conversas com fuso misturado.

O flyer cobre **sáb 29 e dom 30**. O blog da Nauta menciona cerimônia de sexta 28/08 às 20:00 em SP/BUE — não está neste flyer. Confirmar sexta no check-in.

## Entregáveis (obrigatórios)

1. Presentation
2. Demo (ao vivo ou vídeo)
3. Repositório GitHub **público** com README
4. **Diagrama de arquitetura** — a Nauta enfatiza que isso não é formalidade: é onde o júri vê se o time entendeu o problema ou só construiu em volta dele

## Desafios

Selados até o kickoff. O site lista 4 files classificados. Texto oficial:

> briefs come straight from problems these companies are solving right now solving a real payments, logistics, or AI-native problem

Implicação: o desafio pode ser **Yuno-only, Nauta-only, ou a intersecção**. Preparar os três eixos, não apostar em um só.

**Cuidado com a tabela do Brasil Inovador** (SP = fraude/e-comm, MX = roteamento cross-border, etc.). Isso parece recorte editorial. O material oficial diz **os mesmos problemas, o mesmo relógio, nas quatro cidades**. Tratar a tabela da imprensa como não-oficial até o kickoff.

## O que ganhou em Bogotá (dez/2025)

- Time: **UNjavaHater** (Nicolas David Galindo, David Ramírez Monroy, Juan David Loaiza Reyes, Daniel Diaz Gonzalez)
- Projeto: **4thena**
- Problema: contexto de aquisição de merchants da Yuno espalhado em WhatsApp, Telegram, LinkedIn e Slack
- Solução: cérebro de prospecção com RAG/LLMs; memória consultável; gera design/scoping docs sob demanda
- Entrega: ~32h, 6 microserviços
- Júri citado: Julián Núñez e Simón Martinez

A Nauta, no post do NextWave 2026, traduz a lição:

> The thing that made it win was not the model choice. It was that they understood the actual problem: the signal was never missing, it was just spread across four places nobody could search at once.

E o filtro de 24h:

> Teams that start from the model tend to demo something impressive that does not hold. Teams that start from the problem, from the messy operational reality of whoever is supposed to use the thing, ship less and it works.

### O que isso ensina (nossa leitura)

1. **Problema operacional real > demo de modelo.**
2. **Contexto fragmentado** é a tese compartilhada das duas empresas (Yuno: stack de pagamentos; Nauta: ERP/TMS/WMS/e-mail).
3. Agente que **age com contexto**, não chatbot genérico.
4. Pitch em inglês, arquitetura visível, protótipo que funciona no happy path.
5. 4thena já ocupou “sales memory / merchant onboarding”. Repetir o mesmo ângulo é risco. Evoluir para **ops** (pagamentos + fulfillment) é mais fresco.

## Perfil que o Luma pede

- Quem constrói (devs, finalistas, recém-formados, profissionais)
- Inglês **B1+**
- Julgamento de produto, não só código
- Inscrição **individual** com o **mesmo team name**
- Seleção por motivação, experiência e diversidade de perfis; confirmação por e-mail

Luma SP: https://luma.com/r1iqjxtk

Em 22/08 o Luma SP já mostrava **Registration Closed**, enquanto o site oficial ainda não marcava SP como sold out (só CDMX e BUE). **Confirmar aceite do time agora.**

## Vantagem realista em 24h (sem trapacear o brief)

Não dá para pré-codar a solução. Dá para:

- Falar a língua das duas empresas (orquestração, smart routing, exception-to-action, contexto operacional)
- Ter stack e mocks prontos (OpenAI Agents + Yuno toolkit + dados logísticos fake)
- Ter critérios de corte: o que **não** construir
- Ter esqueleto de pitch + diagrama

Isso é o “repo coringa” da etapa 4 — ainda não nesta fase.
