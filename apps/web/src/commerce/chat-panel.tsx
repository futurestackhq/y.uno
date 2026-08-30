import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "@hackathon/ui/components/bubble";
import { Button } from "@hackathon/ui/components/button";
import { Card, CardContent } from "@hackathon/ui/components/card";
import { Input } from "@hackathon/ui/components/input";
import {
  Message,
  MessageContent,
  MessageGroup,
} from "@hackathon/ui/components/message";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@hackathon/ui/components/message-scroller";
import { FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessageRow {
  id: string;
  role: ChatRole;
  type: string;
  contentJson: string;
  createdAt: string;
  sessionId: string | null;
}

export type SendableEnvelope =
  | {
      type: "user_text";
      payload: { idempotencyKey: string; text: string; sessionId?: string };
    }
  | {
      type: "quick_reply";
      payload: {
        action: string;
        sessionId: string;
        catalogItemId?: string;
        orderId?: string;
      };
    };

interface CarouselCard {
  id: string;
  title: string;
  subtitle?: string | null;
  merchant: string;
  price: string;
  catalogItemId?: string;
  ctas: { action: string; label: string }[];
}

interface CarouselContent {
  cards: CarouselCard[];
}

interface PurchaseSummaryContent {
  title: string;
  subtitle?: string | null;
  merchant: string;
  total: string;
  paymentHint?: string;
  orderId: string;
  buttons: { action: string; label: string }[];
}

const parseContentJson = (contentJson: string): unknown => {
  try {
    return JSON.parse(contentJson) as unknown;
  } catch {
    return { text: contentJson };
  }
};

const getString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const getOrderId = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const v = value as { orderId?: unknown; order_id?: unknown };
  return getString(v.orderId) ?? getString(v.order_id);
};

const getQuickReplyMessage = (value: unknown): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { quickReply } = value as { quickReply?: unknown };
  if (quickReply === "details") {
    return "Ver detalhes do item";
  }
  if (quickReply === "buy") {
    return "Comprar este item";
  }
  if (quickReply === "pay_now") {
    return "Pagar agora";
  }
  if (quickReply === "swap_card") {
    return "Trocar cartão";
  }
  if (quickReply === "confirm_payment") {
    return "Confirmar compra";
  }
  return null;
};

const isPaidCheckoutReturn = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const { orderId, status } = value as {
    orderId?: unknown;
    status?: unknown;
  };
  return typeof orderId === "string" && status === "paid";
};

const normalizeCtas = (value: unknown): CarouselCard["ctas"] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const ctas: CarouselCard["ctas"] = [];
  for (const rawCta of value) {
    if (!rawCta || typeof rawCta !== "object") {
      continue;
    }
    const cta = rawCta as { action?: unknown; label?: unknown };
    const action = getString(cta.action);
    const label = getString(cta.label);
    if (!action || !label) {
      continue;
    }
    ctas.push({ action, label });
  }
  return ctas;
};

const normalizeCarouselCard = (raw: unknown): CarouselCard | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  // Plan brief sample shape:
  // { itemId, connectionName, title, subtitle?, price, buttons: [{ action, label, data? }] }
  const plan = raw as {
    itemId?: unknown;
    connectionName?: unknown;
    title?: unknown;
    subtitle?: unknown;
    price?: unknown;
    buttons?: unknown;
  };

  // Current backend shape:
  // { id, merchant, title, subtitle?, price, ctas: [{ action, label }] }
  const backend = raw as {
    id?: unknown;
    merchant?: unknown;
    title?: unknown;
    subtitle?: unknown;
    price?: unknown;
    ctas?: unknown;
  };

  const id = getString(backend.id) ?? getString(plan.itemId);
  const title = getString(backend.title) ?? getString(plan.title);
  const merchant =
    getString(backend.merchant) ?? getString(plan.connectionName);
  const price = getString(backend.price) ?? getString(plan.price);
  if (!id || !title || !merchant || !price) {
    return null;
  }

  const subtitle = getString(backend.subtitle) ?? getString(plan.subtitle);

  let rawCtas: unknown = null;
  if (Array.isArray(backend.ctas)) {
    rawCtas = backend.ctas;
  } else if (Array.isArray(plan.buttons)) {
    rawCtas = plan.buttons;
  }

  const ctas = normalizeCtas(rawCtas);
  if (ctas.length === 0) {
    return null;
  }

  return {
    catalogItemId: getString(plan.itemId) ?? getString(backend.id) ?? id,
    ctas,
    id,
    merchant,
    price,
    subtitle,
    title,
  };
};

const normalizeCarouselContent = (value: unknown): CarouselContent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { cards } = value as { cards?: unknown };
  if (!Array.isArray(cards)) {
    return null;
  }

  const normalizedCards: CarouselCard[] = [];
  for (const raw of cards) {
    const card = normalizeCarouselCard(raw);
    if (!card) {
      continue;
    }
    normalizedCards.push(card);
  }

  return normalizedCards.length > 0 ? { cards: normalizedCards } : null;
};

const normalizePurchaseSummaryContent = (
  value: unknown
): PurchaseSummaryContent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const orderId = getOrderId(value);
  const { buttons } = value as { buttons?: unknown };
  if (!orderId || !Array.isArray(buttons)) {
    return null;
  }

  const v = value as {
    title?: unknown;
    subtitle?: unknown;
    merchant?: unknown;
    total?: unknown;
    paymentHint?: unknown;
  };

  const title = getString(v.title);
  const merchant = getString(v.merchant);
  const total = getString(v.total);
  if (!title || !merchant || !total) {
    return null;
  }

  const normalizedButtons: PurchaseSummaryContent["buttons"] = [];
  for (const rawButton of buttons) {
    if (!rawButton || typeof rawButton !== "object") {
      continue;
    }
    const b = rawButton as { action?: unknown; label?: unknown };
    const action = getString(b.action);
    const label = getString(b.label);
    if (!action || !label) {
      continue;
    }
    normalizedButtons.push({ action, label });
  }

  if (normalizedButtons.length === 0) {
    return null;
  }

  return {
    buttons: normalizedButtons,
    merchant,
    orderId,
    paymentHint: getString(v.paymentHint) ?? undefined,
    subtitle: getString(v.subtitle),
    title,
    total,
  };
};

export const ChatPanel = (props: {
  hasSavedPaymentMethod: boolean;
  isWorking?: boolean;
  messages: ChatMessageRow[];
  onOpenCheckout: (orderId: string, sessionId: string) => void;
  onPayWithSavedCard: (orderId: string, sessionId: string) => Promise<void>;
  sendEnvelope: (envelope: SendableEnvelope) => Promise<void>;
}) => {
  const {
    hasSavedPaymentMethod,
    isWorking = false,
    messages,
    onOpenCheckout,
    onPayWithSavedCard,
    sendEnvelope,
  } = props;
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Yuno Commerce
      </div>

      <div className="min-h-0 flex-1">
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="p-4">
                {messages.map((m) => {
                  const align = m.role === "user" ? "end" : "start";
                  const parsed = parseContentJson(m.contentJson);
                  let bubbleBody: ReactNode;

                  const carousel =
                    m.type === "carousel"
                      ? normalizeCarouselContent(parsed)
                      : null;
                  const purchaseSummary =
                    m.type === "purchase_summary"
                      ? normalizePurchaseSummaryContent(parsed)
                      : null;

                  if (carousel) {
                    bubbleBody = (
                      <div className="min-w-65">
                        <div className="mb-2 text-xs font-medium">Opções</div>
                        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                          {carousel.cards.map((c) => (
                            <div
                              className="bg-background/50 w-60 shrink-0 snap-start scroll-mx-2 rounded border p-3"
                              key={c.id}
                            >
                              <div className="text-xs font-medium">
                                {c.title}
                              </div>
                              <div className="text-muted-foreground mt-1 text-[11px]">
                                <span>{c.merchant}</span>
                                {c.subtitle ? (
                                  <span>{` · ${c.subtitle}`}</span>
                                ) : null}
                              </div>
                              <div className="mt-2 text-xs font-semibold">
                                {c.price}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {c.ctas.map((cta) => {
                                  const sessionId = m.sessionId ?? "";
                                  const disabled =
                                    typeof sessionId !== "string" ||
                                    sessionId.length === 0;
                                  const catalogItemId = c.catalogItemId ?? c.id;
                                  return (
                                    <Button
                                      disabled={disabled}
                                      key={cta.action}
                                      onClick={async () => {
                                        if (disabled) {
                                          return;
                                        }
                                        await sendEnvelope({
                                          payload: {
                                            action: cta.action,
                                            catalogItemId,
                                            sessionId,
                                          },
                                          type: "quick_reply",
                                        });
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                    >
                                      {cta.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else if (purchaseSummary) {
                    bubbleBody = (
                      <div className="min-w-65">
                        <div className="text-xs font-medium">
                          {purchaseSummary.title}
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                          <span>{purchaseSummary.merchant}</span>
                          {purchaseSummary.subtitle ? (
                            <span>{` · ${purchaseSummary.subtitle}`}</span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-xs font-semibold">
                          Total: {purchaseSummary.total}
                        </div>
                        {purchaseSummary.paymentHint ? (
                          <div className="text-muted-foreground mt-1 text-[11px]">
                            {purchaseSummary.paymentHint}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {purchaseSummary.buttons.map((b) => {
                            const sessionId = m.sessionId ?? "";
                            const disabled =
                              typeof sessionId !== "string" ||
                              sessionId.length === 0;
                            return (
                              <Button
                                disabled={disabled}
                                key={b.action}
                                onClick={async () => {
                                  if (disabled) {
                                    return;
                                  }
                                  const opensCheckout =
                                    b.action === "confirm_payment" ||
                                    b.action === "swap_card" ||
                                    (b.action === "pay_now" &&
                                      !hasSavedPaymentMethod);
                                  if (opensCheckout) {
                                    onOpenCheckout(
                                      purchaseSummary.orderId,
                                      sessionId
                                    );
                                    return;
                                  }
                                  if (b.action === "pay_now") {
                                    await onPayWithSavedCard(
                                      purchaseSummary.orderId,
                                      sessionId
                                    );
                                    return;
                                  }
                                  await sendEnvelope({
                                    payload: {
                                      action: b.action,
                                      orderId: purchaseSummary.orderId,
                                      sessionId,
                                    },
                                    type: "quick_reply",
                                  });
                                }}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {b.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    const quickReplyMessage =
                      m.role === "user" ? getQuickReplyMessage(parsed) : null;
                    const checkoutReturn =
                      m.role === "user" && isPaidCheckoutReturn(parsed);
                    const textValue =
                      quickReplyMessage ??
                      (typeof parsed === "object" &&
                      parsed !== null &&
                      "text" in parsed &&
                      typeof (parsed as { text?: unknown }).text === "string"
                        ? (parsed as { text: string }).text
                        : JSON.stringify(parsed));
                    bubbleBody = checkoutReturn ? (
                      <Card className="bg-primary/10 border-0 shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="bg-background text-primary flex size-10 items-center justify-center rounded-full">
                            <FileCheck2 aria-hidden="true" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-base font-medium">
                              Confirmar
                            </div>
                            <div className="text-muted-foreground text-sm">
                              Response sent
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {textValue}
                      </div>
                    );
                  }

                  return (
                    <MessageScrollerItem key={m.id}>
                      <MessageGroup>
                        <Message align={align}>
                          <MessageContent>
                            <BubbleGroup>
                              <Bubble
                                variant={m.role === "user" ? "tinted" : "muted"}
                              >
                                <BubbleContent>{bubbleBody}</BubbleContent>
                              </Bubble>
                            </BubbleGroup>
                          </MessageContent>
                        </Message>
                      </MessageGroup>
                    </MessageScrollerItem>
                  );
                })}
                {isWorking ? (
                  <MessageScrollerItem key="commerce-working-indicator">
                    <MessageGroup>
                      <Message align="start">
                        <MessageContent>
                          <BubbleGroup>
                            <Bubble variant="muted">
                              <BubbleContent>
                                <div className="text-muted-foreground text-sm">
                                  orquestrando...
                                </div>
                              </BubbleContent>
                            </Bubble>
                          </BubbleGroup>
                        </MessageContent>
                      </Message>
                    </MessageGroup>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      <div className="border-t p-3">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = text.trim();
            if (!trimmed || isSubmitting) {
              return;
            }

            setIsSubmitting(true);
            try {
              await sendEnvelope({
                payload: { idempotencyKey: crypto.randomUUID(), text: trimmed },
                type: "user_text",
              });
            } catch (error) {
              setIsSubmitting(false);
              throw error;
            }
            setIsSubmitting(false);
            setText("");
          }}
        >
          <Input
            className="flex-1"
            disabled={isSubmitting}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            value={text}
          />
          <Button disabled={!text.trim() || isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </div>
    </div>
  );
};
