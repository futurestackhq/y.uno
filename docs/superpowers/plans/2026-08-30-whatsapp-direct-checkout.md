# WhatsApp Direct Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a product detail's **Confirmar pedido** action create the order and open checkout directly, with no duplicate purchase-confirmation bubble.

**Architecture:** Keep the product detail as the presentation boundary in `apps/whats`, but make its CTA emit `confirm_order`. The backend handles that deterministic quick reply by creating one draft order and returning a terminal response that carries the `orderId` without rendering a purchase summary. The WhatsApp route opens `WhatsCheckoutPanel` from that response.

**Tech Stack:** React 19, TypeScript, TanStack Router, tRPC, Hono/Cloudflare Workers, Drizzle/D1, Bun test.

## Global Constraints

- The flow is `Ver detalhes → Confirmar pedido → checkout lateral → Confirmar pagamento`.
- Do not render **Comprar**, **Compra criada**, or **Confirmar compra** after selecting a product detail.
- Preserve the existing `checkout_returned` payment confirmation flow.
- A missing `catalogItemId` or `orderId` must not open checkout.
- Validate with `bun test`, `bun run check-types`, and `bun x ultracite check`.
- Do not create a git commit unless the user explicitly requests one.

---

### Task 1: Define the direct-confirmation protocol

**Files:**
- Modify: `packages/api/src/commerce/types.ts:25-50`
- Modify: `packages/api/src/commerce/dispatcher.test.ts:1-41`

**Interfaces:**
- Consumes: `quickReplyActionSchema` and the quick-reply branch of `Envelope`.
- Produces: `QuickReplyAction` including `"confirm_order"` and `getInboundFollowUpText()` support for that action.

- [ ] **Step 1: Write the failing contract test**

```ts
it("accepts the direct order confirmation action", () => {
  const envelope: Envelope = {
    action: "confirm_order",
    catalogItemId: "item_1",
    sessionId: "session_1",
    type: "quick_reply",
    userId: "user_1",
  };

  expect(getInboundFollowUpText(envelope)).toContain("confirm_order");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/api/src/commerce/dispatcher.test.ts`

Expected: TypeScript/test validation rejects `"confirm_order"`.

- [ ] **Step 3: Add the protocol value**

```ts
export const quickReplyActionSchema = z.enum([
  "details",
  "confirm_order",
  "buy",
  "pay_now",
  "swap_card",
  "confirm_payment",
]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/api/src/commerce/dispatcher.test.ts`

Expected: PASS.

### Task 2: Create orders from direct confirmation

**Files:**
- Modify: `packages/api/src/commerce/dispatcher.ts:293-373`
- Test: `packages/api/src/commerce/dispatcher.test.ts`

**Interfaces:**
- Consumes: `{ type: "quick_reply", action: "confirm_order", catalogItemId, sessionId, userId }`.
- Produces: one draft order and `buildDirectCheckoutMessage(orderId)` returning `{ openCheckout: true, orderId, text: "Pedido pronto para pagamento." }`.

- [ ] **Step 1: Add a failing response-contract test**

Export `buildDirectCheckoutMessage` from `dispatcher.ts` and add this unit test:

```ts
it("builds the direct checkout response", () => {
  expect(buildDirectCheckoutMessage("order_1")).toEqual({
  openCheckout: true,
    orderId: "order_1",
    text: "Pedido pronto para pagamento.",
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun test packages/api/src/commerce/dispatcher.test.ts`

Expected: `buildDirectCheckoutMessage` is not exported.

- [ ] **Step 3: Implement the deterministic branch**

Add the helper below `nowIso`, then change the existing product-action branch so `confirm_order` shares the one-order creation transaction with the legacy `buy` action. For `confirm_order`, write exactly one terminal text response:

```ts
export const buildDirectCheckoutMessage = (orderId: string) => ({
  openCheckout: true,
  orderId,
  text: "Pedido pronto para pagamento.",
});

// in the confirm_order branch
content: buildDirectCheckoutMessage(orderId),
type: "text",
```

Return immediately after writing that response. Do not create a `purchase_summary` message in this branch.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `bun test packages/api/src/commerce/dispatcher.test.ts`

Expected: PASS.

### Task 3: Make the detail bubble confirm the order

**Files:**
- Modify: `apps/whats/src/whatsapp/use-local-conversation.ts:45-185`
- Modify: `apps/whats/src/whatsapp/whats-interactive-message.tsx:95-117`

**Interfaces:**
- Consumes: product detail content `{ catalogItemId, title, description, price }`.
- Produces: `WhatsMessage` with `kind: "product_detail"` and CTA action `"confirm_order"`.

- [ ] **Step 1: Add a failing mapper test**

Export `getProductDetailMessage(content, id, createdAt)` from `use-local-conversation.ts`, with `content` typed as `Record<string, unknown>`. Create `apps/whats/src/whatsapp/use-local-conversation.test.ts`:

```ts
it("renders product details with one direct confirmation action", () => {
  expect(
    getProductDetailMessage(
      {
        catalogItemId: "sku_petz_racao_premium_10kg",
        price: "R$ 189,90",
        subtitle: "Adulto • Frango",
        title: "Ração Premium 10kg",
      },
      "message_1",
      "2026-08-30T12:00:00.000Z"
    )
  ).toMatchObject({
    actionLabel: "Confirmar pedido",
    catalogItemId: "sku_petz_racao_premium_10kg",
    kind: "product_detail",
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/whats/src/whatsapp/use-local-conversation.test.ts`

Expected: `getProductDetailMessage` is not exported.

- [ ] **Step 3: Implement the UI action**

Set the mapped detail CTA label to `"Confirmar pedido"` and wire it to:

```tsx
<InteractiveButton
  action="confirm_order"
  label={message.actionLabel}
  onAction={(action) => onAction(action, message.catalogItemId)}
/>
```

Call `getProductDetailMessage` from `getRemoteMessage` when the remote row is an assistant detail message. The UI must retain the existing `catalogItemId` when invoking `onAction`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test apps/whats/src/whatsapp/use-local-conversation.test.ts`

Expected: PASS.

### Task 4: Open checkout from the direct-confirmation response

**Files:**
- Modify: `apps/whats/src/whatsapp/use-local-conversation.ts:211-350`
- Modify: `apps/whats/src/routes/index.tsx:16-59`

**Interfaces:**
- Consumes: remote assistant text content `{ openCheckout: true, orderId: string }`.
- Produces: `checkoutOrderId` state set to that `orderId`.

- [ ] **Step 1: Add a failing callback test**

Add this test to `apps/whats/src/whatsapp/use-local-conversation.test.ts` after exporting `getCheckoutOrderId`:

```ts
expect(getCheckoutOrderId({ openCheckout: true, orderId: "order_1" }))
  .toBe("order_1");
expect(getCheckoutOrderId({ openCheckout: true })).toBeNull();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/whats/src/whatsapp/use-local-conversation.test.ts`

Expected: helper does not exist or returns `null`.

- [ ] **Step 3: Implement response-driven opening**

Expose `pendingCheckoutOrderId` from `useLocalConversation`. When the polling mapper receives an assistant message whose parsed content has `openCheckout: true` and a string `orderId`, set it. In `routes/index.tsx`, use an effect to move that value into `checkoutOrderId` and clear the pending value. Keep existing support for `pay_now` and `confirm_payment`.

- [ ] **Step 4: Run tests and typecheck**

Run: `bun test apps/whats/src/whatsapp/use-local-conversation.test.ts && bun run check-types`

Expected: PASS.

### Task 5: Verify the whole commerce journey

**Files:**
- Modify: none unless verification reveals a defect.

**Interfaces:**
- Consumes: live local app at `apps/whats`.
- Produces: verified direct checkout behavior.

- [ ] **Step 1: Reset the demo**

Select **Resetar chat** in the WhatsApp header.

Expected: message list is empty and no open checkout state remains.

- [ ] **Step 2: Exercise the direct route**

Send a product-search message, select **Ver detalhes**, then select **Confirmar pedido**.

Expected: checkout opens directly after the order is created; no **Comprar**, **Compra criada**, or **Confirmar compra** message appears.

- [ ] **Step 3: Confirm payment**

Select **Confirmar pagamento** in `WhatsCheckoutPanel`.

Expected: `checkout_returned` is sent and the paid-status bubble appears.

- [ ] **Step 4: Run repository validation**

Run: `bun test && bun run check-types && bun x ultracite check`

Expected: all commands exit with code 0.
