import { BadgeCheck, MoreVertical, Search, Video } from "lucide-react";
import { useState } from "react";

import type { ConversationFixture } from "@/fixtures/conversations";

interface WhatsChatHeaderProps {
  conversation: ConversationFixture;
  onResetChat: () => void;
}

export const WhatsChatHeader = ({
  conversation,
  onResetChat,
}: WhatsChatHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative flex h-15 shrink-0 items-center justify-between border-b border-[#d1d7db] bg-[#f0f2f5] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d9fdd3]">
          <img
            alt=""
            className="h-full w-full object-cover"
            src="/yuno-logo.png"
          />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[16px] text-[#111b21]">
            {conversation.name}
            <BadgeCheck
              aria-label="Verified"
              className="shrink-0 fill-[#1d9bf0] text-white"
              size={14}
            />
          </p>
          <p className="text-xs text-[#667781]">
            {conversation.status ?? "last seen recently"}
          </p>
        </div>
      </div>
      <nav
        aria-label="Conversation actions"
        className="flex items-center gap-2 text-(--wa-icon)"
      >
        <button
          aria-label="Search in conversation"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          type="button"
        >
          <Search size={20} strokeWidth={1.8} />
        </button>
        <button
          aria-label="Start video call"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          type="button"
        >
          <Video size={20} strokeWidth={1.8} />
        </button>
        <button
          aria-label="More options"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          <MoreVertical size={20} strokeWidth={1.8} />
        </button>
      </nav>
      {isMenuOpen ? (
        <div className="absolute top-12 right-3 z-20 w-44 rounded-md border border-[#d1d7db] bg-white py-1 shadow-lg">
          <button
            className="w-full px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-[#f0f2f5]"
            onClick={() => {
              onResetChat();
              setIsMenuOpen(false);
            }}
            type="button"
          >
            Resetar chat
          </button>
        </div>
      ) : null}
    </header>
  );
};
