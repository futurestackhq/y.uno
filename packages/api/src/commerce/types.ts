import { z } from "zod";

export const sessionStatusSchema = z.enum([
  "active",
  "awaiting_user",
  "checkout_pending",
  "done",
  "expired",
  "failed",
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

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
