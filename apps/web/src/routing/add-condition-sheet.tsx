import { Checkbox } from "@hackathon/ui/components/checkbox";
import { Input } from "@hackathon/ui/components/input";
import { ScrollArea } from "@hackathon/ui/components/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@hackathon/ui/components/sheet";
import { useState } from "react";

import { PhosphorCaretDown, PhosphorCreditCard, PhosphorX } from "./phosphor";

const CONDITION_TYPES = [
  "Issuer country",
  "Card brand",
  "Card BIN",
  "Currency & amount",
  "Country",
  "Additional fields",
  "Transactions type",
  "Metadata",
  "Time period",
  "Card type",
  "With CVV",
  "Issuer bank",
] as const;

interface AddConditionSheetProps {
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  open: boolean;
}

export const AddConditionSheet = ({
  onOpenChange,
  onSave,
  open,
}: AddConditionSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const cardBrandSelected = selectedTypes.includes("Card brand");
  const canSave = selectedTypes.length > 0;

  const toggleType = (type: string) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  };

  const close = () => {
    setSelectedTypes([]);
    onOpenChange(false);
  };

  return (
    <Sheet
      onOpenChange={(next) => {
        if (!next) {
          setSelectedTypes([]);
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <SheetContent
        className="w-[min(100vw,700px)] gap-0 rounded-none p-0 data-[side=left]:w-[min(100vw,700px)] sm:max-w-[700px] data-[side=left]:sm:max-w-[700px]"
        showCloseButton={false}
        side="left"
      >
        <div className="flex items-center justify-between border-b border-[#eceff2] p-6">
          <SheetTitle className="text-[20px] leading-6 font-bold">
            Add new condition
          </SheetTitle>
          <SheetClose className="text-[#6c6f75]">
            <PhosphorX />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            <div className="mb-6 grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-muted-foreground text-xs"
                  htmlFor="condition-name"
                >
                  Name
                </label>
                <Input
                  className="h-14 rounded-[4px] px-3.5 text-base"
                  id="condition-name"
                  placeholder="Enter the name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-muted-foreground text-xs"
                  htmlFor="condition-description"
                >
                  Description
                </label>
                <Input
                  className="h-14 rounded-[4px] px-3.5 text-base"
                  id="condition-description"
                  placeholder="Enter the description"
                />
              </div>
            </div>
            <hr className="mb-6 border-[#eceff2]" />
            <p className="text-muted-foreground mb-6 text-xs">
              Select one or multiples condition types:
            </p>
            <div className="grid grid-cols-3 gap-6">
              {CONDITION_TYPES.map((type) => {
                const checked = selectedTypes.includes(type);
                return (
                  <button
                    className="yuno-condition-tile"
                    key={type}
                    onClick={() => {
                      toggleType(type);
                    }}
                    type="button"
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none"
                      tabIndex={-1}
                    />
                    <span className="ml-3">{type}</span>
                  </button>
                );
              })}
            </div>
            {cardBrandSelected ? (
              <div className="mt-6 rounded-lg border border-[#eceff2] p-4">
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-primary flex size-8 items-center justify-center rounded-full bg-[#e3eeff]">
                    <PhosphorCreditCard size={16} />
                  </span>
                  <p className="text-base font-bold">Card brand</p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="relative col-span-1">
                    <select
                      className="border-input h-14 w-full appearance-none rounded-[4px] border bg-white px-3.5 pr-8 text-sm"
                      defaultValue="Equal"
                    >
                      <option>Equal</option>
                      <option>Not equal</option>
                    </select>
                    <PhosphorCaretDown
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#bfc2c7]"
                      size={16}
                    />
                  </div>
                  <div className="relative col-span-2">
                    <select
                      className="border-input h-14 w-full appearance-none rounded-[4px] border bg-white px-3.5 pr-8 text-sm"
                      defaultValue="Mastercard"
                    >
                      <option>Mastercard</option>
                      <option>Visa</option>
                    </select>
                    <PhosphorCaretDown
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#bfc2c7]"
                      size={16}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-4 border-t border-[#eceff2] p-6">
          <button className="yuno-btn-outlined" onClick={close} type="button">
            Cancel
          </button>
          <button
            className="yuno-btn-contained disabled:opacity-[0.38]"
            disabled={!canSave}
            onClick={() => {
              onSave();
              close();
            }}
            type="button"
          >
            Save
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
