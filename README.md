# FutureStack - Yuno Commerce

FutureStack is an agentic commerce platform built for the NextWave Hackathon 2026 (Yuno x Nauta, Sao Paulo). It turns a conversation into a guided commerce journey: customers discover products, inspect details, add items, and continue to checkout while merchants can observe the orchestration behind every interaction.

The repository is a TypeScript monorepo powered by React, Hono, tRPC, Cloudflare Workers, Cloudflare D1, Drizzle ORM, and an OpenAI-powered host agent.

## Live applications

| Experience | URL | Purpose |
| --- | --- | --- |
| Main customer experience | [https://whats.futerestack.workers.dev/](https://whats.futerestack.workers.dev/) | WhatsApp-inspired chat interface for product discovery and commerce. |
| B2B client console | [https://web.futerestack.workers.dev/yuno-commerce](https://web.futerestack.workers.dev/yuno-commerce) | Merchant/operator console with the commerce chat, session inspector, plan, and delegated-job visibility. |

## What the platform does

- Accepts a user message as a durable commerce envelope.
- Identifies the request and creates a plan DAG for the conversation.
- Delegates catalog search, product details, order creation, and checkout preparation to bounded jobs.
- Returns product cards with merchant, price, attributes, and images.
- Supports demo merchant connections such as Petz, Raia, Oxxo, and Carrefour.
- Persists sessions, messages, jobs, plans, orders, catalog items, and execution logs in Cloudflare D1.
- Exposes the host plan, exact delegation prompt, job status, retries, and results in the B2B console.

## Architecture

```text
Customer / Operator
        |
        v
Customer app (apps/whats) or B2B web app (apps/web)
        |
        | tRPC / HTTP
        v
Hono API Worker / Commerce Router
        |
        +--> Host / Orchestrator (OpenAI) --> plan DAG
        |                                      |
        |                                      v
        +--> Message dispatcher --> job runner + heartbeat
                                           |
                                           +--> catalog search / details
                                           +--> order creation
                                           +--> checkout preparation
                                           |
                                           v
                              Cloudflare D1 via Drizzle ORM
```

The platform is designed around durable execution:

1. The API receives an envelope and writes it to `message_queue` with an idempotency key.
2. The dispatcher updates the session and transcript, creates or updates the plan, and queues ready jobs.
3. The job runner claims jobs with a lease, executes specialized work, saves structured results, and records execution events.
4. The host synthesizes a concise customer-facing response from the completed plan results.
5. Both interfaces poll while work is pending and then render chat, catalog, and observability data.

## Repository layout

```text
apps/
  whats/               WhatsApp-inspired customer experience
  web/                 Merchant and B2B React frontend
  server/              Hono worker entrypoint
packages/
  api/                 tRPC routers, commerce orchestration, prompts, jobs
  db/                  Drizzle schema and D1 migrations
  infra/               Alchemy infrastructure definition
  ui/                  Shared shadcn/ui components and styles
docs/                  Product, research, and architecture documentation
```

## Prerequisites

- [Bun](https://bun.sh/) 1.2.20 or later
- Node.js 20 or later for compatible tooling
- A Cloudflare account for Workers and D1
- An OpenAI API key for the orchestration host

On Windows, ensure `bun` is available in your `PATH`. If Bun was installed with WinGet and PowerShell does not recognize the command, reopen PowerShell after installation or add Bun's installation directory to `PATH` for that session.

## Run locally

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/futurestackhq/y.uno.git
   cd y.uno
   bun install
   ```

2. Create `apps/server/.env`:

   ```dotenv
   OPENAI_API_KEY=your_openai_api_key
   ORCHESTRATOR_MODEL=gpt-5.6-luna
   ```

   `ORCHESTRATOR_MODEL` is optional; select a model available to your OpenAI account. Do not commit `.env` files or API keys.

3. Authenticate Alchemy with a Cloudflare profile that can access Workers and D1:

   ```bash
   cd packages/infra
   bun x alchemy login --profile default
   cd ../..
   ```

   If Cloudflare says that a `workers.dev` subdomain is required, open the Workers landing page in the Cloudflare dashboard once and enable the account subdomain.

4. Start the complete local stack:

   ```bash
   bun run dev
   ```

5. Open the local services:

   - B2B web app: [http://127.0.0.1:3001/commerce](http://127.0.0.1:3001/commerce)
   - API worker: [http://127.0.0.1:3000](http://127.0.0.1:3000)

   To run the standalone customer experience separately:

   ```bash
   bun --cwd apps/whats dev
   ```

The local stack provisions a local D1 database and starts the API and web Workers. Use **Reset demo** in the commerce UI to restore the seeded merchant catalog and demo data.

## Useful commands

```bash
# Start web, API, local infrastructure, and configured applications
bun run dev

# Check TypeScript across the monorepo
bun run check-types

# Run repository checks and tests
bun run check
bun test packages/api/src/commerce

# Build all packages
bun run build

# Generate Drizzle migration files after schema changes
bun run db:generate

# Apply automated formatting and lint fixes
bun run fix
```

## Deployment

GitHub Actions deploys the Cloudflare stage from `main`. Configure these repository secrets before deploying:

| Secret | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token with Workers Scripts, D1, Account Settings, and Secrets Store permissions. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID. |

Set `CORS_ORIGIN` to the exact deployed web and customer origins when needed. For example:

```dotenv
CORS_ORIGIN=https://web.futerestack.workers.dev
```

To deploy from a local authenticated environment:

```bash
bun run deploy
```

Alchemy manages Cloudflare Workers, D1 bindings, and runtime secrets. For production, run Alchemy with an explicit production stage from `packages/infra`.

## Security notes

- Keep `OPENAI_API_KEY` only in local environment files or a managed secret store.
- Do not put credentials in source code, pull requests, logs, or chat transcripts.
- Rotate any API key that was exposed accidentally.

## License

This repository is maintained as a hackathon project by FutureStack.
