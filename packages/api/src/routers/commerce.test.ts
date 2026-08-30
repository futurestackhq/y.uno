import { expect, it } from "bun:test";

import { serializeCurrentHostPlan } from "./commerce";

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
