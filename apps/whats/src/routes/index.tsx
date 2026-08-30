import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { conversations } from "@/fixtures/conversations";
import { trpcClient } from "@/utils/trpc";
import { useLocalConversation } from "@/whatsapp/use-local-conversation";
import { WhatsComposer } from "@/whatsapp/whats-composer";
import { WhatsDesktopShell } from "@/whatsapp/whats-desktop-shell";
import { WhatsMessageList } from "@/whatsapp/whats-message-list";

const WhatsPlaceholder = () => {
  const selectedConversation =
    conversations.find((conversation) => conversation.id === "yuno-commerce") ??
    conversations[0];
  const [isMetaFlowsOpen, setIsMetaFlowsOpen] = useState(false);
  const [hasSavedPaymentMethod, setHasSavedPaymentMethod] = useState<
    boolean | null
  >(null);
  const checkoutWindowRef = useRef<Window | null>(null);
  const paymentMethodMessageIdRef = useRef<string | null>(null);
  const {
    checkoutOrderId,
    closeCheckout,
    completePayment,
    error,
    isSubmitting,
    messages,
    openCheckout,
    resetChat,
    sendAction,
    sendMessage,
    sessionId,
  } = useLocalConversation();
  const latestPaidMessageId = messages
    .toReversed()
    .find((message) => message.kind === "paid_status")?.id;

  useEffect(() => {
    if (paymentMethodMessageIdRef.current === latestPaidMessageId) {
      return;
    }
    paymentMethodMessageIdRef.current = latestPaidMessageId ?? null;

    const loadSavedPaymentMethod = async () => {
      try {
        const savedPaymentMethod =
          await trpcClient.commerce.getDefaultPaymentMethod.query({});
        setHasSavedPaymentMethod(Boolean(savedPaymentMethod));
      } catch {
        setHasSavedPaymentMethod(false);
      }
    };
    void loadSavedPaymentMethod();
  }, [latestPaidMessageId]);

  useEffect(() => {
    if (!checkoutOrderId || !checkoutWindowRef.current) {
      return;
    }

    const checkoutWindow = checkoutWindowRef.current;
    const search = new URLSearchParams({ orderId: checkoutOrderId });
    if (sessionId) {
      search.set("sessionId", sessionId);
    }
    checkoutWindow.location.assign(`/checkout?${search.toString()}`);
    checkoutWindowRef.current = null;
    closeCheckout();
  }, [checkoutOrderId, closeCheckout, sessionId]);

  useEffect(() => {
    const handleCheckoutReturned = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        "type" in event.data &&
        event.data.type === "yuno-checkout-returned"
      ) {
        closeCheckout();
      }
    };
    window.addEventListener("message", handleCheckoutReturned);
    return () => window.removeEventListener("message", handleCheckoutReturned);
  }, [closeCheckout]);

  return (
    <WhatsDesktopShell
      conversations={conversations}
      isMetaFlowsOpen={isMetaFlowsOpen}
      onCloseMetaFlows={() => setIsMetaFlowsOpen(false)}
      checkoutOrderId={checkoutOrderId}
      onCloseCheckout={closeCheckout}
      onCompletePayment={async (orderId, savedPaymentMethod) => {
        await completePayment(orderId, savedPaymentMethod);
      }}
      onResetChat={resetChat}
      selectedConversation={selectedConversation}
      sessionId={sessionId}
    >
      <WhatsMessageList
        error={error}
        isTyping={isSubmitting}
        messages={messages}
        onAction={(action, catalogItemId, orderId, sourceMessageId) => {
          if (action === "Adicionar categoria") {
            setIsMetaFlowsOpen(true);
            return;
          }
          const isCheckoutAction =
            action === "pay_now" ||
            action === "confirm_payment" ||
            action === "confirm" ||
            action === "Confirmar compra";
          const normalizedOrderId = orderId?.trim();
          if (isCheckoutAction && normalizedOrderId) {
            openCheckout(normalizedOrderId);
            return;
          }
          if (action === "confirm_order" && hasSavedPaymentMethod === false) {
            checkoutWindowRef.current = window.open("about:blank", "_blank");
          }
          void sendAction(action, catalogItemId, sourceMessageId);
        }}
      />
      <WhatsComposer isSubmitting={isSubmitting} onSubmit={sendMessage} />
    </WhatsDesktopShell>
  );
};

export const Route = createFileRoute("/")({
  component: WhatsPlaceholder,
});
