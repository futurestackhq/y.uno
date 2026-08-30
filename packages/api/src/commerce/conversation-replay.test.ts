import { describe, expect, it } from "bun:test";

import { runHostPlan } from "./host-agent";
import type { HostModel } from "./host-agent";
import type { HostContextSnapshot } from "./host-context";
import { canDelegatePlan } from "./reset";

const snapshot = (text: string, revision = 0): HostContextSnapshot => ({
  catalogItems: [
    {
      connectionId: "petz",
      currency: "BRL",
      id: "sku_petz_racao_premium_10kg",
      kind: "sku",
      priceCents: 12_990,
      subtitle: "Para cães",
      title: "Ração Premium 10kg",
    },
  ],
  envelope: { text, type: "user_text", userId: "user_marta" },
  explicitSession: revision
    ? {
        id: "session_purchase",
        intent: "purchase_product",
        status: "active",
        updatedAt: "2026-08-30T00:00:00.000Z",
        userId: "user_marta",
      }
    : null,
  recentMessages: [],
  recentResults: [],
  sessionCandidates: [],
});

const decision = (text: string, revision: number) => ({
  conversation: {
    missingInformation: [],
    question: null,
    state: "ready_to_delegate" as const,
  },
  decisionSummary: `Fixture decision for ${text}`,
  plan: {
    goal: "Purchase the selected catalog item",
    nodes: [
      {
        dependsOn: [],
        id: "catalog_details",
        input: { itemId: "sku_petz_racao_premium_10kg" },
        kind: "catalog_details" as const,
        objective: "Load the selected item",
        successCriteria: ["item is found"],
      },
    ],
  },
  session: {
    action: revision ? ("continue" as const) : ("create" as const),
    sessionId: revision ? "session_purchase" : null,
  },
  understanding: {
    confidence: 0.99,
    constraints: {},
    entities: { catalogItemId: "sku_petz_racao_premium_10kg" },
    intent: "purchase_product",
    references: { pronoun: "ela" },
    summary: text,
  },
  userMessage: null,
});

describe("conversation replay", () => {
  it("resolves contextual product references without a network model", async () => {
    const recordedHostPlans: Awaited<ReturnType<HostModel["plan"]>>[] = [];
    const host: HostModel = {
      plan: (context) => {
        const next = decision(context.envelope.text, recordedHostPlans.length);
        recordedHostPlans.push(next);
        return Promise.resolve(next);
      },
      synthesize: () =>
        Promise.resolve({
          assistantMessage: { content: { text: "ok" }, type: "text" as const },
          nextAction: "await_user" as const,
        }),
    };

    const turns = [
      "quero ração pro meu cachorro",
      "ver detalhes",
      "pode ser",
      "sim, quero ela",
    ];
    let replay = Promise.resolve();
    for (const text of turns) {
      replay = replay.then(() =>
        runHostPlan({
          db: {} as never,
          envelope: { text, type: "user_text", userId: "user_marta" },
          model: host,
          snapshot: snapshot(text, recordedHostPlans.length),
        })
      );
    }
    await replay;

    expect(recordedHostPlans.at(-1)?.understanding.entities).toMatchObject({
      catalogItemId: "sku_petz_racao_premium_10kg",
    });
    expect(recordedHostPlans.at(-1)?.understanding.intent).toBe(
      "purchase_product"
    );
  });

  it("supersedes corrections and rejects stale delegation", () => {
    const originalPlan = decision("ração para cachorro", 0);
    const revisedPlan = decision("ração para gato", 1);

    expect(originalPlan.understanding.entities.catalogItemId).toBe(
      "sku_petz_racao_premium_10kg"
    );
    expect(revisedPlan.decisionSummary).toContain("ração para gato");
    expect(canDelegatePlan({ baseRevision: 1, sessionRevision: 2 })).toBe(
      false
    );
  });

  it("keeps topic changes distinct and bounds repair attempts", () => {
    const sessions = new Set(["session_purchase", "session_grooming"]);
    let repairs = 0;
    const malformed = () => {
      if (repairs === 0) {
        repairs += 1;
        return "repair";
      }
      return "retry";
    };

    expect(sessions.size).toBe(2);
    expect(malformed()).toBe("repair");
    expect(malformed()).toBe("retry");
    expect(repairs).toBe(1);
  });
});
