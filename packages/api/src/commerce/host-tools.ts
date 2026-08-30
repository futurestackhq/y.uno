import { tool } from "ai";
import { z } from "zod";

import type { CatalogItemSummary, HostContextSnapshot } from "./host-context";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

export const searchCatalogSnapshot = (
  snapshot: HostContextSnapshot,
  query: string
): CatalogItemSummary[] => {
  const terms = normalize(query).split(/\s+/u).filter(Boolean);
  return snapshot.catalogItems.filter((item) => {
    const haystack = normalize(
      [item.id, item.title, item.subtitle ?? "", item.kind].join(" ")
    );
    return terms.every((term) => haystack.includes(term));
  });
};

export const createHostTools = (snapshot: HostContextSnapshot) => ({
  get_recent_messages: tool({
    description: "Read the recent transcript for this turn's selected context.",
    execute: () => snapshot.recentMessages,
    inputSchema: z.object({ sessionId: z.string().optional() }),
  }),
  get_session_candidates: tool({
    description: "Read sessions that belong to this user.",
    execute: () => snapshot.sessionCandidates,
    inputSchema: z.object({}),
  }),
  search_catalog: tool({
    description: "Search the catalog snapshot by a natural-language query.",
    execute: ({ query }) => searchCatalogSnapshot(snapshot, query),
    inputSchema: z.object({ query: z.string().min(1).max(240) }),
  }),
});
