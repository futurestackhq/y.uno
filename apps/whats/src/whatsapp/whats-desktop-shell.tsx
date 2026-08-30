import type { ConversationFixture } from "@/fixtures/conversations";

import type { SavedPaymentMethod } from "./use-local-conversation";
import { WhatsChatHeader } from "./whats-chat-header";
import { WhatsCheckoutPanel } from "./whats-checkout-panel";
import { WhatsConversationList } from "./whats-conversation-list";
import { WhatsMetaFlowsPanel } from "./whats-meta-flows-panel";

interface WhatsDesktopShellProps {
  conversations: ConversationFixture[];
  selectedConversation: ConversationFixture;
  children: React.ReactNode;
  isMetaFlowsOpen: boolean;
  onCloseMetaFlows: () => void;
  onResetChat: () => void;
  checkoutOrderId: string | null;
  onCloseCheckout: () => void;
  onCompletePayment: (
    orderId: string,
    savedPaymentMethod: SavedPaymentMethod
  ) => Promise<void>;
  sessionId: string | null;
}

export const WhatsDesktopShell = ({
  conversations,
  selectedConversation,
  children,
  isMetaFlowsOpen,
  onCloseMetaFlows,
  onResetChat,
  checkoutOrderId,
  onCloseCheckout,
  onCompletePayment,
  sessionId,
}: WhatsDesktopShellProps) => (
  <main className="flex h-dvh min-h-150 w-full overflow-hidden bg-(--wa-chat-wallpaper)">
    <WhatsConversationList
      conversations={conversations}
      selectedId={selectedConversation.id}
    />
    <section className="flex min-w-0 flex-1 flex-col">
      <WhatsChatHeader
        conversation={selectedConversation}
        onResetChat={onResetChat}
      />
      {children}
    </section>
    {isMetaFlowsOpen ? (
      <WhatsMetaFlowsPanel onClose={onCloseMetaFlows} />
    ) : null}
    {checkoutOrderId ? (
      <WhatsCheckoutPanel
        onClose={onCloseCheckout}
        onComplete={onCompletePayment}
        orderId={checkoutOrderId}
        sessionId={sessionId}
      />
    ) : null}
  </main>
);
