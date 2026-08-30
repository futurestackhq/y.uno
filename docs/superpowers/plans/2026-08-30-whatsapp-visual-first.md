# WhatsApp Web Clone — Visual-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `apps/whats` light-theme desktop WhatsApp Web clone at `1440×900`, using typed fixtures and only the commerce-relevant interactions needed by the MVP.

**Architecture:** Create a standalone Vite/TanStack Router app with local shadcn/Tailwind v4 tokens. Use AI Elements `Conversation` and `PromptInput` for conversation scrolling and composer behavior, but render WhatsApp-specific bubbles, cards, carousels, buttons, and Flow panels locally so visual fidelity remains under our control. Keep the existing `apps/web` harness and backend unchanged during this phase.

**Tech Stack:** Bun workspaces, Vite, React 19, TanStack Router, Tailwind CSS v4, shadcn-compatible local components, AI Elements `conversation` and `prompt-input`, TypeScript, Ultracite.

## Global Constraints

- Reference viewport: **1440×900**.
- Theme scope: **light only**.
- Initial selected conversation: **`y.uno commerce`**.
- Search is visual-only and does not search.
- Non-MVP WhatsApp features remain mocked or absent: chat switching, emoji picker, reactions, attachments, calls, settings, and generic menus.
- The first slice uses typed local fixtures and does not call tRPC or `useChat`.
- `apps/whats` must not import `@hackathon/ui/globals.css`.
- Shared UI tokens in `apps/web` must not change.
- Missing visual states require a new HTML shot or screenshot from the user; do not guess.
- Run `bun check-types` and `bun check` at each milestone.

---

## File Map

### New application

- `apps/whats/package.json` — standalone workspace manifest and scripts.
- `apps/whats/index.html` — Vite document shell.
- `apps/whats/vite.config.ts` — Tailwind, TanStack Router, and React plugins.
- `apps/whats/tsconfig.json` — strict TypeScript config and `@/*` alias.
- `apps/whats/src/main.tsx` — router/query entrypoint.
- `apps/whats/src/index.css` — isolated Tailwind and WhatsApp/shadcn tokens.
- `apps/whats/src/routes/__root.tsx` — root document and global app composition.
- `apps/whats/src/routes/index.tsx` — simulator entry route.
- `apps/whats/src/fixtures/messages.ts` — typed conversation fixtures and interaction payloads.
- `apps/whats/src/fixtures/conversations.ts` — static conversation-list fixtures.
- `apps/whats/src/whatsapp/whats-desktop-shell.tsx` — full desktop shell.
- `apps/whats/src/whatsapp/whats-conversation-list.tsx` — sidebar/list/search mock.
- `apps/whats/src/whatsapp/whats-chat-header.tsx` — selected-contact header.
- `apps/whats/src/whatsapp/whats-message-list.tsx` — conversation rendering and AI Elements bridge.
- `apps/whats/src/whatsapp/whats-message-bubble.tsx` — incoming/outgoing bubbles.
- `apps/whats/src/whatsapp/whats-interactive-message.tsx` — Flow panel, buttons, cards, lists, and carousels.
- `apps/whats/src/whatsapp/whats-composer.tsx` — input/send/loading behavior.
- `apps/whats/src/whatsapp/use-local-conversation.ts` — fixture adapter exposing `SendMessage`.
- `apps/whats/src/components/ai-elements/conversation.tsx` — generated/adapted AI Elements conversation primitive.
- `apps/whats/src/components/ai-elements/prompt-input.tsx` — generated/adapted AI Elements prompt input primitive.

### Existing files intentionally untouched in this phase

- `apps/web/src/routes/_dashboard/commerce/index.tsx`
- `apps/web/src/commerce/*`
- `packages/api/src/commerce/*`
- `packages/api/src/routers/commerce.ts`
- `packages/ui/src/styles/globals.css`
- `packages/infra/alchemy.run.ts`

---

## Task 1: Scaffold the isolated `apps/whats` app

**Files:**

- Create: `apps/whats/package.json`
- Create: `apps/whats/index.html`
- Create: `apps/whats/vite.config.ts`
- Create: `apps/whats/tsconfig.json`
- Create: `apps/whats/src/main.tsx`
- Create: `apps/whats/src/routes/__root.tsx`
- Create: `apps/whats/src/routes/index.tsx`
- Create: `apps/whats/src/index.css`

**Interfaces:**

- Produces an independent Vite app with a root route and isolated stylesheet.
- Later tasks consume the `@/*` path alias and root route.

- [ ] **Step 1: Create the workspace manifest**

Copy the current Vite/TanStack dependency pattern from `apps/web/package.json`, keeping only dependencies needed by the simulator. Add scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "check-types": "vite build && tsc --noEmit",
    "dev": "vite dev",
    "serve": "vite preview"
  }
}
```

Keep the app private and named `whats`.

- [ ] **Step 2: Add the Vite document and config**

Use the same `#app` mount expected by the existing Vite app. Configure:

```ts
plugins: [
  tailwindcss(),
  tanstackRouter({ autoCodeSplitting: true, target: "react" }),
  react(),
],
resolve: { tsconfigPaths: true },
server: { port: 3002 },
```

- [ ] **Step 3: Add strict TypeScript and router entrypoint**

Configure `@/*` to resolve to `apps/whats/src/*`. Create a root route that imports only `./index.css`, and an index route that initially renders a placeholder shell.

- [ ] **Step 4: Add the isolated CSS baseline**

Start with:

```css
@import "tailwindcss";

@source "./**/*.{ts,tsx}";
```

Do not import `@hackathon/ui/globals.css`.

- [ ] **Step 5: Verify the standalone app**

Run:

```bash
bun install
bunx turbo run check-types --filter=whats
bunx turbo run build --filter=whats
```

Expected: the new workspace builds without changing `apps/web`.

---

## Task 2: Establish WhatsApp light tokens and desktop shell

**Files:**

- Modify: `apps/whats/src/index.css`
- Create: `apps/whats/src/fixtures/conversations.ts`
- Create: `apps/whats/src/whatsapp/whats-desktop-shell.tsx`
- Create: `apps/whats/src/whatsapp/whats-conversation-list.tsx`
- Create: `apps/whats/src/whatsapp/whats-chat-header.tsx`
- Modify: `apps/whats/src/routes/index.tsx`

**Interfaces:**

- `WhatsDesktopShell` accepts the selected conversation and renders list + chat.
- `WhatsConversationList` renders a non-functional search field and static rows.
- `WhatsChatHeader` receives the selected `ConversationFixture`.

- [ ] **Step 1: Define typed conversation fixtures**

Create a `ConversationFixture` type with stable `id`, `name`, `preview`, `timestamp`, `unread`, `muted`, and `pinned` fields. Include several rows but make `y.uno commerce` the selected initial row.

- [ ] **Step 2: Add shadcn-compatible and WhatsApp-specific tokens**

Define light tokens in `:root`, including:

```css
:root {
  --background: #efeae2;
  --foreground: #111b21;
  --muted-foreground: #667781;
  --primary: #00a884;
  --border: #d1d7db;
  --wa-header: #008069;
  --wa-chat-wallpaper: #efeae2;
  --wa-bubble-in: #ffffff;
  --wa-bubble-out: #d9fdd3;
  --wa-composer: #f0f2f5;
  --wa-icon: #54656f;
}
```

Add base styles for `html`, `body`, and `#app` so the shell occupies the full viewport without inheriting the dashboard theme.

- [ ] **Step 3: Implement the shell geometry**

At `1440×900`, use a fixed-height desktop composition with a narrower conversation list and a flexible chat pane. Keep the sidebar and chat pane visually separated using WhatsApp divider tokens. Do not add inspector, sessions, tracing, or subagent columns.

- [ ] **Step 4: Implement the static conversation list**

Render:

- WhatsApp-style list header;
- decorative search input;
- static conversation rows;
- selected `y.uno commerce` row;
- unread, pinned, and muted visual states.

Search and row clicks should have no product behavior in this task.

- [ ] **Step 5: Implement the selected chat header**

Render `y.uno commerce`, status text, avatar placeholder, and decorative action icons. Actions are visual-only unless required by a captured MVP state.

- [ ] **Step 6: Verify shell fidelity**

Run:

```bash
bun check-types
bun check
```

Then inspect at `1440×900` beside the WhatsApp HTML snapshots. Record missing states; if a required state is absent from the references, request a new shot before continuing.

---

## Task 3: Add message fixtures and WhatsApp message rendering

**Files:**

- Create: `apps/whats/src/fixtures/messages.ts`
- Create: `apps/whats/src/whatsapp/whats-message-bubble.tsx`
- Create: `apps/whats/src/whatsapp/whats-interactive-message.tsx`
- Create: `apps/whats/src/whatsapp/whats-message-list.tsx`
- Modify: `apps/whats/src/routes/index.tsx`

**Interfaces:**

- `WhatsMessage` is a discriminated union for `text`, `flow`, `carousel`, `list`, `purchase_summary`, and `receipt`.
- `WhatsMessageBubble` receives `message` and renders sender-specific layout.
- `WhatsInteractiveMessage` emits `onAction(action)` for MVP actions.

- [ ] **Step 1: Define the message union**

Use typed payloads instead of `unknown` JSON for fixtures:

```ts
type WhatsMessage =
  | {
      id: string;
      direction: "in" | "out";
      kind: "text";
      text: string;
      time: string;
      state?: "sent" | "delivered" | "read";
    }
  | {
      id: string;
      direction: "in";
      kind: "flow";
      title: string;
      description: string;
      actionLabel: string;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "carousel";
      title: string;
      cards: CarouselCard[];
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "list";
      title: string;
      items: ListItem[];
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "purchase_summary";
      title: string;
      total: string;
      actions: MessageAction[];
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "receipt";
      text: string;
      time: string;
    };
```

Include fixture states for the commerce MVP: greeting, product request, carousel, product details, purchase summary, Flow panel, and receipt.

- [ ] **Step 2: Render incoming/outgoing bubbles**

Implement WhatsApp-like alignment, widths, spacing, timestamp placement, delivery checks, border radius, and colors using `--wa-bubble-in` and `--wa-bubble-out`. Do not use the shared `Bubble` variant if its derived `--primary` styling prevents visual fidelity.

- [ ] **Step 3: Render commerce-relevant interactive content**

Support only:

- Flow panel opening inside the chat;
- quick reply/button action;
- horizontal product/service carousel;
- list/card content;
- purchase summary actions.

Buttons must be keyboard accessible and expose an action callback. Their behavior may append a fixture response, but no backend call is allowed.

- [ ] **Step 4: Add the initial conversation fixture**

Render the selected `y.uno commerce` conversation with enough content to exercise wrapping, multiple bubbles, carousel overflow, buttons, Flow panel, and receipt layout at the reference viewport.

- [ ] **Step 5: Verify message states**

Run:

```bash
bun check-types
bun check
```

Manually compare each rendered state with the supplied snapshots. Request a new HTML shot for any missing visual reference before changing geometry.

---

## Task 4: Add AI Elements conversation and composer behavior

**Files:**

- Create/adapt: `apps/whats/src/components/ai-elements/conversation.tsx`
- Create/adapt: `apps/whats/src/components/ai-elements/prompt-input.tsx`
- Create: `apps/whats/src/whatsapp/use-local-conversation.ts`
- Create: `apps/whats/src/whatsapp/whats-composer.tsx`
- Modify: `apps/whats/src/whatsapp/whats-message-list.tsx`
- Modify: `apps/whats/src/routes/index.tsx`
- Modify: `apps/whats/package.json`

**Interfaces:**

- `useLocalConversation()` returns `{ messages, isSubmitting, error, sendMessage }`.
- `sendMessage` has the adapter contract:

```ts
type SendMessage = (text: string) => Promise<void>;
```

- `WhatsComposer` accepts `onSubmit: SendMessage` and `isSubmitting`.

- [ ] **Step 1: Add AI Elements primitives**

From `apps/whats`, run:

```bash
bunx --bun ai-elements@latest add conversation
bunx --bun ai-elements@latest add prompt-input
```

Adapt generated files as needed to compile in this Vite app. Do not add `useChat` or an AI SDK route.

- [ ] **Step 2: Implement the local adapter**

Initialize from typed fixtures. On submit:

1. trim and reject empty input;
2. append an outgoing message immediately;
3. set `isSubmitting`;
4. wait for a deterministic short fixture delay;
5. append a typed assistant response;
6. clear `isSubmitting`;
7. expose errors through a renderable error state.

- [ ] **Step 3: Compose the message list with `Conversation`**

Use `Conversation` and `ConversationContent` for the viewport and `ConversationScrollButton` for the scroll affordance. Render local `WhatsMessageBubble` components inside the content. Ensure the conversation container is the flexible region between header and composer.

- [ ] **Step 4: Compose the WhatsApp-styled composer**

Use `PromptInput`, `PromptInputTextarea`, and `PromptInputSubmit`, then override classes to match WhatsApp:

- rounded light input surface;
- WhatsApp icon color;
- green send action;
- Enter submits;
- Shift+Enter inserts a newline;
- submit disabled while empty or submitting;
- typing/loading state remains visible.

- [ ] **Step 5: Verify the interaction contract**

Manually test:

- type and submit;
- Enter versus Shift+Enter;
- immediate outgoing message;
- delayed assistant fixture;
- duplicate-submit prevention;
- error rendering;
- autoscroll when at the bottom;
- scroll-to-bottom button after scrolling upward.

Run:

```bash
bun check-types
bun check
```

---

## Task 5: Visual certification and regression checkpoint

**Files:**

- Modify: `docs/superpowers/specs/2026-08-30-whats-visual-first-design.md` only if an approved decision changes.

- [ ] **Step 1: Run the full repository checks**

Run:

```bash
bun check-types
bun check
bun run build
```

Expected: all existing apps/packages and `apps/whats` pass.

- [ ] **Step 2: Inspect the clone at the canonical viewport**

Open `apps/whats` at `1440×900` and compare against:

- `/Users/isaque/Downloads/(189) WhatsApp (8_29_2026 6：57：34 PM).html`
- `/Users/isaque/Downloads/(189) WhatsApp (8_29_2026 6：54：34 PM).html`
- `/Users/isaque/Downloads/(188) WhatsApp (8_29_2026 7：59：54 PM).html`

Check shell proportions, list density, header, wallpaper, bubble geometry, interactive cards, composer, typography, icons, and dividers.

- [ ] **Step 3: Stress the supported mock states**

Replay a deterministic sequence containing:

1. greeting;
2. product request;
3. carousel;
4. quick reply;
5. Flow panel;
6. purchase summary;
7. receipt;
8. long text;
9. loading;
10. simulated error.

Confirm no overflow, broken scroll, duplicate messages, or stuck loading state.

- [ ] **Step 4: Stop and request references for unknown states**

If fidelity cannot be certified because a state is not represented in the available HTML/screenshots, stop that visual iteration and request the exact HTML shot from the user. Do not mark the slice complete based on an invented state.

- [ ] **Step 5: Completion gate**

The visual-first slice is complete only when:

- the clone opens with `y.uno commerce` selected;
- the shell is credible at `1440×900`;
- supported MVP interactions work locally;
- `apps/web` remains visually unchanged;
- `bun check-types`, `bun check`, and `bun run build` pass;
- visual review approves proceeding to the tRPC integration slice.

---

## Deferred Plans

These are intentionally separate plans after the visual slice is approved:

1. Replace local fixtures with the existing tRPC commerce adapter.
2. Move sessions, inspector, delegated jobs, and Subagents Live into the simulator boundary.
3. Convert `apps/web` into the Petz merchant dashboard.
4. Add separate Alchemy deployment and dashboard-to-simulator linking.
5. Add real Meta/WhatsApp/BSP integration only if the product scope requires it.
