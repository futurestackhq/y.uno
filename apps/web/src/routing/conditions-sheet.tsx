import { ScrollArea } from "@hackathon/ui/components/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@hackathon/ui/components/sheet";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  PhosphorCaretDown,
  PhosphorCheckCircle,
  PhosphorDotsThreeVertical,
  PhosphorPlus,
  PhosphorStar,
  PhosphorTreeStructure,
  PhosphorX,
} from "./phosphor";

interface ConditionsSheetProps {
  methodId: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const publishedRoutes = [
  {
    name: "Mastercard USA",
    stamp: "Last published at Jun 25, 2024, 8:40 pm GMT-3",
  },
  { name: "Visa USA", stamp: "Last published at Jun 25, 2024, 8:40 pm GMT-3" },
  {
    name: "Visa Europe",
    stamp: "Last published at Jun 25, 2024, 8:40 pm GMT-3",
  },
] as const;

export const ConditionsSheet = ({
  methodId,
  onOpenChange,
  open,
}: ConditionsSheetProps) => {
  const navigate = useNavigate();
  const isCard = methodId === "card";
  const [tab, setTab] = useState<"published" | "drafts">("published");
  const [readMore, setReadMore] = useState(false);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-[min(100vw,700px)] gap-0 rounded-none p-0 data-[side=right]:w-[min(100vw,700px)] sm:max-w-[700px] data-[side=right]:sm:max-w-[700px]"
        showCloseButton={false}
        side="right"
      >
        <div className="flex items-center justify-between border-b border-[#eceff2] p-6">
          <SheetTitle className="text-[20px] leading-6 font-bold">
            Card conditions
          </SheetTitle>
          <SheetDescription className="sr-only">Routing</SheetDescription>
          <SheetClose className="text-[#bfc2c7]">
            <PhosphorX />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            <p className="mb-4 text-[20px] leading-6 font-bold">Routing</p>
            <p className="text-xs leading-[18px]">
              Routes enable you to set up conditions to manage payment methods
              and improve your payment success rate. Start by creating a new
              route and publish it when you are all set. Create multiple routes
              and scenarios as needed.
            </p>
            <button
              className="text-primary mt-2 flex items-center gap-2 text-xs"
              onClick={() => {
                setReadMore((current) => !current);
              }}
              type="button"
            >
              Read more
              <PhosphorCaretDown />
            </button>
            {readMore ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Create multiple routes and set the priority that works for you.
              </p>
            ) : null}
            <hr className="my-6 border-[#eceff2]" />
            <div className="mb-8 flex items-start justify-between">
              <div className="mb-0 flex gap-6">
                <button
                  className={
                    tab === "published"
                      ? "border-primary border-b-2 pb-1.5 text-sm"
                      : "text-muted-foreground pb-1.5 text-sm"
                  }
                  onClick={() => {
                    setTab("published");
                  }}
                  type="button"
                >
                  Published
                </button>
                <button
                  className={
                    tab === "drafts"
                      ? "border-primary border-b-2 pb-1.5 text-sm"
                      : "text-muted-foreground pb-1.5 text-sm"
                  }
                  onClick={() => {
                    setTab("drafts");
                  }}
                  type="button"
                >
                  Drafts
                </button>
              </div>
              <button
                className="yuno-btn-text inline-flex items-center gap-2"
                disabled={!isCard}
                onClick={() => {
                  onOpenChange(false);
                  void navigate({
                    search: { method: methodId ?? "card" },
                    to: "/routing/create",
                  });
                }}
                type="button"
              >
                <PhosphorPlus />
                Create new route
              </button>
            </div>
            {tab === "published" ? (
              <div className="flex flex-col gap-3">
                {publishedRoutes.map((route) => (
                  <div className="yuno-published-row" key={route.name}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-[50px] items-center justify-center rounded bg-[#f6f7fa] text-[#6c6f75]">
                        <PhosphorTreeStructure size={24} />
                      </div>
                      <div>
                        <p className="text-base">{route.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {route.stamp}
                        </p>
                      </div>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-6">
                      <p className="text-xs">Version 1</p>
                      <span className="yuno-chip yuno-chip-success">
                        <PhosphorCheckCircle size={16} />
                        Published
                      </span>
                      <PhosphorStar size={18} />
                      <PhosphorDotsThreeVertical size={18} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No drafts yet.</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
