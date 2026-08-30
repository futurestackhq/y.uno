import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@hackathon/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

const markerVariants = cva(
  "group/marker text-muted-foreground [a]:hover:text-foreground relative flex min-h-4 w-full items-center gap-2 text-left text-xs [&_svg:not([class*='size-'])]:size-3.5 [a]:underline [a]:underline-offset-3",
  {
    variants: {
      variant: {
        border: "border-border border-b pb-2",
        default: "",
        separator:
          "before:bg-border after:bg-border before:mr-1 before:h-px before:min-w-0 before:flex-1 after:ml-1 after:h-px after:min-w-0 after:flex-1",
      },
    },
  }
);

const Marker = ({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof markerVariants>) =>
  useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(markerVariants({ className, variant })),
      },
      props
    ),
    render,
    state: {
      slot: "marker",
      variant,
    },
  });

const MarkerIcon = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="marker-icon"
    aria-hidden="true"
    className={cn(
      "size-3.5 shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
      className
    )}
    {...props}
  />
);

const MarkerContent = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="marker-content"
    className={cn(
      "*:[a]:hover:text-foreground min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:underline-offset-3",
      className
    )}
    {...props}
  />
);

export { Marker, MarkerIcon, MarkerContent, markerVariants };
