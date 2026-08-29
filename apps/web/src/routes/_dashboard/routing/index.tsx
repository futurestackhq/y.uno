import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ConditionsSheet } from "@/routing/conditions-sheet";
import { MethodCard } from "@/routing/method-card";
import { paymentMethods } from "@/routing/payment-methods";
import { PhosphorCaretDown, PhosphorFunnel } from "@/routing/phosphor";

const RoutingPage = () => {
  const [methodId, setMethodId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<"published" | "not-published">(
    "not-published"
  );

  return (
    <div className="flex flex-col px-10 py-8">
      <h1 className="mb-10 text-[32px] leading-10 font-bold">Routing</h1>
      <div className="mb-8 flex gap-6">
        <button
          className={
            tab === "published"
              ? "border-primary border-b-2 pb-1.5"
              : "text-muted-foreground pb-1.5"
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
            tab === "not-published"
              ? "border-primary border-b-2 pb-1.5"
              : "text-muted-foreground pb-1.5"
          }
          onClick={() => {
            setTab("not-published");
          }}
          type="button"
        >
          Not published
        </button>
      </div>
      <div className="mb-6 flex items-center">
        <span className="yuno-filter-chip">
          <PhosphorFunnel size={16} />
          Add filters
          <PhosphorCaretDown />
        </span>
        <span className="mx-4 h-[26px] w-px bg-[#eceff2]" />
        <span className="text-xs leading-4 text-[#bfc2c7]">
          No filters applied
        </span>
      </div>
      {tab === "published" ? (
        <p className="text-muted-foreground text-sm">
          No published routes in this mock.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paymentMethods.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              onSetUp={(id) => {
                setMethodId(id);
                setSheetOpen(true);
              }}
            />
          ))}
        </div>
      )}
      <ConditionsSheet
        methodId={methodId}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
      />
    </div>
  );
};

export const Route = createFileRoute("/_dashboard/routing/")({
  component: RoutingPage,
});
