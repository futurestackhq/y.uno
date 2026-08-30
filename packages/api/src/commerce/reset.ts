import type { Db } from "@hackathon/db";
import { schema } from "@hackathon/db";

export const commerceResetTableNames = [
  "order_items",
  "orders",
  "payment_methods",
  "purchase_mandates",
  "execution_logs",
  "jobs",
  "messages",
  "message_queue",
  "host_plans",
  "commerce_turns",
  "sessions",
  "connection_catalog_items",
  "connections",
] as const;

export const canDelegatePlan = ({
  baseRevision,
  sessionRevision,
}: {
  baseRevision: number;
  sessionRevision: number;
}) =>
  // Persisting a host plan advances the session revision by one. A later
  // revision means that a newer user turn has superseded this plan.
  baseRevision + 1 === sessionRevision;

/**
 * Clears only commerce-owned state. D1 batches are atomic, and every delete is
 * idempotent, so retrying a reset is safe. Users are deliberately preserved:
 * the demo user is account data used by the harness, not demo history.
 */
export const resetCommerceDemoData = async (db: Db) => {
  await db.batch([
    db.delete(schema.orderItems),
    db.delete(schema.orders),
    db.delete(schema.paymentMethods),
    db.delete(schema.purchaseMandates),
    db.delete(schema.executionLogs),
    db.delete(schema.jobs),
    db.delete(schema.messages),
    db.delete(schema.messageQueue),
    db.delete(schema.hostPlans),
    db.delete(schema.commerceTurns),
    db.delete(schema.sessions),
    db.delete(schema.connectionCatalogItems),
    db.delete(schema.connections),
  ]);

  return {
    ok: true,
    preserved: ["users"] as const,
    tables: commerceResetTableNames,
  } as const;
};
