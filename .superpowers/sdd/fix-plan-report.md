# Fix plan validation and revision concurrency

## Status

Implemented the requested host-plan validation and revision-concurrency fixes.

## Changes

- Host plan dependencies are rejected when they reference unknown node IDs.
- Legacy session plan normalization drops nodes with unknown dependencies while
  restoring the required workflow nodes.
- Host plan persistence records the session's pre-write revision as
  `baseRevision`.
- Existing sessions are updated with a conditional revision compare-and-swap in
  the same atomic D1 batch as the host-plan insert. Stale writers fail instead
  of overwriting newer state.
- Session status-change events are emitted only when the status actually
  changes, and carry the computed status.
- The plan-before-delegation revision invariant remains enforced by the existing
  `canDelegatePlan` check.

## Tests

- `bun test packages/api/src/commerce/host-contract.test.ts` — passed (5).
- `bun x ultracite check packages/api/src/commerce/host-persistence.ts packages/api/src/commerce/host-contract.ts packages/api/src/commerce/plan.ts packages/api/src/commerce/host-contract.test.ts` — passed.
- The combined focused suite could not fully run because the persistence test
  imports the local Cloudflare environment without the `cloudflare:workers`
  runtime. Existing `plan.test.ts` assertions also expect older
  `classify_intent` plan IDs and fail independently of this change.

## Concerns

The repository's current persistence-test environment needs the Cloudflare
Workers runtime available before the D1 CAS behavior can be exercised
end-to-end. No unrelated dirty files were modified.
