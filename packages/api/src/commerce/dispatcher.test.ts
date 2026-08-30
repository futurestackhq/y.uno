import { describe, expect, it } from "bun:test";

import { buildDirectCheckoutMessage } from "./dispatcher";
import { envelopeSchema, getInboundFollowUpText } from "./types";
import type { Envelope } from "./types";

describe("direct checkout response", () => {
  it("builds the direct checkout response", () => {
    expect(buildDirectCheckoutMessage("order_1")).toEqual({
      openCheckout: true,
      orderId: "order_1",
      text: "Pedido pronto para pagamento.",
    });
  });
});

describe("inbound orchestration", () => {
  it("uses the user text from the envelope", () => {
    const envelope: Envelope = {
      idempotencyKey: "idem_1",
      text: "Quero comprar ração",
      type: "user_text",
      userId: "user_1",
    };

    expect(getInboundFollowUpText(envelope)).toBe("Quero comprar ração");
  });

  it("creates meaningful follow-up input for quick replies", () => {
    const envelope: Envelope = {
      action: "buy",
      catalogItemId: "item_1",
      sessionId: "session_1",
      type: "quick_reply",
      userId: "user_1",
    };

    expect(getInboundFollowUpText(envelope)).toContain("buy");
  });

  it("accepts the direct order confirmation action", () => {
    const envelope: Envelope = {
      action: "confirm_order",
      catalogItemId: "item_1",
      idempotencyKey: "confirm_order:session_1:message_1",
      sessionId: "session_1",
      sourceMessageId: "message_1",
      type: "quick_reply",
      userId: "user_1",
    };

    expect(getInboundFollowUpText(envelope)).toContain("confirm_order");
    expect(envelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("creates meaningful follow-up input for checkout returns", () => {
    const envelope: Envelope = {
      orderId: "order_1",
      sessionId: "session_1",
      status: "paid",
      type: "checkout_returned",
      userId: "user_1",
    };

    expect(getInboundFollowUpText(envelope)).toContain("paid");
  });
});
