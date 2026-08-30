import { describe, expect, it } from "bun:test";

import { buildPlan } from "./plan";

describe("buildPlan", () => {
  it("creates a 3-node linear DAG with stable ids", () => {
    const plan = buildPlan("product_pet_food");
    const nodeIds = plan.nodes.map((n) => n.id);
    const uniqueNodeIds = new Set(nodeIds);

    expect(plan.nodes).toHaveLength(3);
    expect(uniqueNodeIds.size).toBe(3);
    expect(nodeIds).toEqual([
      "classify_intent",
      "rank_catalog",
      "compose_reply",
    ]);

    const nodeById = new Map(plan.nodes.map((n) => [n.id, n] as const));
    const classifyIntent = nodeById.get("classify_intent");
    const rankCatalog = nodeById.get("rank_catalog");
    const composeReply = nodeById.get("compose_reply");

    expect(classifyIntent).toBeTruthy();
    expect(rankCatalog).toBeTruthy();
    expect(composeReply).toBeTruthy();

    expect(rankCatalog?.deps).toEqual(["classify_intent"]);
    expect(composeReply?.deps).toEqual(["rank_catalog"]);

    expect(classifyIntent?.status).toBe("ready");
    expect(composeReply?.status).toBe("pending");
  });

  it("branches rank_catalog status by intent", () => {
    const genericPlan = buildPlan("generic_request");
    const productPlan = buildPlan("product_pet_food");

    const genericRank = genericPlan.nodes.find((n) => n.id === "rank_catalog");
    const productRank = productPlan.nodes.find((n) => n.id === "rank_catalog");

    expect(genericRank?.status).toBe("blocked");
    expect(productRank?.status).toBe("pending");
  });
});
