import { expect, it } from "bun:test";

import { hostPlanDecisionSchema } from "./host-contract";
import { canDelegatePlan } from "./reset";

it("marks a self-dependent plan invalid", () => {
  expect(() =>
    hostPlanDecisionSchema.parse({
      conversation: {
        missingInformation: [],
        question: null,
        state: "ready_to_delegate",
      },
      decisionSummary: "bad plan",
      plan: {
        goal: "bad plan",
        nodes: [
          {
            dependsOn: ["a"],
            id: "a",
            input: {},
            kind: "catalog_search",
            objective: "x",
            successCriteria: ["x"],
          },
        ],
      },
      session: { action: "create", sessionId: null },
      understanding: {
        confidence: 1,
        constraints: {},
        entities: {},
        intent: "x",
        references: {},
        summary: "x",
      },
      userMessage: null,
    })
  ).toThrow("cannot depend on itself");
});

it("rejects delegation from a stale plan revision", () => {
  expect(canDelegatePlan({ baseRevision: 4, sessionRevision: 6 })).toBe(false);
});

it("allows delegation from the revision created with the plan", () => {
  expect(canDelegatePlan({ baseRevision: 5, sessionRevision: 6 })).toBe(true);
});
