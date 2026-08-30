import { describe, expect, it } from "bun:test";

import { classifyIntentFromText, rankCatalogItems } from "./job-runner-helpers";

describe("classifyIntentFromText", () => {
  it("detects pet food intent from product text", () => {
    expect(classifyIntentFromText("quero ração pro meu cachorro").intent).toBe(
      "product_pet_food"
    );
  });

  it("detects grooming service intent", () => {
    expect(classifyIntentFromText("preciso agendar banho e tosa").intent).toBe(
      "service_pet_grooming"
    );
  });
});

describe("rankCatalogItems", () => {
  it("prioritizes active matching catalog items", () => {
    const ranked = rankCatalogItems(
      [
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "inactive",
          imageUrl: null,
          isActive: false,
          kind: "sku",
          priceCents: 100,
          subtitle: null,
          title: "Ração inativa",
        },
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "food",
          imageUrl: null,
          isActive: true,
          kind: "sku",
          priceCents: 200,
          subtitle: "Cachorro",
          title: "Ração Premium",
        },
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "toy",
          imageUrl: null,
          isActive: true,
          kind: "sku",
          priceCents: 50,
          subtitle: null,
          title: "Bola",
        },
      ],
      "quero ração"
    );

    expect(ranked.map((item) => item.id)).toEqual(["food", "toy"]);
  });
});
