import { expect, it } from "bun:test";

import type { HostContextSnapshot } from "./host-context";
import { createHostTools, searchCatalogSnapshot } from "./host-tools";

const snapshot: HostContextSnapshot = {
  catalogItems: [
    {
      connectionId: "connection",
      currency: "BRL",
      id: "sku_racao",
      kind: "sku",
      priceCents: 1000,
      subtitle: "Frango",
      title: "Premium pet food",
    },
  ],
  envelope: { text: "details", type: "user_text", userId: "user_a" },
  explicitSession: null,
  recentMessages: [],
  recentResults: [],
  sessionCandidates: [
    {
      id: "session_a",
      intent: "buy",
      status: "active",
      updatedAt: "2026-01-01",
      userId: "user_a",
    },
  ],
};

it("searches only the catalog snapshot", () => {
  expect(searchCatalogSnapshot(snapshot, "pet food frango")).toHaveLength(1);
});

it("exposes only read-only snapshot tools", () => {
  expect(Object.keys(createHostTools(snapshot))).toEqual([
    "get_recent_messages",
    "get_session_candidates",
    "search_catalog",
  ]);
});
