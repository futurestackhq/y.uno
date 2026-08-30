import { describe, expect, it } from "bun:test";

import { buildPlan, normalizePlanJson } from "./plan";

describe("buildPlan", () => {
  it("creates a 3-node linear DAG with stable ids", () => {
    const plan = buildPlan("product_pet_food");
    const nodeIds = plan.nodes.map((n) => n.id);
    const uniqueNodeIds = new Set(nodeIds);

    expect(plan.nodes).toHaveLength(3);
    expect(uniqueNodeIds.size).toBe(3);
    expect(nodeIds).toEqual(["host_plan", "rank_catalog", "compose_reply"]);

    const nodeById = new Map(plan.nodes.map((n) => [n.id, n] as const));
    const hostPlan = nodeById.get("host_plan");
    const rankCatalog = nodeById.get("rank_catalog");
    const composeReply = nodeById.get("compose_reply");

    expect(hostPlan).toBeTruthy();
    expect(rankCatalog).toBeTruthy();
    expect(composeReply).toBeTruthy();

    expect(rankCatalog?.deps).toEqual(["host_plan"]);
    expect(composeReply?.deps).toEqual(["rank_catalog"]);

    expect(hostPlan?.status).toBe("ready");
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

describe("normalizePlanJson", () => {
  it("repairs legacy empty plans using the session intent", () => {
    const plan = normalizePlanJson("{}", "unknown");

    expect(plan.nodes.map((node) => node.id)).toEqual([
      "host_plan",
      "rank_catalog",
      "compose_reply",
    ]);
    expect(plan.nodes.find((node) => node.id === "rank_catalog")?.status).toBe(
      "blocked"
    );
  });

  it("repairs invalid JSON without discarding a valid intent fallback", () => {
    const plan = normalizePlanJson("not json", "product_pet_food");

    expect(plan.version).toBe(1);
    expect(plan.nodes.find((node) => node.id === "rank_catalog")?.status).toBe(
      "pending"
    );
  });

  it("preserves valid custom plan nodes while restoring missing workflow nodes", () => {
    const plan = normalizePlanJson(
      JSON.stringify({
        createdAt: "2026-08-29T00:00:00.000Z",
        nodes: [
          {
            deps: [],
            id: "custom_step",
            kind: "custom_step",
            status: "done",
          },
        ],
        updatedAt: "2026-08-29T00:00:00.000Z",
        version: 1,
      }),
      "product_pet_food"
    );

    expect(plan.nodes.find((node) => node.id === "custom_step")?.status).toBe(
      "done"
    );
    expect(plan.nodes.map((node) => node.id)).toEqual([
      "host_plan",
      "rank_catalog",
      "compose_reply",
      "custom_step",
    ]);
  });
});
