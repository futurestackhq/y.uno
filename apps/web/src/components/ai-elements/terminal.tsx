"use client";

import { Button } from "@hackathon/ui/components/button";
import { cn } from "@hackathon/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export interface TerminalContentProps extends ComponentProps<"pre"> {
  output?: string;
}

export const TerminalContent = ({
  className,
  output = "",
  ...props
}: TerminalContentProps) => (
  <pre
    className={cn("max-h-80 overflow-auto p-3 whitespace-pre-wrap", className)}
    {...props}
  >
    {output}
  </pre>
);

export interface TerminalProps extends ComponentProps<"div"> {
  autoScroll?: boolean;
  children?: ReactNode;
  isStreaming?: boolean;
  onClear?: () => void;
  output: string;
}

export const Terminal = ({
  children,
  className,
  isStreaming = false,
  output,
  ...props
}: TerminalProps) => (
  <div
    className={cn(
      "rounded border bg-black font-mono text-[11px] text-green-200",
      className
    )}
    data-streaming={isStreaming}
    {...props}
  >
    {children ?? <TerminalContent output={output} />}
  </div>
);

export type TerminalHeaderProps = ComponentProps<"div">;

export const TerminalHeader = ({
  className,
  ...props
}: TerminalHeaderProps) => (
  <div
    className={cn(
      "flex items-center justify-between border-b border-white/10 px-3 py-2",
      className
    )}
    {...props}
  />
);

export type TerminalTitleProps = ComponentProps<"div">;

export const TerminalTitle = ({ className, ...props }: TerminalTitleProps) => (
  <div className={cn("text-green-100", className)} {...props} />
);

export type TerminalStatusProps = ComponentProps<"div"> & {
  isStreaming?: boolean;
};

export const TerminalStatus = ({
  className,
  isStreaming = false,
  ...props
}: TerminalStatusProps) => (
  <div className={cn("text-green-200/70", className)} {...props}>
    {isStreaming ? "streaming" : "idle"}
  </div>
);

export type TerminalActionsProps = ComponentProps<"div">;

export const TerminalActions = ({
  className,
  ...props
}: TerminalActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type TerminalClearButtonProps = ComponentProps<typeof Button>;

export const TerminalClearButton = ({
  children = "clear",
  ...props
}: TerminalClearButtonProps) => (
  <Button size="sm" type="button" variant="ghost" {...props}>
    {children}
  </Button>
);
