# 11 — Limites D1 (e o que realmente aperta no Workers Free)

**Escopo desta nota:** Cloudflare D1 no plano **Workers Free** cabe no coringa do NextWave? Sim. O teto que pode matar o demo **não** é o banco.

Consultado em **28/08/2026**. Fontes: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) (docs D1 datadas 21/04/2026), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (atualizado 28/07/2026).

Veredito: **D1 Free atende.** Fixtures + trace do agente + demo de sábado usam uma fração dos tetos de leitura/escrita. Não guardar PDF de comprovante na tabela. Batchar queries. O risco real é **CPU 10 ms** e **50 subrequests** do Worker Free no loop do LLM.

---

## D1 Free vs D1 Paid

Reset do free: **00:00 UTC**. Se estourar leitura/escrita no free, a query **falha até o dia seguinte**. No paid, cobra o extra; não para.

| Limite | Workers Free | Workers Paid (~US$5/mês) | Cabe no demo? |
| --- | --- | --- | --- |
| Leituras (rows read) | 5 milhões / dia | 25 bilhões / mês inclusos | Sim — um `SELECT` conta linhas lidas, não requests |
| Escritas (rows written) | 100 mil / dia | 50 milhões / mês inclusos | Sim — o que aperta primeiro no free, ainda assim folgado |
| Storage na conta | 5 GB no total | 5 GB inclusos + US$0,75/GB-mês | Sim |
| Tamanho por database | 500 MB (teto) | 10 GB (teto duro) | Sim — fixtures são KB |
| Databases na conta | 10 | 50.000 | Sim — 1 DB basta |
| Queries D1 por invocação do Worker | 50 | 1.000 | **Cuidado:** 8 tools × 3 queries = perto do teto |
| Duração de uma SQL | 30 s | 30 s | Sim |
| Linha / BLOB | 2 MB | 2 MB | **Não** guardar PDF de POD na tabela |
| Colunas por tabela | 100 | 100 | Sim |
| Parâmetros bound por query | 100 | 100 | Sim |
| LIKE / GLOB | padrão ≤ 50 bytes | igual | Busca curta; não search de texto longo |
| Time Travel | 7 dias | 30 dias | Irrelevante no fim de semana |
| Conexões D1 simultâneas / invocação | 6 | 6 | Irrelevante com batch |
| Estouro de quota diária | Query falha até 00:00 UTC | Cobra o extra | Free = hard stop |

Um `SELECT *` em tabela de 5.000 linhas conta **5.000 reads**, mesmo que o Worker só use 8. Índice no filtro reduz isso.

---

## O que o D1 não é (mesmo no pago)

**SQLite, não Postgres.** Sem stored procedures, sem RLS de Postgres, sem PostGIS. Um database é **single-thread**: uma query por vez. Throughput ≈ 1 / duração da query. Concorrência alta devolve `overloaded`.

**Não é o lugar do PDF.** Linha máxima 2 MB. Comprovante de entrega = URL / fixture. Arquivo real iria para R2 (outro produto). No hackathon: mock.

**`--database sqlite` sem `--db-setup d1`** no better-t-stack = arquivo local. Não sobe no Workers.

---

## Uso estimado no sábado (ordem de grandeza)

| Ação | Writes D1 | Reads D1 | Cabe no free? |
| --- | --- | --- | --- |
| Seed de 8 fixtures | ~20 | ~0 | Sim |
| 1 run do agente (estado + tools) | ~10–30 | ~20–80 | Sim |
| 200 runs no dia (ensaio + júri) | ~6k writes | ~16k reads | Sim, <10% do teto de write |
| Guardar PDF 1 MB por disputa | 1 write, mas 1 MB/linha | — | Evitar; use URL |
| 8 tools × 7 queries D1 no mesmo request | — | 56 **queries** | Estoura o teto de 50 no Free |

Regra de implementação: fixture em memória + `batch()`, não `SELECT` por tool.

---

## O teto que não é D1 (Workers Free)

Fonte: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (28/07/2026). Esperar `fetch()` da OpenAI **não** conta como CPU. Executar JS (auth, parse de JSON, tRPC, Drizzle) **conta**.

| Limite | Workers Free | Workers Paid | Implicação no coringa |
| --- | --- | --- | --- |
| CPU por request HTTP | **10 ms** | 5 min (default 30 s) | Auth + parse do trace do agente já é faixa 10–20 ms nas próprias docs da CF |
| Subrequests / invocação | **50** | 10.000 | Cada D1 query **e** cada `fetch` (OpenAI) conta. Loop de 8 tools + 8 roundtrips de modelo chega perto |
| Requests / dia | 100.000 | sem teto diário | Folgado |
| Memória | 128 MB | 128 MB | Não bufferar PDF |
| Tamanho do Worker (gzip) | 3 MB | 10 MB | Agents SDK + toolkit Yuno: vigiar bundle |
| Estouro de CPU | Error 1102 | Sobe o `cpu_ms` | Demo no palco morre no Free se o loop for gordo |

**Hipótese operacional:** para o palco, **Workers Paid (~US$5)** dissolve CPU + 50 queries D1 + 50 subrequests. Não é obrigatório pelo volume de D1; é seguro contra 1102. D1 Free sozinho já cabe.

---

## Comparativo das opções do better-t-stack (DB)

“Sqlite” no CLI sem `--db-setup d1` é arquivo local (Bun/Node).

| Opção | O que é | Free típico | Sobe no CF Workers? | Atende o coringa? |
| --- | --- | --- | --- | --- |
| D1 (`sqlite` + `d1`) | SQLite na borda Cloudflare | 5M reads / 100k writes / 500 MB DB | Nativo (binding) | **Sim — escolha A** |
| SQLite arquivo | `.sqlite` no disco | Ilimitado na máquina | Não | Só local; demo no palco quebra |
| Turso | SQLite distribuído (libSQL) | Faixa free pequena | Via URL, não binding D1 | Sim, mas foge do CF puro |
| Neon / Postgres | Postgres serverless | Projeto pode suspender no idle | Via URL | Overkill; pode dormir no pitch |
| Convex | Backend+DB próprio | Quota Convex | Não é o path Workers+D1 | Fora da stack Workers |

Canvas visual (sessão de 28/08): `d1-limits-compare.canvas.tsx` no Cursor.
