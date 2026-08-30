import {
  Archive,
  BadgeCheck,
  BellOff,
  MoreVertical,
  Pin,
  Search,
} from "lucide-react";

import type { ConversationFixture } from "@/fixtures/conversations";

interface WhatsConversationListProps {
  conversations: ConversationFixture[];
  selectedId: string;
}

export const WhatsConversationList = ({
  conversations,
  selectedId,
}: WhatsConversationListProps) => (
  <aside className="flex w-[clamp(360px,30vw,480px)] shrink-0 flex-col border-r border-[var(--border)] bg-white">
    <header className="flex h-[60px] shrink-0 items-center justify-between bg-[#f0f2f5] px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9fdd3] text-sm font-semibold text-[#008069]">
        FS
      </div>
      <nav
        aria-label="Chat actions"
        className="flex items-center gap-2 text-[var(--wa-icon)]"
      >
        <button
          aria-label="Archived chats"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          type="button"
        >
          <Archive size={20} strokeWidth={1.8} />
        </button>
        <button
          aria-label="Notifications"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          type="button"
        >
          <BellOff size={19} strokeWidth={1.8} />
        </button>
        <button
          aria-label="More options"
          className="rounded-full p-2 hover:bg-[#e6e8eb]"
          type="button"
        >
          <MoreVertical size={20} strokeWidth={1.8} />
        </button>
      </nav>
    </header>

    <div className="border-b border-[#f0f2f5] bg-white px-3 py-2">
      <label className="flex h-9 items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 text-[var(--wa-icon)]">
        <Search size={17} strokeWidth={2} />
        <span className="sr-only">Search conversations</span>
        <input
          aria-label="Search conversations"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[#667781]"
          placeholder="Search or start new chat"
          readOnly
        />
      </label>
    </div>

    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId;

        return (
          <div
            className={`flex h-[72px] items-center gap-3 border-b border-[#f0f2f5] px-3 ${
              isSelected ? "bg-[#f0f2f5]" : "bg-white"
            }`}
            key={conversation.id}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${conversation.avatarTone}`}
            >
              {conversation.id === "yuno-commerce" ? (
                <img
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                  src="/yuno-logo.png"
                />
              ) : (
                conversation.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1 self-stretch py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1 truncate text-[17px] leading-5 text-[#111b21]">
                  {conversation.name}
                  {conversation.id === "yuno-commerce" ? (
                    <BadgeCheck
                      aria-label="Verified"
                      className="shrink-0 fill-[#1d9bf0] text-white"
                      size={14}
                    />
                  ) : null}
                </p>
                <time className="shrink-0 text-xs text-[#667781]">
                  {conversation.timestamp}
                </time>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-[#667781]">
                  {conversation.preview}
                </p>
                {conversation.pinned ? (
                  <Pin className="text-[#8696a0]" size={14} />
                ) : null}
                {conversation.muted ? (
                  <BellOff className="text-[#8696a0]" size={14} />
                ) : null}
                {conversation.unread ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1 text-[11px] font-medium text-white">
                    {conversation.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </aside>
);
