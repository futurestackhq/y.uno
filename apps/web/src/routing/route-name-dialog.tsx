import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hackathon/ui/components/dialog";
import { Input } from "@hackathon/ui/components/input";
import { useState } from "react";

interface RouteNameDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const RouteNameDialog = ({
  onOpenChange,
  open,
}: RouteNameDialogProps) => {
  const [name, setName] = useState("");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="gap-0 rounded-[4px] p-0 shadow-none sm:max-w-[600px]"
        showCloseButton
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-[#eceff2] p-6">
          <DialogTitle className="text-2xl font-bold">Route name</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <label className="sr-only" htmlFor="route-name">
            Route name
          </label>
          <Input
            className="h-14 w-[350px] max-w-full rounded-[4px] px-3.5 text-base"
            id="route-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Enter a name..."
            value={name}
          />
        </div>
        <DialogFooter className="gap-4 border-t border-[#eceff2] p-6 sm:justify-end">
          <button
            className="yuno-btn-outlined"
            onClick={() => {
              onOpenChange(false);
            }}
            type="button"
          >
            Skip
          </button>
          <button
            className="yuno-btn-contained"
            onClick={() => {
              onOpenChange(false);
            }}
            type="button"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
