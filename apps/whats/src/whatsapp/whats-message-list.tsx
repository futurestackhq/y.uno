import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import type { WhatsMessage } from "@/fixtures/messages";

import { WhatsMessageBubble } from "./whats-message-bubble";

interface WhatsMessageListProps {
  messages: WhatsMessage[];
  onAction: (
    action: string,
    catalogItemId?: string,
    orderId?: string,
    sourceMessageId?: string
  ) => void;
  isTyping?: boolean;
  error?: string | null;
}

export const WhatsMessageList = ({
  messages,
  onAction,
  isTyping = false,
  error = null,
}: WhatsMessageListProps) => (
  <Conversation key={messages.length}>
    <ConversationContent className="min-h-full bg-(--wa-chat-wallpaper) px-[clamp(24px,8vw,96px)] py-5">
      <div className="mx-auto flex max-w-230 flex-col gap-2">
        {messages.length > 0 ? (
          <div className="mx-auto mb-2 rounded-md bg-[#fff3c4] px-3 py-1.5 text-center text-xs text-[#54656f] shadow-sm">
            Messages are end-to-end encrypted
          </div>
        ) : null}
        {messages.map((message) => (
          <WhatsMessageBubble
            key={message.id}
            message={message}
            onAction={onAction}
          />
        ))}
        {isTyping ? (
          <div className="w-fit rounded-lg rounded-tl-none bg-white px-3 py-2 text-xs text-[#667781] shadow-sm">
            .....
          </div>
        ) : null}
        {error ? (
          <p className="mx-auto rounded-md bg-[#fce4e4] px-3 py-2 text-xs text-[#a33a3a]">
            {error}
          </p>
        ) : null}
      </div>
    </ConversationContent>
  </Conversation>
);
