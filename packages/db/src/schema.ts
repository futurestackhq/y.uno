import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => new Date().toISOString();

export const users = sqliteTable("users", {
  createdAt: text("created_at").notNull().$defaultFn(now),
  displayName: text("display_name").notNull(),
  id: text("id").primaryKey(),
});

export const connections = sqliteTable("connections", {
  commissionBps: integer("commission_bps").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  displayName: text("display_name").notNull(),
  id: text("id").primaryKey(),
  slaMinutesDefault: integer("sla_minutes_default").notNull(),
  slug: text("slug").notNull(),
  type: text("type", { enum: ["product", "service"] }).notNull(),
});

export const connectionCatalogItems = sqliteTable("connection_catalog_items", {
  attributesJson: text("attributes_json").notNull(),
  connectionId: text("connection_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  currency: text("currency").notNull(),
  id: text("id").primaryKey(),
  imageUrl: text("image_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  kind: text("kind", { enum: ["sku", "service"] }).notNull(),
  priceCents: integer("price_cents").notNull(),
  subtitle: text("subtitle"),
  title: text("title").notNull(),
});

export const sessions = sqliteTable("sessions", {
  contextJson: text("context_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().$defaultFn(now),
  expiresAt: text("expires_at"),
  id: text("id").primaryKey(),
  intent: text("intent").notNull(),
  planJson: text("plan_json").notNull(),
  requirementsJson: text("requirements_json").notNull(),
  revision: integer("revision").notNull().default(0),
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
  updatedAt: text("updated_at").notNull().$defaultFn(now),
  userId: text("user_id").notNull(),
});

export const hostPlans = sqliteTable(
  "host_plans",
  {
    baseRevision: integer("base_revision").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(now),
    decisionJson: text("decision_json").notNull(),
    decisionSummary: text("decision_summary").notNull(),
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    status: text("status", {
      enum: ["persisted", "delegated", "superseded", "completed", "failed"],
    }).notNull(),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
  },
  (table) => ({
    sessionRevisionUnique: uniqueIndex("host_plans_session_revision_unique").on(
      table.sessionId,
      table.baseRevision
    ),
  })
);

export const messages = sqliteTable("messages", {
  contentJson: text("content_json").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  id: text("id").primaryKey(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  sessionId: text("session_id"),
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
  userId: text("user_id").notNull(),
});

export const messageQueue = sqliteTable(
  "message_queue",
  {
    error: text("error"),
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key"),
    payloadJson: text("payload_json").notNull(),
    receivedAt: text("received_at").notNull().$defaultFn(now),
    status: text("status", {
      enum: ["pending", "processing", "done", "failed"],
    }).notNull(),
    type: text("type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => ({
    userIdIdempotencyKeyUnique: uniqueIndex(
      "message_queue_user_id_idempotency_key_unique"
    ).on(table.userId, table.idempotencyKey),
  })
);

export const jobs = sqliteTable("jobs", {
  attempts: integer("attempts").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  errorText: text("error_text"),
  finishedAt: text("finished_at"),
  id: text("id").primaryKey(),
  inputJson: text("input_json").notNull(),
  kind: text("kind").notNull(),
  leaseExpiresAt: text("lease_expires_at"),
  nextRunAt: text("next_run_at"),
  nodeId: text("node_id"),
  planId: text("plan_id"),
  promptText: text("prompt_text"),
  resultJson: text("result_json"),
  sessionId: text("session_id").notNull(),
  startedAt: text("started_at"),
  status: text("status", {
    enum: ["queued", "running", "done", "failed"],
  }).notNull(),
  subagentName: text("subagent_name"),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const executionLogs = sqliteTable("execution_logs", {
  createdAt: text("created_at").notNull().$defaultFn(now),
  dataJson: text("data_json").notNull(),
  eventType: text("event_type").notNull(),
  id: text("id").primaryKey(),
  jobId: text("job_id"),
  level: text("level", { enum: ["info", "warn", "error"] }).notNull(),
  line: text("line"),
  sessionId: text("session_id").notNull(),
});

export const orders = sqliteTable("orders", {
  connectionId: text("connection_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  currency: text("currency").notNull(),
  id: text("id").primaryKey(),
  paymentMethodId: text("payment_method_id"),
  sessionId: text("session_id").notNull(),
  status: text("status", {
    enum: ["draft", "checkout_started", "paid", "failed", "fulfilled"],
  }).notNull(),
  totalCents: integer("total_cents").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const orderItems = sqliteTable("order_items", {
  catalogItemId: text("catalog_item_id").notNull(),
  id: text("id").primaryKey(),
  lineTotalCents: integer("line_total_cents").notNull(),
  orderId: text("order_id").notNull(),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export const paymentMethods = sqliteTable("payment_methods", {
  brand: text("brand").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
  id: text("id").primaryKey(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  last4: text("last4").notNull(),
  token: text("token").notNull(),
  userId: text("user_id").notNull(),
});

export const schema = {
  connectionCatalogItems,
  connections,
  executionLogs,
  hostPlans,
  jobs,
  messageQueue,
  messages,
  orderItems,
  orders,
  paymentMethods,
  sessions,
  users,
} as const;
