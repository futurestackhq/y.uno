import { describe, expect, it } from "bun:test";

import { zodSchema } from "ai";

import {
  hostPlanOutputSchema,
  hostPlanDecisionSchema,
  hostSynthesisOutputSchema,
  hostSynthesisDecisionSchema,
} from "./host-contract";

const forbiddenOpenAiSchemaKeywords = new Set(["oneOf", "propertyNames"]);

const findForbiddenSchemaKeywords = (value: unknown, path = "$"): string[] => {
  if (!value || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenSchemaKeywords(item, `${path}[${index}]`)
    );
  }

  const object = value as Record<string, unknown>;
  const matches = Object.keys(object)
    .filter((key) => forbiddenOpenAiSchemaKeywords.has(key))
    .map((key) => `${path}.${key}`);
  return [
    ...matches,
    ...Object.entries(object).flatMap(([key, child]) =>
      findForbiddenSchemaKeywords(child, `${path}.${key}`)
    ),
  ];
};

const clarification = {
  conversation: {
    missingInformation: ["animal"],
    question: "Is it for a dog or cat?",
    state: "needs_clarification",
  },
  decisionSummary: "The product was understood, but not the animal.",
  plan: { goal: "Clarificar a necessidade", nodes: [] },
  session: { action: "continue", sessionId: "sess_1" },
  understanding: {
    confidence: 0.74,
    constraints: {},
    entities: { product: "pet food" },
    intent: "purchase_product",
    references: {},
    summary: "The user wants to buy pet food.",
  },
  userMessage: "Is it for a dog or cat?",
};

describe("host contracts", () => {
  it("emits OpenAI-compatible structured output schemas", async () => {
    const schemas = [hostPlanOutputSchema, hostSynthesisOutputSchema];
    const jsonSchemas = await Promise.all(
      schemas.map((schema) => zodSchema(schema).jsonSchema)
    );

    for (const jsonSchema of jsonSchemas) {
      expect(findForbiddenSchemaKeywords(jsonSchema)).toEqual([]);
    }
  });

  it("accepts a clarification without delegations", () => {
    expect(hostPlanDecisionSchema.parse(clarification)).toBeTruthy();
  });

  it("accepts a concise direct response without delegations", () => {
    expect(
      hostPlanDecisionSchema.parse({
        ...clarification,
        conversation: {
          missingInformation: [],
          question: null,
          state: "respond_directly",
        },
        decisionSummary: "Greeting answered without delegation.",
        plan: { goal: "Respond to greeting", nodes: [] },
        understanding: {
          ...clarification.understanding,
          confidence: 0.99,
          intent: "greeting",
        },
        userMessage: "Hello! What are you looking for today?",
      })
    ).toBeTruthy();
  });

  it("rejects silent direct responses", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        conversation: {
          missingInformation: [],
          question: null,
          state: "respond_directly",
        },
        plan: { goal: "Respond to greeting", nodes: [] },
        userMessage: null,
      })
    ).toThrow("Direct responses require a user message");
  });

  it("rejects delegation decisions without plan nodes", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        conversation: {
          missingInformation: [],
          question: null,
          state: "ready_to_delegate",
        },
        plan: { goal: "Buscar no marketplace", nodes: [] },
        userMessage: null,
      })
    ).toThrow("Delegation requires at least one plan node");
  });

  it("rejects self-referential dependencies", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        plan: {
          goal: "Find product",
          nodes: [
            {
              dependsOn: ["search"],
              id: "search",
              input: {},
              kind: "catalog_search",
              objective: "Encontrar produtos",
              successCriteria: ["Resultados encontrados"],
            },
          ],
        },
      })
    ).toThrow();
  });

  it("rejects cyclic dependencies", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        plan: {
          goal: "Buy product",
          nodes: [
            {
              dependsOn: ["details"],
              id: "search",
              input: {},
              kind: "catalog_search",
              objective: "Encontrar produtos",
              successCriteria: ["Resultados encontrados"],
            },
            {
              dependsOn: ["search"],
              id: "details",
              input: {},
              kind: "catalog_details",
              objective: "Consultar details",
              successCriteria: ["Details available"],
            },
          ],
        },
      })
    ).toThrow();
  });

  it("rejects dependencies that do not reference a plan node", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        plan: {
          goal: "Find product",
          nodes: [
            {
              dependsOn: ["missing"],
              id: "search",
              input: {},
              kind: "catalog_search",
              objective: "Encontrar produtos",
              successCriteria: ["Resultados encontrados"],
            },
          ],
        },
      })
    ).toThrow("Unknown plan node dependency");
  });

  it("accepts typed synthesis messages", () => {
    expect(
      hostSynthesisDecisionSchema.parse({
        assistantMessage: { content: { text: "Hello!" }, type: "text" },
        nextAction: "await_user",
      })
    ).toBeTruthy();
  });

  it("requires product carousel cards to include details and buy CTAs", () => {
    const carousel = {
      assistantMessage: {
        content: {
          buttons: [],
          cards: [
            {
              catalogItemId: "sku_1",
              ctas: [
                { action: "details", label: "View details" },
                { action: "buy", label: "Buy" },
              ],
              id: "sku_1",
              merchant: "Pet store",
              price: "R$ 89,90",
              subtitle: null,
              title: "Pet food",
            },
          ],
          merchant: null,
          orderId: null,
          paymentHint: null,
          subtitle: null,
          text: null,
          title: "Options for your pet",
          total: null,
        },
        type: "carousel",
      },
      nextAction: "await_user",
    };

    expect(hostSynthesisOutputSchema.parse(carousel)).toBeTruthy();
    expect(() =>
      hostSynthesisOutputSchema.parse({
        ...carousel,
        assistantMessage: {
          ...carousel.assistantMessage,
          content: {
            ...carousel.assistantMessage.content,
            cards: [
              {
                ...carousel.assistantMessage.content.cards[0],
                ctas: [],
              },
            ],
          },
        },
      })
    ).toThrow("Too small: expected array to have >=2 items");
  });
});
