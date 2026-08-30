import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";
import { sql } from "drizzle-orm";

const toAttributesJson = (attributes: Record<string, unknown>) =>
  JSON.stringify(attributes);

export const seedDemoData = async (db: Db) => {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.connections);
  const count = existing.at(0)?.count ?? 0;
  if (count > 0) {
    return;
  }

  const nowIso = new Date().toISOString();

  const connections = [
    {
      commissionBps: 1200,
      createdAt: nowIso,
      displayName: "Petz",
      id: "conn_petz",
      slaMinutesDefault: 180,
      slug: "petz",
      type: "service" as const,
    },
    {
      commissionBps: 600,
      createdAt: nowIso,
      displayName: "Drogasil / Raia",
      id: "conn_raia",
      slaMinutesDefault: 120,
      slug: "raia",
      type: "product" as const,
    },
    {
      commissionBps: 500,
      createdAt: nowIso,
      displayName: "Oxxo Demo",
      id: "conn_oxxo",
      slaMinutesDefault: 45,
      slug: "oxxo-demo",
      type: "product" as const,
    },
    {
      commissionBps: 450,
      createdAt: nowIso,
      displayName: "Carrefour",
      id: "conn_carrefour",
      slaMinutesDefault: 240,
      slug: "carrefour",
      type: "product" as const,
    },
  ];

  await db.insert(schema.connections).values(connections);

  const catalogItems = [
    {
      attributesJson: toAttributesJson({
        flavor: "Frango",
        pet: "Cachorro",
        sizeKg: 10,
      }),
      connectionId: "conn_petz",
      createdAt: nowIso,
      currency: "BRL",
      id: "sku_petz_racao_premium_10kg",
      imageUrl: "https://www.mrio.com.br/12501-large_default/ped-carne-frango-e-cereais-10kg.webp",
      isActive: true,
      kind: "sku" as const,
      priceCents: 18_990,
      subtitle: "Pedigree • Adulto • Frango • 10 kg",
      title: "Ração Pedigree Adulto",
    },
    {
      attributesJson: toAttributesJson({
        needsAddress: true,
        pickup: true,
      }),
      connectionId: "conn_petz",
      createdAt: nowIso,
      currency: "BRL",
      id: "svc_petz_banho_tosa",
      imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80",
      isActive: true,
      kind: "service" as const,
      priceCents: 12_990,
      subtitle: "Agendamento • Pickup",
      title: "Banho + Tosa (com leva e traz)",
    },
    {
      attributesJson: toAttributesJson({
        brand: "Glam Organic",
        description: "Shampoo 4 em 1 para cães, com aloe vera e óleo de tea tree. Limpa, condiciona e hidrata a pelagem.",
        volumeMl: 500,
      }),
      connectionId: "conn_raia",
      createdAt: nowIso,
      currency: "BRL",
      id: "sku_raia_shampoo_pet_500ml",
      imageUrl: "https://www.petexpress.com.ph/cdn/shop/products/IMG_2021_02_18_3769_800x.jpg?v=1626337792",
      isActive: true,
      kind: "sku" as const,
      priceCents: 4990,
      subtitle: "Glam Organic • Shampoo para cães • 500 mL",
      title: "Shampoo Glam Organic para Cães",
    },
    {
      attributesJson: toAttributesJson({
        size: "M",
      }),
      connectionId: "conn_carrefour",
      createdAt: nowIso,
      currency: "BRL",
      id: "sku_carrefour_brinq_bola",
      imageUrl: "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?auto=format&fit=crop&w=800&q=80",
      isActive: true,
      kind: "sku" as const,
      priceCents: 1990,
      subtitle: "Borracha • Média",
      title: "Brinquedo Bola",
    },
    {
      attributesJson: toAttributesJson({ brand: "Whiskas", flavor: "Carne", pet: "Gato", sizeKg: 2.7 }),
      connectionId: "conn_petz", createdAt: nowIso, currency: "BRL", id: "sku_petz_whiskas_gato_27kg",
      imageUrl: "https://images.petz.com.br/fotos/1694721236910.jpg",
      isActive: true, kind: "sku" as const, priceCents: 5890,
      subtitle: "Whiskas • Adulto • Carne • 2,7 kg", title: "Ração Whiskas Adulto",
    },
    {
      attributesJson: toAttributesJson({ brand: "NexGard", pet: "Cachorro", units: 1 }),
      connectionId: "conn_petz", createdAt: nowIso, currency: "BRL", id: "sku_petz_petisco_cao_80g",
      imageUrl: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80",
      isActive: true, kind: "sku" as const, priceCents: 1290,
      subtitle: "NexGard • Petisco para cães • 80 g", title: "Petisco NexGard Crocante",
    },
    {
      attributesJson: toAttributesJson({ brand: "Coca-Cola", volumeMl: 350 }),
      connectionId: "conn_oxxo", createdAt: nowIso, currency: "BRL", id: "sku_oxxo_coca_350ml",
      imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80",
      isActive: true, kind: "sku" as const, priceCents: 699,
      subtitle: "Coca-Cola • Lata • 350 mL", title: "Refrigerante Coca-Cola",
    },
    {
      attributesJson: toAttributesJson({ brand: "Oxxo", weightG: 80 }),
      connectionId: "conn_oxxo", createdAt: nowIso, currency: "BRL", id: "sku_oxxo_salgadinho_80g",
      imageUrl: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80",
      isActive: true, kind: "sku" as const, priceCents: 899,
      subtitle: "Oxxo Snacks • Queijo • 80 g", title: "Salgadinho de Queijo",
    },
    {
      attributesJson: toAttributesJson({ brand: "Bauducco", weightG: 140 }),
      connectionId: "conn_oxxo", createdAt: nowIso, currency: "BRL", id: "sku_oxxo_cookie_140g",
      imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80",
      isActive: true, kind: "sku" as const, priceCents: 1099,
      subtitle: "Bauducco • Cookies • 140 g", title: "Cookies com Gotas de Chocolate",
    },
    {
      attributesJson: toAttributesJson({ brand: "Oxxo", volumeMl: 500 }),
      connectionId: "conn_oxxo", createdAt: nowIso, currency: "BRL", id: "sku_oxxo_agua_500ml",
      imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80",
      isActive: true, kind: "sku" as const, priceCents: 399,
      subtitle: "Oxxo • Sem gás • 500 mL", title: "Água Mineral",
    },
  ];

  // D1's SQLite binding has a parameter limit below this catalog's combined
  // insert payload. Keep each catalog item as its own statement in one batch.
  await db.batch(
    catalogItems.map((item) =>
      db.insert(schema.connectionCatalogItems).values({
        ...item,
        imageUrl: item.imageUrl ?? undefined,
        subtitle: item.subtitle ?? undefined,
      })
    )
  );
};
