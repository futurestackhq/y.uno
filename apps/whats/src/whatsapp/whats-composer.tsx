import { useState } from "react";

import {
  PromptInput,
  PromptInputDecorations,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

interface WhatsComposerProps {
  isSubmitting: boolean;
  onSubmit: (text: string) => Promise<void>;
}

const handleTextareaKeyDown = (
  event: React.KeyboardEvent<HTMLTextAreaElement>
) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
};

export const WhatsComposer = ({
  isSubmitting,
  onSubmit,
}: WhatsComposerProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();

    if (!text || isSubmitting) {
      return;
    }

    setValue("");
    await onSubmit(text);
  };

  return (
    <div className="shrink-0 bg-[#f0f2f5] px-4 py-2.5">
      <PromptInput onSubmit={handleSubmit}>
        <div className="mx-auto flex max-w-230 items-end gap-2">
          <PromptInputDecorations />
          <div className="flex min-h-10 flex-1 items-center rounded-lg bg-white px-2">
            <PromptInputTextarea
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Type a message"
              value={value}
            />
          </div>
          <PromptInputSubmit
            disabled={!value.trim() || isSubmitting}
            isLoading={isSubmitting}
          />
        </div>
      </PromptInput>
    </div>
  );
};
