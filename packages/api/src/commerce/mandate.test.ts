import { describe, expect, it } from "bun:test";

import { evaluatePurchaseMandate } from "./mandate";

const activeMandate = {
  allowedMerchantIdsJson: JSON.stringify(["conn_petz"]),
  expiresAt: "2026-12-31T23:59:59.000Z",
  id: "mandate_1",
  isActive: true,
  maxAmountCents: 20_000,
};

describe("evaluatePurchaseMandate", () => {
  it("approves an in-scope purchase", () => {
    expect(
      evaluatePurchaseMandate({
        mandate: activeMandate,
        merchantId: "conn_petz",
        now: new Date("2026-08-30T12:00:00.000Z"),
        totalCents: 18_990,
      })
    ).toEqual({ approved: true, mandateId: "mandate_1" });
  });

  it.each([
    ["inactive", { ...activeMandate, isActive: false }, "conn_petz", 18_990],
    [
      "expired",
      { ...activeMandate, expiresAt: "2026-01-01T00:00:00.000Z" },
      "conn_petz",
      18_990,
    ],
    ["merchant_not_allowed", activeMandate, "conn_raia", 4990],
    ["over_limit", activeMandate, "conn_petz", 20_001],
  ] as const)("denies %s", (reason, mandate, merchantId, totalCents) => {
    expect(
      evaluatePurchaseMandate({
        mandate,
        merchantId,
        now: new Date("2026-08-30T12:00:00.000Z"),
        totalCents,
      })
    ).toEqual({ approved: false, reason });
  });
});
