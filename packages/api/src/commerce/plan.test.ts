import { describe, expect, it } from "bun:test";

import { buildPlan } from "./plan";

describe("buildPlan", () => {
  it("creates a DAG for product intent", () => {
    const plan = buildPlan("product_pet_food");
    const kinds = plan.nodes.map((n) => n.kind);

    expect(kinds).toContain("classify_intent");
    expect(kinds).toContain("rank_catalog");
    expect(kinds).toContain("compose_reply");
  });
});
