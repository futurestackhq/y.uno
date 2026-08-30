# Yuno Commerce — Conversational Host Orchestrator

**Date:** 2026-08-30  
**Status:** Design approved in conversation; implementation pending

## 1. Goal

Replace the current keyword-based intent classifier with a general conversational understanding layer powered by a host agent. The host consumes inbound queue envelopes, understands them using conversation and session context, decides whether to continue or create a session, writes a durable plan, and only then delegates work to specialized subagents.

The selected host model is `gpt-5.6-luna` with `reasoning.effort: "low"` through the OpenAI Responses API.

The system must support natural follow-ups such as “ver detalhes”, “pode ser”, “essa” and “sim, quero ela” without encoding each expression as a deterministic intent rule.

## 2. Design principles

- The model owns language understanding, contextual reference resolution and conversational decisions.
- The runtime owns durable state, authorization, schema validation, idempotency, leases, retries and effect boundaries.
- A host decision is persisted before any delegation is materialized.
- The host, not a subagent, owns the user-facing conversation.
- Raw private chain-of-thought is not persisted. Store only a concise `decisionSummary`, plan, assumptions and observable events.
- A plan based on an obsolete conversation revision cannot delegate.

## 3. Conceptual model

```text
Envelope        = one inbound message or external event
Session         = continuous context and unit of work
Turn            = one host interpretation round
Plan            = durable decision for a turn
Job             = one delegated task
Execution       = one attempt to run a job
```

Sessions remain the core entity. The host manages them rather than treating them as passive containers for jobs.

## 4. End-to-end flow

```text
message_queue
    ↓
lightweight ingestion
    ↓
host_plan job
    ↓
GPT-5.6 Luna + conversation/session context
    ↓
validate and persist decision, session and plan
    ↓
┌────────────────────────────────────────┐
│ needs clarification → response + wait  │
└────────────────────────────────────────┘
    │
    ↓
materialize ready plan nodes as jobs
    ↓
specialized subagents
    ↓
host_synthesis job
    ↓
GPT-5.6 Luna
    ↓
response, next plan or session completion
```

The API remains asynchronous. Enqueuing a new message returns immediately while the host works in the background.

## 5. Session lifecycle and concurrency

The session status model should support:

```text
active → planning → awaiting_user
                 ↘ waiting_results → active
active → done / failed / expired
```

When `sessionId` is absent, the host receives candidate sessions belonging to the user and decides whether to continue one, create one or close one. The runtime validates ownership and the resulting state transition.

Each session has a monotonically increasing `revision`. A host plan records `baseRevision`. Before delegation:

```text
session.revision === plan.baseRevision
```

must still be true. If the user sends another message, the revision changes and the old plan becomes superseded. The host then plans again using the latest context. Only one host plan may be active for a given session; different sessions may be processed in parallel.

This supports corrections such as “não, quis dizer ração para gato” without allowing an earlier plan to execute against stale context.

## 6. Host planning contract

The host receives:

- the current envelope;
- recent user and assistant messages;
- candidate sessions;
- current session context and plan;
- pending jobs and recent results;
- relevant read-only catalog or domain context.

The structured decision has this shape:

```ts
{
  session: {
    action: "continue" | "create" | "close",
    sessionId: string | null
  },
  understanding: {
    intent: string,
    confidence: number,
    summary: string,
    entities: Record<string, unknown>,
    constraints: Record<string, unknown>,
    references: Record<string, unknown>
  },
  conversation: {
    state: "needs_clarification" | "ready_to_delegate" | "waiting_result",
    missingInformation: string[],
    question: string | null
  },
  plan: {
    goal: string,
    nodes: Array<{
      id: string,
      kind: string,
      objective: string,
      input: Record<string, unknown>,
      dependsOn: string[],
      successCriteria: string[]
    }>
  },
  decisionSummary: string,
  userMessage: string | null
}
```

The host may use read-only tools during planning:

```text
get_recent_messages
get_session_candidates
get_session_context
get_active_plans
get_pending_jobs
search_catalog
```

After the model returns, the runtime validates the structured output and persists the session choice, understanding, revision, plan, summary and timeline events. Only after that transaction succeeds can ready nodes become durable jobs.

## 7. Delegation and synthesis

Delegation follows this invariant:

```text
think → persist plan → delegate
```

Subagents execute one task each and return structured results. They do not alter session state or write final chat copy directly.

The host synthesis input includes:

```text
sessionId
original intent
current plan
completed subagent results
recent messages
current session revision
```

The host then chooses whether to respond, request confirmation, create a next plan, delegate another step or finish the session.

## 8. Model and runtime boundary

The application uses:

```text
model: gpt-5.6-luna
reasoning effort: low
endpoint: OpenAI Responses API
output: structured JSON
```

The model is responsible for interpretation and planning. Runtime invariants remain outside the model:

- user/session ownership;
- valid schemas and transitions;
- idempotency;
- plan revision checks;
- payment and other irreversible-effect confirmations;
- job leases and retries;
- protection against duplicate execution.

These are safety and consistency invariants, not language-understanding rules.

## 9. Error handling

If the model returns invalid structured output:

1. record a bounded diagnostic;
2. make one structured repair attempt;
3. retry the host job if repair fails;
4. mark the session failed after the retry limit;
5. send a clear user-facing fallback.

Tool failures are returned to the host as structured results. The host may retry, continue with partial results, ask the user for information or terminate the session.

Jobs already executed remain in the audit trail. Results from obsolete plans may only be used if the current host determines they remain relevant.

## 10. Natural-language behavior

The design must support contextual resolution rather than isolated keyword matching:

```text
quero ração pro meu cachorro
→ purchase intent; create or continue purchase session

ver detalhes
→ details of the most recently offered item

pode ser
→ accept/select the item currently under discussion

sim, quero ela
→ purchase the referenced item

não, quis dizer ração para gato
→ revise the active understanding and plan
```

The host should ask a focused clarification question only when the available context is insufficient for a safe or useful next action.

## 11. Evaluation

Evaluation must include replayable conversation scenarios, not only isolated classifier tests:

- product discovery and follow-up references;
- short confirmations;
- correction of a previous interpretation;
- topic change and session creation;
- ambiguous references;
- messages arriving while planning;
- duplicate envelopes;
- worker concurrency;
- retry after host failure;
- crash between plan persistence and job creation.

Each scenario should verify:

- selected or created session;
- interpreted intent and entities;
- resolved references;
- persisted plan;
- correct delegations;
- rejection of obsolete plans;
- final response;
- turn count, repair count and abandonment.

## 12. Market-informed implications

Research into ChatGPT Shopping Research, Amazon Rufus, Perplexity Shopping, Google Universal Cart and Brazilian consumer studies points to the same interaction pattern: users expect contextual follow-ups, personalized comparisons, live information, explicit limits and clear confirmation boundaries.

The harness should therefore expose what was understood and what will happen next, while keeping internal reasoning private. It should support repair as a first-class interaction rather than falling back immediately to a generic “tell me what you want” response.

Relevant sources:

- OpenAI, [Shopping Research](https://openai.com/index/chatgpt-shopping-research/)
- OpenAI, [Agentic Checkout Specification](https://developers.openai.com/commerce/specs/checkout)
- Amazon Web Services, [How Rufus scales conversational shopping](https://aws.amazon.com/blogs/machine-learning/how-rufus-scales-conversational-shopping-experiences-to-millions-of-amazon-customers-with-amazon-bedrock/)
- Perplexity, [Shopping That Puts You First](https://www.perplexity.ai/hub/blog/shopping-that-puts-you-first)
- Google, [Universal Cart](https://blog.google/products-and-platforms/products/shopping/google-shopping-cart/)
- PYMNTS/Visa, [Brazilian shopper study](https://www.pymnts.com/consumer-insights/2026/70percent-of-brazilians-expect-to-shop-with-ai-agents-by-2028/)
- ACM, [System and user strategies for conversational repair](https://doi.org/10.1145/3640794.3665558)

## 13. Scope

In scope:

- real model-backed host planning;
- session selection and creation by the host;
- contextual conversation understanding;
- durable plan-before-delegation;
- revision-based stale-plan protection;
- host synthesis after delegated jobs;
- structured output, retries and replay tests.

Out of scope for this iteration:

- raw chain-of-thought storage;
- autonomous irreversible payment without explicit authorization;
- multi-tenant governance and RBAC;
- a general-purpose external agent runtime;
- replacing the existing durable job runner with a new orchestration platform.
