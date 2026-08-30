import { Button } from "@hackathon/ui/components/button";
import { Checkbox } from "@hackathon/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hackathon/ui/components/dialog";
import { Label } from "@hackathon/ui/components/label";
import { useState } from "react";

import { YUNO_COMMISSION_BPS } from "./fixtures";

interface CommercialAgreementDialogProps {
  onAccept: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const commissionPercentage = YUNO_COMMISSION_BPS / 100;

export const CommercialAgreementDialog = ({
  onAccept,
  onOpenChange,
  open,
}: CommercialAgreementDialogProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAccepted(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Yuno Commerce
          </p>
          <DialogTitle>Marketplace commercial agreement</DialogTitle>
          <DialogDescription>
            This is a demo acceptance to enable Petz on the WhatsApp channel.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/30 space-y-4 rounded-lg border p-4 text-sm">
          <p>
            Yuno makes the Petz catalog available in the marketplace and keeps
            the sale attributed to the WhatsApp channel.
          </p>
          <div className="bg-background rounded-md p-3">
            <p className="text-muted-foreground text-xs">Yuno commission</p>
            <p className="mt-1 text-2xl font-semibold">
              {commissionPercentage.toFixed(1)}% per approved sale
            </p>
          </div>
          <p className="text-muted-foreground">
            Example: on a R$100.00 sale, the demo commission is R$
            {commissionPercentage.toFixed(2)}.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={accepted}
            id="commercial-agreement"
            onCheckedChange={(value) => setAccepted(value === true)}
          />
          <Label className="leading-5" htmlFor="commercial-agreement">
            I have read and accept the demo commercial terms to activate my Yuno
            Commerce participation.
          </Label>
        </div>
        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Back
          </Button>
          <Button
            disabled={!accepted}
            onClick={() => {
              onAccept();
              handleOpenChange(false);
            }}
            type="button"
          >
            Accept and activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
