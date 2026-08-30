import { cn } from "@hackathon/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

const Empty = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty"
    className={cn(
      "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-none border-dashed p-6 text-center text-balance md:p-12",
      className
    )}
    {...props}
  />
);

const EmptyHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-header"
    className={cn("flex max-w-sm flex-col items-center gap-2", className)}
    {...props}
  />
);

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-none [&_svg:not([class*='size-'])]:size-5",
      },
    },
  }
);

const EmptyMedia = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) => (
  <div
    data-slot="empty-icon"
    data-variant={variant}
    className={cn(emptyMediaVariants({ variant }), className)}
    {...props}
  />
);

const EmptyTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-title"
    className={cn(
      "cn-font-heading text-sm font-medium tracking-tight",
      className
    )}
    {...props}
  />
);

const EmptyDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => (
  <p
    data-slot="empty-description"
    className={cn(
      "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
      className
    )}
    {...props}
  />
);

const EmptyContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-content"
    className={cn(
      "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
      className
    )}
    {...props}
  />
);

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};
