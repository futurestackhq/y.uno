import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = () => new Date().toISOString();

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  type: text("type", { enum: ["product", "service"] }).notNull(),
  commissionBps: integer("commission_bps").notNull(),
  slaMinutesDefault: integer("sla_minutes_default").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const connectionCatalogItems = sqliteTable("connection_catalog_items", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull(),
  kind: text("kind", { enum: ["sku", "service"] }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull(),
  imageUrl: text("image_url"),
  attributesJson: text("attributes_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  intent: text("intent").notNull(),
  status: text("status", {
    enum: [
      "active",
      "awaiting_user",
      "checkout_pending",
      "done",
      "expired",
      "failed",
    ],
  }).notNull(),
  requirementsJson: text("requirements_json").notNull(),
  planJson: text("plan_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
  expiresAt: text("expires_at"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  type: text("type", {
    enum: [
      "text",
      "carousel",
      "list",
      "flow_card",
      "receipt",
      "purchase_summary",
    ],
  }).notNull(),
  contentJson: text("content_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const messageQueue = sqliteTable("message_queue", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  receivedAt: text("received_at").notNull().$defaultFn(now),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status", {
    enum: ["pending", "processing", "done", "failed"],
  }).notNull(),
  error: text("error"),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  inputJson: text("input_json").notNull(),
  status: text("status", {
    enum: ["queued", "running", "done", "failed"],
  }).notNull(),
  leaseExpiresAt: text("lease_expires_at"),
  attempts: integer("attempts").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const executionLogs = sqliteTable("execution_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  level: text("level", { enum: ["info", "warn", "error"] }).notNull(),
  eventType: text("event_type").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  connectionId: text("connection_id").notNull(),
  paymentMethodId: text("payment_method_id"),
  status: text("status", {
    enum: ["draft", "checkout_started", "paid", "failed", "fulfilled"],
  }).notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  catalogItemId: text("catalog_item_id").notNull(),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
});

export const paymentMethods = sqliteTable("payment_methods", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  brand: text("brand").notNull(),
  last4: text("last4").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});
