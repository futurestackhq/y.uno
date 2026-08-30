import { Check, CreditCard, X } from "lucide-react";
import { useEffect, useState } from "react";

import { trpcClient } from "@/utils/trpc";
import type { SavedPaymentMethod } from "@/whatsapp/use-local-conversation";

interface WhatsCheckoutPanelProps {
  onClose: () => void;
  onComplete: (
    orderId: string,
    savedPaymentMethod: SavedPaymentMethod
  ) => Promise<void>;
  orderId: string;
  sessionId: string | null;
}

export const WhatsCheckoutPanel = ({
  onClose,
  onComplete,
  orderId,
  sessionId,
}: WhatsCheckoutPanelProps) => {
  const [total, setTotal] = useState<string | null>(null);
  const [isOrderPayable, setIsOrderPayable] = useState<boolean | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<{
    brand: string;
    last4: string;
    token: string;
  } | null>(null);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const order = await trpcClient.commerce.getCheckoutOrder.query({
        orderId,
      });
      if (!order || order.status !== "draft") {
        setIsOrderPayable(false);
        setError("Este pedido já foi processado.");
        return;
      }
      setIsOrderPayable(true);
      setTotal(
        new Intl.NumberFormat("pt-BR", {
          currency: order.currency,
          style: "currency",
        }).format(order.totalCents / 100)
      );
    };
    void loadOrder();
  }, [orderId]);

  useEffect(() => {
    const loadPaymentMethod = async () => {
      if (isOrderPayable !== true) {
        setIsLoadingPaymentMethod(false);
        return;
      }
      const savedPaymentMethod =
        await trpcClient.commerce.getDefaultPaymentMethod.query({});
      if (!savedPaymentMethod) {
        const search = new URLSearchParams({ orderId });
        if (sessionId) {
          search.set("sessionId", sessionId);
        }
        const checkoutWindow = window.open(
          `/checkout?${search.toString()}`,
          "_blank"
        );
        if (checkoutWindow) {
          onClose();
        }
        return;
      }
      setPaymentMethod(savedPaymentMethod);
      setIsLoadingPaymentMethod(false);
    };
    void loadPaymentMethod();
  }, [isOrderPayable, onClose, orderId, sessionId]);

  const handlePayment = async () => {
    if (!paymentMethod || !isOrderPayable) {
      return;
    }

    setIsPaying(true);
    try {
      await onComplete(orderId, paymentMethod);
      onClose();
    } catch {
      setError("Não foi possível processar o pagamento.");
      setIsPaying(false);
      return;
    }
    setIsPaying(false);
  };

  if (isOrderPayable === null || isLoadingPaymentMethod) {
    return (
      <aside className="flex w-76 shrink-0 items-center justify-center border-l border-[#d9dee2] bg-white p-4 text-sm text-[#667781]">
        Preparando pagamento seguro…
      </aside>
    );
  }

  return (
    <aside className="flex w-76 shrink-0 flex-col border-l border-[#d9dee2] bg-white">
      <header className="flex h-15 items-center justify-between border-b border-[#e9edef] px-4">
        <h2 className="text-[15px] font-medium">Finalizar compra</h2>
        <button
          aria-label="Fechar checkout"
          className="rounded-full p-1.5 text-[#54656f] hover:bg-[#f0f2f5]"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 space-y-4 px-4 pt-5">
        <div className="rounded-md border border-[#e9edef] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f8f2] text-[#008069]">
              <CreditCard size={19} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111b21]">
                Pagamento seguro
              </p>
              <p className="text-xs text-[#667781]">
                Cartão {paymentMethod?.brand.toUpperCase()} ••••{" "}
                {paymentMethod?.last4}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-[#e9edef] pb-3 text-sm">
          <span className="text-[#667781]">Total</span>
          <strong className="text-[#111b21]">{total ?? "Carregando…"}</strong>
        </div>
        <p className="text-xs leading-4 text-[#667781]">
          Ao confirmar, o pagamento será processado pelo commerce demo.
        </p>
        {error ? <p className="text-xs text-[#c0392b]">{error}</p> : null}
      </div>
      <footer className="p-4">
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#20b15a] text-sm font-medium text-white hover:bg-[#159447] disabled:opacity-60"
          disabled={isPaying || isOrderPayable !== true || !total}
          onClick={handlePayment}
          type="button"
        >
          <Check size={16} />
          {isPaying ? "Processando…" : "Confirmar pagamento"}
        </button>
      </footer>
    </aside>
  );
};
