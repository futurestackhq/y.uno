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

export interface ClassifyIntentResult {
  intent: string;
  entities: {
    terms: string[];
  };
  missing: string[];
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

const normalizeTerms = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length >= 3);

export const classifyIntentFromText = (text: string): ClassifyIntentResult => {
  const terms = normalizeTerms(text);
  const termSet = new Set(terms);
  const hasPetTerm = ["pet", "cachorro", "gato", "racao", "banho", "tosa"].some(
    (term) => termSet.has(term)
  );
  const hasServiceTerm = ["banho", "tosa", "agenda", "agendar"].some((term) =>
    termSet.has(term)
  );

  if (hasServiceTerm) {
    return { entities: { terms }, intent: "service_pet_grooming", missing: [] };
  }

  if (hasPetTerm) {
    return { entities: { terms }, intent: "product_pet_food", missing: [] };
  }

  return { entities: { terms }, intent: "generic_request", missing: [] };
};

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
