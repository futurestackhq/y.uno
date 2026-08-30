import { Paperclip, Smile, Send } from "lucide-react";

interface PromptInputProps {
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

interface PromptInputTextareaProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface PromptInputSubmitProps {
  disabled?: boolean;
  isLoading?: boolean;
}

export const PromptInput = ({ children, onSubmit }: PromptInputProps) => (
  <form onSubmit={onSubmit}>{children}</form>
);

export const PromptInputTextarea = ({
  value,
  onChange,
  onKeyDown,
  disabled = false,
  placeholder,
}: PromptInputTextareaProps) => (
  <textarea
    aria-label="Message"
    className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-[#111b21] outline-none placeholder:text-[#667781]"
    disabled={disabled}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    rows={1}
    value={value}
  />
);

export const PromptInputSubmit = ({
  disabled = false,
  isLoading = false,
}: PromptInputSubmitProps) => (
  <button
    aria-label={isLoading ? "Sending message" : "Send message"}
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-colors hover:bg-[#008f72] disabled:cursor-not-allowed disabled:bg-[#b7c8c2]"
    disabled={disabled}
    type="submit"
  >
    {isLoading ? <span className="text-xs">…</span> : <Send size={17} />}
  </button>
);

export const PromptInputDecorations = () => (
  <div className="flex items-center gap-1 text-[#54656f]">
    <button aria-label="Attach file" className="rounded-full p-2" type="button">
      <Paperclip size={19} />
    </button>
    <button aria-label="Add emoji" className="rounded-full p-2" type="button">
      <Smile size={19} />
    </button>
  </div>
);
