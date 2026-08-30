import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* oxlint-disable no-use-before-define */

interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ConversationScrollButtonProps {
  onClick: () => void;
}

export const Conversation = ({
  children,
  className = "",
}: ConversationProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      setIsAtBottom(distanceFromBottom < 32);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
    });
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  };

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        {children}
      </div>
      {isAtBottom ? null : (
        <ConversationScrollButton onClick={scrollToBottom} />
      )}
    </div>
  );
};

export const ConversationContent = ({
  children,
  className = "",
}: ConversationContentProps) => <div className={className}>{children}</div>;

export const ConversationScrollButton = ({
  onClick,
}: ConversationScrollButtonProps) => (
  <button
    aria-label="Scroll to newest messages"
    className="absolute right-6 bottom-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#d1d7db] bg-white text-[#54656f] shadow-md hover:bg-[#f0f2f5]"
    onClick={onClick}
    type="button"
  >
    <ArrowDown size={18} />
  </button>
);
