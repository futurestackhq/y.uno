"use client";

import { Badge } from "@hackathon/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hackathon/ui/components/collapsible";
import { cn } from "@hackathon/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn("rounded border", className)} {...props} />
);

const formatJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export interface ToolHeaderProps extends ComponentProps<
  typeof CollapsibleTrigger
> {
  state?: string;
  title?: string;
  toolType: string;
}

export const ToolHeader = ({
  className,
  state = "input-available",
  title,
  toolType,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs",
      className
    )}
    {...props}
  >
    <span className="font-medium">
      {title ?? toolType.replace(/^tool-/u, "")}
    </span>
    <Badge variant="outline">{state}</Badge>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn("space-y-3 border-t p-3 text-xs", className)}
    {...props}
  />
);

export interface ToolInputProps extends ComponentProps<"section"> {
  input: unknown;
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <section className={className} {...props}>
    <div className="mb-1 font-medium">Input</div>
    <pre className="bg-muted max-h-48 overflow-auto rounded p-2 whitespace-pre-wrap">
      {formatJson(input)}
    </pre>
  </section>
);

export interface ToolOutputProps extends ComponentProps<"section"> {
  errorText?: string | null;
  output?: ReactNode;
}

export const ToolOutput = ({
  className,
  errorText,
  output,
  ...props
}: ToolOutputProps) => (
  <section className={className} {...props}>
    <div className={cn("mb-1 font-medium", errorText && "text-destructive")}>
      {errorText ? "Error" : "Output"}
    </div>
    <pre
      className={cn(
        "max-h-48 overflow-auto rounded p-2 whitespace-pre-wrap",
        errorText ? "bg-destructive/10" : "bg-muted"
      )}
    >
      {errorText ?? output}
    </pre>
  </section>
);
