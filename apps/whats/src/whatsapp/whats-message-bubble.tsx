import { FileCheck2 } from "lucide-react";

import type { WhatsMessage } from "@/fixtures/messages";

import { WhatsInteractiveMessage } from "./whats-interactive-message";

interface WhatsMessageBubbleProps {
  message: WhatsMessage;
  onAction: (
    action: string,
    catalogItemId?: string,
    orderId?: string,
    sourceMessageId?: string
  ) => void;
}

export const WhatsMessageBubble = ({
  message,
  onAction,
}: WhatsMessageBubbleProps) => {
  if (message.kind === "paid_status") {
    return (
      <div className="flex justify-end">
        <div className="relative flex h-20 w-75 items-center gap-3 rounded-[14px] rounded-tr-none bg-[#d9fdd3] px-3 text-[#111b21] shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#18a968]">
            <FileCheck2 size={27} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] leading-5">{message.title}</p>
            <p className="text-[14px] leading-4 text-[#52635a]">
              {message.subtitle}
            </p>
          </div>
          <span className="absolute right-3 bottom-2 text-[12px] text-[#667781]">
            {message.time} ✓✓
          </span>
        </div>
      </div>
    );
  }

  if (message.kind !== "text") {
    return (
      <div className="flex flex-col items-start justify-start">
        <WhatsInteractiveMessage message={message} onAction={onAction} />
      </div>
    );
  }

  const isOutgoing = message.direction === "out";

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[min(65%,560px)] rounded-lg px-2.5 pt-1.5 pb-1 text-sm shadow-sm ${
          isOutgoing
            ? "rounded-tr-none bg-(--wa-bubble-out)"
            : "rounded-tl-none bg-(--wa-bubble-in)"
        }`}
      >
        <div className="flex items-end gap-2">
          <p className="leading-5 whitespace-pre-wrap text-[#111b21]">
            {message.text}
          </p>
          <span className="flex shrink-0 items-center gap-0.5 pl-1 text-[10px] whitespace-nowrap text-[#667781]">
            {message.time}
            {isOutgoing && message.state ? (
              <span
                className={message.state === "read" ? "text-[#53bdeb]" : ""}
              >
                ✓✓
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
};
