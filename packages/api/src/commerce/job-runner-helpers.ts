interface CatalogItem {
  attributesJson: string;
  currency: string;
  id: string;
  isActive: boolean;
  kind: "sku" | "service";
  priceCents: number;
  subtitle: string | null;
  title: string;
}

export interface RankedItem {
  id: string;
  title: string;
  subtitle: string | null;
  priceCents: number;
  currency: string;
  kind: "sku" | "service";
  score: number;
}

export const hasSourceJobId = (
  inputJson: string,
  sourceJobId: string
): boolean => {
  try {
    const input = JSON.parse(inputJson) as { sourceJobId?: unknown };
    return input.sourceJobId === sourceJobId;
  } catch {
    return false;
  }
};

export const hasComposeReplyMarker = (
  contentJson: string,
  composeJobId: string
): boolean => {
  try {
    const content = JSON.parse(contentJson) as { composeJobId?: unknown };
    return content.composeJobId === composeJobId;
  } catch {
    return false;
  }
};

const normalizeTerms = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length >= 3);

const scoreCatalogItem = (item: CatalogItem, terms: Set<string>): number => {
  const haystack = normalizeTerms(
    `${item.title} ${item.subtitle ?? ""} ${item.attributesJson}`
  );
  let score = 0;
  for (const term of haystack) {
    if (terms.has(term)) {
      score += 2;
    }
  }

  if (item.kind === "service" && (terms.has("banho") || terms.has("tosa"))) {
    score += 5;
  }

  if (item.kind === "sku" && terms.has("racao")) {
    score += 5;
  }

  return score;
};

export const rankCatalogItems = (
  items: CatalogItem[],
  text: string
): RankedItem[] => {
  const terms = new Set(normalizeTerms(text));

  return items
    .filter((item) => item.isActive)
    .map((item) => ({
      currency: item.currency,
      id: item.id,
      kind: item.kind,
      priceCents: item.priceCents,
      score: scoreCatalogItem(item, terms),
      subtitle: item.subtitle,
      title: item.title,
    }))
    .toSorted((a, b) => b.score - a.score || a.priceCents - b.priceCents)
    .slice(0, 3);
};
