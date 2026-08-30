import { expect, test } from "bun:test";

import {
  getCheckoutOrderId,
  getProductDetailMessage,
} from "./use-local-conversation";

test("renders product details with one direct confirmation action", () => {
  expect(
    getProductDetailMessage(
      {
        catalogItemId: "sku_petz_racao_premium_10kg",
        price: "R$ 189,90",
        subtitle: "Adulto • Frango",
        title: "Premium Pet Food 10kg",
      },
      "message_1",
      "2026-08-30T12:00:00.000Z"
    )
  ).toMatchObject({
    actionLabel: "Confirm order",
    catalogItemId: "sku_petz_racao_premium_10kg",
    kind: "product_detail",
  });
});

test("marks a detail action as started when it was already confirmed", () => {
  expect(
    getProductDetailMessage(
      {
        catalogItemId: "sku_petz_racao_premium_10kg",
        price: "R$ 189,90",
        subtitle: "Adulto • Frango",
        title: "Premium Pet Food 10kg",
      },
      "message_1",
      "2026-08-30T12:00:00.000Z",
      true
    ).isOrderStarted
  ).toBe(true);
});

test("extracts the checkout order ID from an opening response", () => {
  expect(getCheckoutOrderId({ openCheckout: true, orderId: "order_1" })).toBe(
    "order_1"
  );
  expect(getCheckoutOrderId({ openCheckout: true })).toBeNull();
});
