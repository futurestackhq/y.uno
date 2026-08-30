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
      imageUrl: null,
      isActive: true,
      kind: "sku" as const,
      priceCents: 18_990,
      subtitle: "Adulto • Frango",
      title: "Ração Premium 10kg",
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
      imageUrl: null,
      isActive: true,
      kind: "service" as const,
      priceCents: 12_990,
      subtitle: "Agendamento • Pickup",
      title: "Banho + Tosa (com leva e traz)",
    },
    {
      attributesJson: toAttributesJson({
        volumeMl: 500,
      }),
      connectionId: "conn_raia",
      createdAt: nowIso,
      currency: "BRL",
      id: "sku_raia_shampoo_pet_500ml",
      imageUrl: null,
      isActive: true,
      kind: "sku" as const,
      priceCents: 4990,
      subtitle: "Pelos sensíveis",
      title: "Shampoo Pet 500ml",
    },
    {
      attributesJson: toAttributesJson({
        size: "M",
      }),
      connectionId: "conn_carrefour",
      createdAt: nowIso,
      currency: "BRL",
      id: "sku_carrefour_brinq_bola",
      imageUrl: null,
      isActive: true,
      kind: "sku" as const,
      priceCents: 1990,
      subtitle: "Borracha • Média",
      title: "Brinquedo Bola",
    },
  ];

  await db.insert(schema.connectionCatalogItems).values(
    catalogItems.map((i) => ({
      ...i,
      imageUrl: i.imageUrl ?? undefined,
      subtitle: i.subtitle ?? undefined,
    }))
  );
};
