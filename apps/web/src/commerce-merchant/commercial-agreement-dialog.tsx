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
          <DialogTitle>Acordo comercial de marketplace</DialogTitle>
          <DialogDescription>
            Este é um aceite demonstrativo para habilitar a Petz no canal Whats.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/30 space-y-4 rounded-lg border p-4 text-sm">
          <p>
            A Yuno disponibiliza o catálogo da Petz no marketplace e mantém a
            atribuição da venda ao canal Whats.
          </p>
          <div className="bg-background rounded-md p-3">
            <p className="text-muted-foreground text-xs">Comissão Yuno</p>
            <p className="mt-1 text-2xl font-semibold">
              {commissionPercentage.toFixed(1)}% por venda aprovada
            </p>
          </div>
          <p className="text-muted-foreground">
            Exemplo: em uma venda de R$ 100,00, a comissão demonstrada é de R$
            {commissionPercentage.toFixed(2).replace(".", ",")}.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={accepted}
            id="commercial-agreement"
            onCheckedChange={(value) => setAccepted(value === true)}
          />
          <Label className="leading-5" htmlFor="commercial-agreement">
            Li e aceito os termos comerciais demonstrativos para ativar minha
            participação no Yuno Commerce.
          </Label>
        </div>
        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Voltar
          </Button>
          <Button
            disabled={!accepted}
            onClick={() => {
              onAccept();
              handleOpenChange(false);
            }}
            type="button"
          >
            Aceitar e ativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
