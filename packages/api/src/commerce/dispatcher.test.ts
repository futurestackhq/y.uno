import { describe, expect, it } from "bun:test";

import { getInboundFollowUpText } from "./types";
import type { Envelope } from "./types";

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
