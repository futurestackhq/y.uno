/* oxlint-disable no-use-before-define */

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  PackageOpen,
} from "lucide-react";
import { useRef, useState } from "react";

import type { MessageAction, WhatsMessage } from "@/fixtures/messages";

interface WhatsInteractiveMessageProps {
  message: Exclude<WhatsMessage, { kind: "text" | "paid_status" }>;
  onAction: (
    action: string,
    catalogItemId?: string,
    orderId?: string,
    sourceMessageId?: string
  ) => void;
}

export const WhatsInteractiveMessage = ({
  message,
  onAction,
}: WhatsInteractiveMessageProps) => {
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  if (message.kind === "flow") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white shadow-sm">
        <p className="px-3 pt-2.5 pb-2 text-sm leading-5 text-[#3b4a54]">
          {message.description}
        </p>
        <InteractiveButton
          action={message.actionLabel}
          label={message.actionLabel}
          onAction={(action) => {
            setIsFlowOpen(true);
            onAction(action);
          }}
        />
        {isFlowOpen ? (
          <div className="mx-3 mb-3 rounded-md border border-[#d1d7db] bg-[#f7f9fa] p-3">
            <p className="text-xs font-medium text-[#111b21]">
              Yuno Commerce Flow
            </p>
            <p className="mt-1 text-xs leading-4 text-[#667781]">
              Delivery and payment details are ready for the next step.
            </p>
            <button
              className="mt-2 text-xs font-medium text-[#008069]"
              onClick={() => setIsFlowOpen(false)}
              type="button"
            >
              Fechar Flow
            </button>
          </div>
        ) : null}
        <MessageTime time={message.time} />
      </div>
    );
  }

  if (message.kind === "carousel") {
    return <CarouselMessage message={message} onAction={onAction} />;
  }

  if (message.kind === "list") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white px-4 pt-3 shadow-sm">
        <p className="mb-2 text-sm font-medium text-[#111b21]">
          {message.title}
        </p>
        <div className="divide-y divide-[#e9edef]">
          {message.items.map((item) => (
            <button
              className="flex w-full items-center justify-between gap-3 py-3 text-left"
              key={item.id}
              onClick={() => onAction(item.title)}
              type="button"
            >
              <span>
                <span className="block text-sm text-[#111b21]">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-[#667781]">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="shrink-0 text-[#00a884]" size={18} />
            </button>
          ))}
        </div>
        <MessageTime time={message.time} />
      </div>
    );
  }

  if (message.kind === "product_detail") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white shadow-sm">
        <div className="px-3 pt-2.5 pb-2">
          <p className="text-sm leading-5 font-medium text-[#111b21]">
            {message.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-4 text-[#667781]">
            {message.description}
          </p>
          <p className="mt-1 text-sm leading-5 font-medium text-[#111b21]">
            {message.price}
          </p>
          <MessageTime time={message.time} />
        </div>
        <InteractiveButton
          action="confirm_order"
          disabled={message.isOrderStarted}
          label={message.actionLabel}
          onAction={(action) =>
            onAction(action, message.catalogItemId, undefined, message.id)
          }
        />
      </div>
    );
  }

  if (message.kind === "purchase_summary") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white px-4 pt-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f8f2] text-[#008069]">
            <PackageOpen size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#111b21]">
              {message.title}
            </p>
            {message.merchant ? (
              <p className="mt-0.5 text-xs text-[#667781]">
                {message.merchant}
              </p>
            ) : null}
            {message.description ? (
              <p className="mt-0.5 text-xs text-[#667781]">
                {message.description}
              </p>
            ) : null}
            <p className="text-base font-semibold text-[#111b21]">
              {message.total}
            </p>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-[7.5px] border-t border-[#e9edef]">
          {message.actions.map((action) => (
            <InteractiveButton
              action={action.id}
              key={action.id}
              label={action.label}
              onAction={(selectedAction) =>
                onAction(selectedAction, undefined, message.orderId)
              }
              variant={action.kind}
            />
          ))}
        </div>
        <MessageTime time={message.time} />
      </div>
    );
  }

  if (message.kind === "pix_confirmation") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white shadow-sm">
        <div className="px-3 pt-2.5 pb-2">
          <p className="text-[12px] leading-4.25 text-[#3b4a54]">
            {message.prompt}
          </p>
          <div className="mt-2 space-y-0.5 text-[12px] leading-4 text-[#667781]">
            {message.details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
          <MessageTime time={message.time} />
        </div>
        <InteractiveButton
          action={message.actionLabel}
          label={message.actionLabel}
          onAction={onAction}
        />
      </div>
    );
  }

  if (message.kind === "category_prompt") {
    return (
      <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white shadow-sm">
        <p className="px-3 pt-2.5 pb-2 text-[12px] leading-4 text-[#3b4a54]">
          {message.text}
        </p>
        <InteractiveButton
          action={message.actionLabel}
          label={message.actionLabel}
          onAction={onAction}
        />
        <MessageTime time={message.time} />
      </div>
    );
  }

  return (
    <div className="w-[min(336px,calc(100vw-64px))] overflow-hidden rounded-[7.5px] bg-white px-4 py-3 shadow-sm">
      <p className="text-sm leading-5 text-[#111b21]">{message.text}</p>
      <MessageTime time={message.time} />
    </div>
  );
};

interface CarouselMessageProps {
  message: Extract<WhatsMessage, { kind: "carousel" }>;
  onAction: (
    action: string,
    catalogItemId?: string,
    orderId?: string,
    sourceMessageId?: string
  ) => void;
}

const CarouselMessage = ({ message, onAction }: CarouselMessageProps) => {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <p className="w-fit max-w-[min(500px,calc(100vw-64px))] rounded-[7.5px] bg-white px-3 py-2 text-sm leading-5 text-[#111b21] shadow-sm">
        {message.title}
      </p>
      <div className="relative isolate mt-1 w-full max-w-275 overflow-hidden">
        <div
          className="flex scrollbar-none gap-2 overflow-x-auto bg-transparent px-1.5 [&::-webkit-scrollbar]:hidden"
          ref={trackRef}
        >
          {message.cards.map((card) => (
            <article
              className="w-75 shrink-0 overflow-hidden rounded-[7.5px] bg-white shadow-sm"
              key={card.id}
            >
              <div className={`h-40 bg-linear-to-br ${card.tone}`} />
              <div className="px-3 py-2">
                <p className="truncate text-[14px] leading-5 text-[#111b21]">
                  {card.title}
                </p>
                <p className="truncate text-[13px] leading-4 text-[#111b21]">
                  {card.description}
                </p>
                <p className="mt-0.5 text-[13px] leading-4 text-[#111b21]">
                  {card.price}
                </p>
              </div>
              <button
                className="flex h-9 w-full items-center justify-center gap-1 border-t border-[#e9edef] px-2 text-[12px] font-medium text-[#1b8755] hover:bg-[#f5f6f6]"
                onClick={() =>
                  onAction(
                    card.actionLabel.toLowerCase().includes("comprar")
                      ? "buy"
                      : "details",
                    card.id
                  )
                }
                type="button"
              >
                <ExternalLink size={13} />
                {card.actionLabel}
              </button>
            </article>
          ))}
        </div>
        <button
          aria-label="Previous carousel card"
          className="absolute top-1/2 left-1 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#667781] shadow-md hover:bg-[#f0f2f5]"
          onClick={() =>
            trackRef.current?.scrollBy({ behavior: "smooth", left: -308 })
          }
          type="button"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          aria-label="Next carousel card"
          className="absolute top-1/2 right-1 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#667781] shadow-md hover:bg-[#f0f2f5]"
          onClick={() =>
            trackRef.current?.scrollBy({ behavior: "smooth", left: 308 })
          }
          type="button"
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <MessageTime time={message.time} />
    </>
  );
};

interface InteractiveButtonProps {
  action: string;
  disabled?: boolean;
  label: string;
  onAction: (
    action: string,
    catalogItemId?: string,
    orderId?: string,
    sourceMessageId?: string
  ) => void;
  variant?: MessageAction["kind"];
}

const InteractiveButton = ({
  action,
  disabled = false,
  label,
  onAction,
  variant = "primary",
}: InteractiveButtonProps) => (
  <button
    className={`flex h-9 w-full items-center justify-center gap-2 border-t border-[#e9edef] px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-[#8696a0] ${
      variant === "primary"
        ? "text-[#1b8755] hover:bg-[#f5f6f6]"
        : "text-[#1b8755] hover:bg-[#f5f6f6]"
    }`}
    disabled={disabled}
    onClick={() => onAction(action)}
    type="button"
  >
    {label}
    {action === "checkout" ? <ExternalLink size={15} /> : null}
  </button>
);

const MessageTime = ({ time }: { time: string }) => (
  <div className="flex items-center justify-end gap-1 px-2 pt-1 pb-1 text-[10px] text-[#667781]">
    <span>{time}</span>
  </div>
);
