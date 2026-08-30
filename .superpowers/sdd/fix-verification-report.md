# Verification Fix Report

## Status

Fixed the scoped verification failures. Delegation prompt parameters now accept
the optional `planId` and `nodeId` values already supplied by the job runner,
and include them in the stable prompt header. Plan tests now assert the
approved `host_plan` workflow instead of the retired `classify_intent` node.

## Tests

- `bun test src/commerce/plan.test.ts src/commerce/prompts.test.ts` from
  `packages/api`: 9 passed, 0 failed.
- `bun x ultracite check packages/api/src/commerce/prompts.ts packages/api/src/commerce/plan.test.ts`:
  passed.

## Commit

Pending: commit only the scoped prompt, plan test, and this report files.

## Concerns

The equivalent root-level Bun test command intermittently failed because its
configured `./test/bun.setup.ts` preload was resolved from the repository root.
Running the same focused tests from `packages/api` passed.
