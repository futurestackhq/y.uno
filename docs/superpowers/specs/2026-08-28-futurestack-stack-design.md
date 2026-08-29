# FutureStack stack — design

**Date:** 2026-08-28  
**Status:** stack approved; product thesis **not** chosen (challenges sealed until Sat 12:00).  
**Repo:** `/Users/isaque/Development/hackathon`

This spec locks the **scaffold and platform**, not the Saturday product (P1–P5).

## Goal

A Cloudflare-native wildcard the team can deform after the brief: typed web + Worker API + D1, ready for OpenAI Agents SDK + fake Yuno/Nauta ports. Not a Cordis harness.

## Stack (approved)

| Choice          | Value                                                 |
| --------------- | ----------------------------------------------------- |
| Frontend        | TanStack Router (Vite), `apps/web` :3001              |
| Backend         | Hono on Cloudflare Workers, `apps/server` :3000       |
| API             | tRPC                                                  |
| DB              | SQLite via **D1** + Drizzle (`packages/db`)           |
| Auth            | **none**                                              |
| Payments addon  | none                                                  |
| Examples        | none (no Vercel AI SDK chat toy)                      |
| Lint            | Ultracite + **oxlint**; editors Cursor and VS Code    |
| Skills          | project scope: Cursor + universal                     |
| Git hooks       | Lefthook → `ultracite check` on staged JS/TS/JSON/CSS |
| Deploy          | Alchemy → Cloudflare (`packages/infra`)               |
| Package manager | bun                                                   |

Local folder name is `hackathon`, so workspace packages are `@hackathon/*`. Saturday GitHub may be named `futurestack`.

## Platform constraints (implementation must honor)

- D1 Free: 50 queries / Worker invocation; 2 MB row max; daily read/write caps reset 00:00 UTC. Fixtures in memory + `batch()`. No POD PDFs in SQL.
- Workers Free: **10 ms CPU** / request (waiting on OpenAI `fetch` does not count); **50 subrequests** / invocation. Prefer Workers Paid (~USD 5) for the stage demo.
- Do not use disk SQLite as the production path.

Detail: `docs/11-d1-limites.md`.

## Out of scope until after Sat 12:00

- Choosing P1 vs P2 vs importer brief
- Yuno live credentials (fake ports until a sandbox key exists)
- Nauta live API (none exists)
- Pitch narrative

## Repo timeline

- **Friday:** optional **private** test GitHub for Alchemy/D1. History may show 28 Aug.
- **Saturday ≥ 12:30:** copy working tree **without** `.git`, `docs/local/`, secrets, into a **new** public repo. See gitignored `docs/local/repo-teste-vs-oficial.md`.

## Next implementation (after this spec is accepted)

1. Smoke `bun run dev` + Alchemy login on the test path.
2. Implementation plan for the wildcard agent (ports, fixtures, thin UI) — not in this document.

## Related

- Notion team hub: https://app.notion.com/p/3c92d79f9bbb806fbf1bd9650f1309eb
- Vault: `AI Docs/FutureStack/`
