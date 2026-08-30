import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { trpcClient } from "@/utils/trpc";

const getSearchParam = (key: string) =>
  new URLSearchParams(window.location.search).get(key) ?? "";

type CardField = "cardNumber" | "cardholderName" | "cvv" | "expiryDate";

const mockCardFieldValues: Record<CardField, string> = {
  cardNumber: "4111 1111 1111 1111",
  cardholderName: "Marta Silva",
  cvv: "123",
  expiryDate: "12/29",
};

const PaymentPage = () => {
  const orderId = getSearchParam("orderId");
  const sessionId = getSearchParam("sessionId");
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isCardAutofilled, setIsCardAutofilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<{
    merchant: string;
    title: string;
    total: string;
  } | null>(null);

  useEffect(() => {
    const loadCheckout = async () => {
      if (!orderId) {
        return;
      }
      const order = await trpcClient.commerce.getCheckoutOrder.query({
        orderId,
      });
      const item = order?.items[0];
      if (!order || !item) {
        return;
      }
      setCheckout({
        merchant: order.merchant,
        title: item.title,
        total: new Intl.NumberFormat("pt-BR", {
          currency: order.currency,
          style: "currency",
        }).format(order.totalCents / 100),
      });
    };
    void loadCheckout();
  }, [orderId]);

  const handleCardFieldChange = () => {
    if (isCardAutofilled) {
      return;
    }

    setCardNumber(mockCardFieldValues.cardNumber);
    setCardholderName(mockCardFieldValues.cardholderName);
    setCvv(mockCardFieldValues.cvv);
    setExpiryDate(mockCardFieldValues.expiryDate);
    setIsCardAutofilled(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await trpcClient.commerce.sendEnvelope.mutate({
        brand: "visa",
        last4: cardNumber.trim().slice(-4) || "0000",
        orderId,
        sessionId,
        status: "paid",
        token: `mock_token_visa_${cardNumber.trim().slice(-4) || "0000"}`,
        tokenSaved: true,
        type: "checkout_returned",
        userId: "user_marta",
      });
      window.opener?.postMessage(
        { type: "yuno-checkout-returned" },
        window.location.origin
      );
      window.close();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#f4f3ff] px-5 py-10 text-[#25213d]">
      <div className="mx-auto w-full max-w-240">
        <header className="flex items-center justify-between">
          <span className="text-2xl font-bold tracking-[-0.08em]">yuno</span>
          <span className="rounded-full bg-[#5551d8] px-3 py-1 text-xs font-medium text-white">
            Checkout seguro
          </span>
        </header>
        <div className="mt-10 grid overflow-hidden rounded-xl border border-[#dedcff] bg-white shadow-[0_16px_48px_rgba(57,48,147,0.16)] lg:grid-cols-[1.15fr_0.85fr]">
          <section className="p-7 lg:p-10">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#625ed1] uppercase">
              Payment details
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Card payment
            </h1>
            <p className="mt-2 max-w-105 text-sm leading-5 text-[#6d6983]">
              Your details are collected on this secure page, and WhatsApp
              receives only the transaction confirmation.
            </p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium">
                Card number
                <input
                  autoComplete="cc-number"
                  className="mt-1.5 h-12 w-full rounded-lg border border-[#d9d7f2] px-3 text-base transition outline-none focus:border-[#5b58df] focus:ring-2 focus:ring-[#5b58df33]"
                  disabled={isCardAutofilled}
                  onChange={handleCardFieldChange}
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                />
              </label>
              <label className="block text-sm font-medium">
                Name on card
                <input
                  autoComplete="cc-name"
                  className="mt-1.5 h-12 w-full rounded-lg border border-[#d9d7f2] px-3 text-base transition outline-none focus:border-[#5b58df] focus:ring-2 focus:ring-[#5b58df33]"
                  disabled={isCardAutofilled}
                  onChange={handleCardFieldChange}
                  placeholder="As shown on card"
                  value={cardholderName}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Vencimento
                  <input
                    autoComplete="cc-exp"
                    className="mt-1.5 h-12 w-full rounded-lg border border-[#d9d7f2] px-3 text-base transition outline-none focus:border-[#5b58df] focus:ring-2 focus:ring-[#5b58df33]"
                    disabled={isCardAutofilled}
                    onChange={handleCardFieldChange}
                    placeholder="MM/AA"
                    value={expiryDate}
                  />
                </label>
                <label className="block text-sm font-medium">
                  CVV
                  <input
                    autoComplete="cc-csc"
                    className="mt-1.5 h-12 w-full rounded-lg border border-[#d9d7f2] px-3 text-base transition outline-none focus:border-[#5b58df] focus:ring-2 focus:ring-[#5b58df33]"
                    disabled={isCardAutofilled}
                    onChange={handleCardFieldChange}
                    placeholder="000"
                    type="password"
                    value={cvv}
                  />
                </label>
              </div>
              <button
                className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-[#5b58df] text-sm font-semibold text-white transition hover:bg-[#4642bd] disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Processing payment…" : "Pay now"}
              </button>
            </form>
          </section>
          <aside className="border-t border-[#dedcff] bg-[#f9f8ff] p-7 lg:border-t-0 lg:border-l lg:p-10">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#625ed1] uppercase">
              Order summary
            </p>
            <div className="mt-6 border-b border-[#dedcff] pb-6">
              <p className="text-base font-semibold">
                {checkout?.merchant ?? "Carregando loja…"}
              </p>
              <p className="mt-1 text-sm text-[#6d6983]">
                {checkout?.title ?? "Carregando item…"}
              </p>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-[#6d6983]">
                <dt>Cliente</dt>
                <dd className="font-medium text-[#25213d]">Marta</dd>
              </div>
              <div className="flex justify-between text-[#6d6983]">
                <dt>Payment method</dt>
                <dd className="font-medium text-[#25213d]">Credit card</dd>
              </div>
              <div className="flex justify-between border-t border-[#dedcff] pt-4 text-base font-semibold text-[#25213d]">
                <dt>Total</dt>
                <dd>{checkout?.total ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-8 flex gap-2 text-xs leading-4 text-[#6d6983]">
              <LockKeyhole
                className="mt-0.5 shrink-0 text-[#5b58df]"
                size={15}
              />
              Data protected by tokenization. Your card is not sent to WhatsApp.
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-[#45417a]">
              <CheckCircle2 size={16} />
              Save card for future purchases
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/checkout")({
  component: PaymentPage,
});
