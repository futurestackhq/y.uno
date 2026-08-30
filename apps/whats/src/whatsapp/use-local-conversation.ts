import { useCallback, useEffect, useRef, useState } from "react";

import type { WhatsMessage } from "@/fixtures/messages";
import { trpcClient } from "@/utils/trpc";

const DEMO_USER_ID = "user_marta";

const getRemoteText = (contentJson: string) => {
  try {
    const parsed: unknown = JSON.parse(contentJson);
    if (
      parsed &&
      typeof parsed === "object" &&
      "text" in parsed &&
      typeof parsed.text === "string"
    ) {
      return parsed.text;
    }
  } catch {
    // The API can return plain text content.
  }
  return contentJson;
};

const getObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const getArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const getValue = (object: Record<string, unknown> | null, key: string) =>
  typeof object?.[key] === "string" ? object[key] : "";

const getOrderId = (content: Record<string, unknown> | null) =>
  getValue(content, "orderId") || getValue(content, "order_id");

export interface SavedPaymentMethod {
  brand: string;
  last4: string;
  token: string;
}

export const getCheckoutOrderId = (content: Record<string, unknown>) =>
  content.openCheckout === true && typeof content.orderId === "string"
    ? content.orderId
    : null;

export const getProductDetailMessage = (
  content: Record<string, unknown>,
  id: string,
  createdAt: string,
  isOrderStarted = false
): Extract<WhatsMessage, { kind: "product_detail" }> => ({
  actionLabel: "Confirmar pedido",
  catalogItemId: getValue(content, "catalogItemId"),
  description:
    getValue(content, "subtitle") || getValue(content, "description"),
  direction: "in",
  id,
  isOrderStarted,
  kind: "product_detail",
  price: getValue(content, "price"),
  time: new Date(createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }),
  title: getValue(content, "title"),
});

const getQuickReplyText = (quickReply: string) =>
  ({
    buy: "Comprar este item",
    confirm_payment: "Confirmar compra",
    details: "Ver detalhes do item",
    pay_now: "Pagar agora",
    swap_card: "Trocar cartão",
  })[quickReply] ?? quickReply;

// oxlint-disable-next-line complexity
const getRemoteMessage = (
  row: Awaited<
    ReturnType<typeof trpcClient.commerce.getMessages.query>
  >[number],
  orderStartedSourceMessageIds: ReadonlySet<string>
): WhatsMessage => {
  const parsed = (() => {
    try {
      return JSON.parse(row.contentJson) as unknown;
    } catch {
      return null;
    }
  })();
  const content = getObject(parsed);

  if (row.role === "user" && content?.status === "paid") {
    return {
      direction: "out",
      id: row.id,
      kind: "paid_status",
      subtitle: "Response sent",
      time: new Date(row.createdAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      title: "Confirmar",
    };
  }

  if (row.role === "assistant" && content) {
    const catalogItemId = getValue(content, "catalogItemId");
    const title = getValue(content, "title");
    const price = getValue(content, "price");
    if (catalogItemId && title && price) {
      return getProductDetailMessage(
        content,
        row.id,
        row.createdAt,
        orderStartedSourceMessageIds.has(row.id)
      );
    }
  }

  if (row.type === "carousel" && content) {
    const cards = getArray(content.cards).flatMap((rawCard, index) => {
      const card = getObject(rawCard);
      const ctas = getArray(card?.ctas).flatMap((rawCta) => {
        const cta = getObject(rawCta);
        const label = getValue(cta, "label");
        return label ? [label] : [];
      });
      const title = getValue(card, "title");
      if (!title || ctas.length === 0) {
        return [];
      }
      return [
        {
          actionLabel: ctas[0] ?? "Ver detalhes",
          description: getValue(card, "subtitle") || getValue(card, "merchant"),
          eyebrow: getValue(card, "merchant") || "Opção",
          id: getValue(card, "id") || `remote-card-${index}`,
          price: getValue(card, "price"),
          title,
          tone: [
            "from-[#d9fdd3] to-[#a9e6cf]",
            "from-[#d9eefa] to-[#b7d8e8]",
            "from-[#fce3c5] to-[#efbd89]",
            "from-[#e8d8f5] to-[#c6b0df]",
          ][index % 4],
        },
      ];
    });

    if (cards.length > 0) {
      return {
        cards,
        direction: "in",
        id: row.id,
        kind: "carousel",
        time: new Date(row.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: getValue(content, "title") || "Opções para você:",
      };
    }
  }

  if (row.type === "purchase_summary" && content) {
    const actions = getArray(content.buttons).flatMap((rawButton) => {
      const button = getObject(rawButton);
      const id = getValue(button, "action");
      const label = getValue(button, "label");
      return id && label ? [{ id, kind: "primary" as const, label }] : [];
    });

    if (actions.length > 0) {
      return {
        actions,
        description: getValue(content, "subtitle"),
        direction: "in",
        id: row.id,
        kind: "purchase_summary",
        merchant: getValue(content, "merchant"),
        orderId: getOrderId(content) || undefined,
        time: new Date(row.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: getValue(content, "title") || "Resumo do pedido",
        total: getValue(content, "total"),
      };
    }
  }

  return {
    direction: row.role === "user" ? "out" : "in",
    id: row.id,
    kind: "text",
    state: row.role === "user" ? "read" : undefined,
    text:
      row.role === "user" && typeof content?.quickReply === "string"
        ? getQuickReplyText(content.quickReply)
        : getRemoteText(row.contentJson),
    time: new Date(row.createdAt).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const toWhatsMessages = (
  rows: Awaited<ReturnType<typeof trpcClient.commerce.getMessages.query>>,
  orderStartedSourceMessageIds: ReadonlySet<string>
): WhatsMessage[] =>
  rows.map((row) => getRemoteMessage(row, orderStartedSourceMessageIds));

const getOrderStartedSourceMessageIds = (
  rows: Awaited<ReturnType<typeof trpcClient.commerce.getMessages.query>>
) => {
  const sourceMessageIds = new Set<string>();
  for (const row of rows) {
    if (row.role !== "user") {
      continue;
    }
    try {
      const content = getObject(JSON.parse(row.contentJson) as unknown);
      if (
        content?.quickReply === "confirm_order" &&
        typeof content.sourceMessageId === "string"
      ) {
        sourceMessageIds.add(content.sourceMessageId);
      }
    } catch {
      // The message does not contain structured quick-reply content.
    }
  }
  return sourceMessageIds;
};

const getCheckoutResponse = (
  rows: Awaited<ReturnType<typeof trpcClient.commerce.getMessages.query>>
) => {
  for (const row of rows.toReversed()) {
    if (row.role !== "assistant") {
      continue;
    }
    try {
      const content = getObject(JSON.parse(row.contentJson) as unknown);
      const orderId = content ? getCheckoutOrderId(content) : null;
      if (orderId) {
        return { messageId: row.id, orderId };
      }
    } catch {
      // The message does not contain structured checkout content.
    }
  }
  return null;
};

const wait = async (milliseconds: number) => {
  // oxlint-disable-next-line promise/avoid-new
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const loadLatestRemoteMessages = async (currentSessionId: string | null) => {
  const sessions = await trpcClient.commerce.getSessions.query({
    userId: DEMO_USER_ID,
  });
  const session =
    sessions.find((candidate) => candidate.id === currentSessionId) ??
    sessions[0];
  if (!session) {
    return null;
  }
  const remoteMessages = await trpcClient.commerce.getMessages.query({
    sessionId: session.id,
  });
  return { messages: remoteMessages, sessionId: session.id };
};

export const useLocalConversation = () => {
  const [messages, setMessages] = useState<WhatsMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [orderStartedSourceMessageIds, setOrderStartedSourceMessageIds] =
    useState<ReadonlySet<string>>(() => new Set());
  const resetVersionRef = useRef(0);
  const checkoutMessageIdsRef = useRef(new Set<string>());

  const applyRemoteMessages = useCallback(
    (
      remoteMessages: Awaited<
        ReturnType<typeof trpcClient.commerce.getMessages.query>
      >
    ) => {
      const remoteOrderSourceIds =
        getOrderStartedSourceMessageIds(remoteMessages);
      const nextOrderSourceIds = new Set([
        ...orderStartedSourceMessageIds,
        ...remoteOrderSourceIds,
      ]);
      const checkoutResponse = getCheckoutResponse(remoteMessages);
      if (
        checkoutResponse &&
        !checkoutMessageIdsRef.current.has(checkoutResponse.messageId)
      ) {
        checkoutMessageIdsRef.current.add(checkoutResponse.messageId);
        setCheckoutOrderId(checkoutResponse.orderId);
      }
      setOrderStartedSourceMessageIds(nextOrderSourceIds);
      setMessages(toWhatsMessages(remoteMessages, nextOrderSourceIds));
    },
    [orderStartedSourceMessageIds]
  );

  useEffect(() => {
    let isActive = true;
    let isPolling = false;

    const pollRemoteConversation = async () => {
      if (isPolling) {
        return;
      }
      isPolling = true;
      const requestVersion = resetVersionRef.current;
      try {
        const pendingWork = await trpcClient.commerce.getPendingWork.query({
          sessionId: sessionId ?? undefined,
          userId: DEMO_USER_ID,
        });
        if (pendingWork.pending) {
          await trpcClient.commerce.tick.mutate();
        }
        const remote = await loadLatestRemoteMessages(sessionId);
        if (
          !remote &&
          isActive &&
          requestVersion === resetVersionRef.current &&
          sessionId
        ) {
          setSessionId(null);
          setMessages([]);
        }
        if (isActive && requestVersion === resetVersionRef.current && remote) {
          setSessionId(remote.sessionId);
          applyRemoteMessages(remote.messages);
          setIsSubmitting(pendingWork.pending);
        }
      } catch {
        // The chat remains usable while the API is temporarily unavailable.
        isPolling = false;
      }
      isPolling = false;
    };

    void pollRemoteConversation();
    const intervalId = window.setInterval(() => {
      void pollRemoteConversation();
    }, 500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [applyRemoteMessages, sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const normalizedText = text.trim();

      if (!normalizedText || isSubmitting) {
        return;
      }

      setError(null);
      setMessages((current) => [
        ...current,
        {
          direction: "out",
          id: `outgoing-${Date.now()}`,
          kind: "text",
          state: "read",
          text: normalizedText,
          time: "agora",
        },
      ]);
      setIsSubmitting(true);
      try {
        const requestVersion = resetVersionRef.current;
        await trpcClient.commerce.sendEnvelope.mutate({
          idempotencyKey: `whats-${Date.now()}`,
          sessionId: sessionId ?? undefined,
          text: normalizedText,
          type: "user_text",
          userId: DEMO_USER_ID,
        });
        for (let attempt = 0; attempt < 30; attempt += 1) {
          // oxlint-disable-next-line no-await-in-loop
          await wait(500);
          // oxlint-disable-next-line no-await-in-loop
          const remote = await loadLatestRemoteMessages(sessionId);
          if (requestVersion !== resetVersionRef.current) {
            setIsSubmitting(false);
            return;
          }
          if (!remote) {
            continue;
          }
          setSessionId(remote.sessionId);
          if (remote.messages.length > messages.length + 1) {
            applyRemoteMessages(remote.messages);
            setIsSubmitting(false);
            return;
          }
        }
        setIsSubmitting(false);
        return;
      } catch {
        setError("Não foi possível conectar ao commerce.");
      }
      setIsSubmitting(false);
    },
    [applyRemoteMessages, isSubmitting, messages.length, sessionId]
  );

  const sendAction = useCallback(
    async (
      action: string,
      catalogItemId?: string,
      sourceMessageId?: string
    ) => {
      if (!sessionId) {
        return;
      }
      if (
        action !== "details" &&
        action !== "buy" &&
        action !== "confirm_order" &&
        action !== "pay_now" &&
        action !== "swap_card" &&
        action !== "confirm_payment"
      ) {
        return;
      }
      const isOrderConfirmation = action === "confirm_order";
      if (isOrderConfirmation) {
        if (!sourceMessageId) {
          return;
        }
        if (orderStartedSourceMessageIds.has(sourceMessageId)) {
          return;
        }
        setOrderStartedSourceMessageIds(
          (current) => new Set([...current, sourceMessageId])
        );
        setMessages((current) =>
          current.map((message) =>
            message.kind === "product_detail" && message.id === sourceMessageId
              ? { ...message, isOrderStarted: true }
              : message
          )
        );
      }
      try {
        await trpcClient.commerce.sendEnvelope.mutate({
          action,
          catalogItemId,
          idempotencyKey: isOrderConfirmation
            ? `confirm_order:${sessionId}:${sourceMessageId}`
            : `quick_reply:${sessionId}:${action}:${Date.now()}`,
          sessionId,
          sourceMessageId,
          type: "quick_reply",
          userId: DEMO_USER_ID,
        });
        const remoteMessages = await trpcClient.commerce.getMessages.query({
          sessionId,
        });
        if (remoteMessages.length > 0) {
          applyRemoteMessages(remoteMessages);
        }
      } catch {
        if (isOrderConfirmation && sourceMessageId) {
          setOrderStartedSourceMessageIds((current) => {
            const next = new Set(current);
            next.delete(sourceMessageId);
            return next;
          });
          setMessages((current) =>
            current.map((message) =>
              message.kind === "product_detail" &&
              message.id === sourceMessageId
                ? { ...message, isOrderStarted: false }
                : message
            )
          );
        }
        setError("Não foi possível confirmar o pedido.");
      }
    },
    [applyRemoteMessages, orderStartedSourceMessageIds, sessionId]
  );

  const resetChat = useCallback(async () => {
    resetVersionRef.current += 1;
    try {
      await trpcClient.commerce.resetDemoData.mutate();
      setMessages([]);
      setError(null);
      setIsSubmitting(false);
      setSessionId(null);
      setCheckoutOrderId(null);
      setOrderStartedSourceMessageIds(new Set());
      checkoutMessageIdsRef.current.clear();
    } catch {
      setError("Não foi possível resetar o demo.");
    }
  }, []);

  const completePayment = useCallback(
    async (orderId: string, savedPaymentMethod?: SavedPaymentMethod) => {
      if (!sessionId) {
        return;
      }
      await trpcClient.commerce.sendEnvelope.mutate({
        brand: savedPaymentMethod?.brand,
        idempotencyKey: `checkout_returned:${orderId}`,
        last4: savedPaymentMethod?.last4,
        orderId,
        sessionId,
        status: "paid",
        token: savedPaymentMethod?.token,
        tokenSaved: false,
        type: "checkout_returned",
        userId: DEMO_USER_ID,
      });
      const remoteMessages = await trpcClient.commerce.getMessages.query({
        sessionId,
      });
      if (remoteMessages.length > 0) {
        applyRemoteMessages(remoteMessages);
      }
    },
    [applyRemoteMessages, sessionId]
  );

  const closeCheckout = useCallback(() => {
    setCheckoutOrderId(null);
  }, []);

  const openCheckout = useCallback((orderId: string) => {
    setCheckoutOrderId(orderId);
  }, []);

  return {
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
  };
};
