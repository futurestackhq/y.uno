import { describe, expect, it } from "bun:test";

import {
  hostPlanDecisionSchema,
  hostSynthesisDecisionSchema,
} from "./host-contract";

const clarification = {
  conversation: {
    missingInformation: ["animal"],
    question: "É para cachorro ou gato?",
    state: "needs_clarification",
  },
  decisionSummary: "O produto foi entendido, mas o animal não.",
  plan: { goal: "Clarificar a necessidade", nodes: [] },
  session: { action: "continue", sessionId: "sess_1" },
  understanding: {
    confidence: 0.74,
    constraints: {},
    entities: { product: "ração" },
    intent: "purchase_product",
    references: {},
    summary: "O usuário quer comprar ração.",
  },
  userMessage: "É para cachorro ou gato?",
};

describe("host contracts", () => {
  it("accepts a clarification without delegations", () => {
    expect(hostPlanDecisionSchema.parse(clarification)).toBeTruthy();
  });

  it("rejects self-referential dependencies", () => {
    expect(() =>
      hostPlanDecisionSchema.parse({
        ...clarification,
        plan: {
          goal: "Buscar produto",
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
          goal: "Comprar produto",
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
              objective: "Consultar detalhes",
              successCriteria: ["Detalhes disponíveis"],
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
          goal: "Buscar produto",
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
        assistantMessage: { content: { text: "Olá!" }, type: "text" },
        nextAction: "await_user",
      })
    ).toBeTruthy();
  });
});
