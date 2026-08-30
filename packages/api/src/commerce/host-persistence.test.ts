import { expect, it } from "bun:test";

import { canDelegatePlan } from "./reset";

it("rejects delegation from a stale plan revision", () => {
  expect(canDelegatePlan({ baseRevision: 4, sessionRevision: 5 })).toBe(false);
});

it("allows delegation from the current revision", () => {
  expect(canDelegatePlan({ baseRevision: 5, sessionRevision: 5 })).toBe(true);
});
