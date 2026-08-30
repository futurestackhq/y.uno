import { expect, it } from "bun:test";

import { isOwnedSessionId } from "../commerce/host-context";
import {
  DEMO_USER_ID,
  parseBoundedJsonOrRaw,
  serializeCurrentHostPlan,
} from "./commerce";

it("serializes the current host plan for the inspector", () => {
  const inspector = {
    currentHostPlan: serializeCurrentHostPlan({
      baseRevision: 3,
      decisionJson: '{"state":"ready_to_delegate"}',
      decisionSummary: "Plano atualizado com a preferência do cliente.",
      id: "plan-3",
      status: "persisted",
    }),
    session: { revision: 3 },
  };

  expect(inspector.currentHostPlan).toMatchObject({
    baseRevision: 3,
    decisionSummary: expect.any(String),
    status: "persisted",
  });
  expect(inspector.session.revision).toBe(3);
});

it("accepts only the server-owned demo user", () => {
  expect(DEMO_USER_ID).toBe("user_marta");
  expect(() =>
    parseBoundedJsonOrRaw(JSON.stringify({ ok: true }))
  ).not.toThrow();
});

it("does not treat a foreign explicit session as the active session", () => {
  expect(isOwnedSessionId("user_marta", "user_joao")).toBe(false);
  expect(isOwnedSessionId("user_marta", "user_marta")).toBe(true);
});

it("rejects oversized or deeply nested persisted JSON", () => {
  expect(parseBoundedJsonOrRaw("x".repeat(100_001))).toBe("[unavailable]");
  expect(
    parseBoundedJsonOrRaw('{"a":{"a":{"a":{"a":{"a":{"a":1}}}}}}', {
      maxDepth: 4,
    })
  ).toBe("[unavailable]");
});
