import { z } from "zod";

export const sessionStatusSchema = z.enum([
  "active",
  "awaiting_user",
  "checkout_pending",
  "done",
  "expired",
  "failed",
  "planning",
  "waiting_results",
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const hostJobKindSchema = z.enum([
  "host_plan",
  "host_synthesis",
  "catalog_search",
  "catalog_details",
  "create_order",
  "prepare_checkout",
]);
export type HostJobKind = z.infer<typeof hostJobKindSchema>;

export const quickReplyActionSchema = z.enum([
  "details",
  "buy",
  "pay_now",
  "swap_card",
  "confirm_payment",
]);
export type QuickReplyAction = z.infer<typeof quickReplyActionSchema>;

export const envelopeSchema = z.discriminatedUnion("type", [
  z.object({
    idempotencyKey: z.string().optional(),
    // If present, we treat as a follow-up in that session.
    sessionId: z.string().optional(),
    text: z.string().min(1),
    type: z.literal("user_text"),
    userId: z.string(),
  }),
  z.object({
    action: quickReplyActionSchema,
    catalogItemId: z.string().optional(),
    idempotencyKey: z.string().optional(),
    orderId: z.string().optional(),
    sessionId: z.string(),
    type: z.literal("quick_reply"),
    userId: z.string(),
  }),
  z.object({
    brand: z.string().optional(),
    idempotencyKey: z.string().optional(),
    last4: z.string().optional(),
    orderId: z.string(),
    sessionId: z.string(),
    status: z.enum(["paid", "failed"]),
    token: z.string().optional(),
    tokenSaved: z.boolean().optional(),
    type: z.literal("checkout_returned"),
    userId: z.string(),
  }),
]);

export type Envelope = z.infer<typeof envelopeSchema>;

export const getInboundFollowUpText = (envelope: Envelope): string => {
  if (envelope.type === "user_text") {
    return envelope.text;
  }
  if (envelope.type === "quick_reply") {
    return `User selected quick reply: ${envelope.action}`;
  }
  return `Checkout returned with status: ${envelope.status}`;
};
