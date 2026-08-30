import { Button } from "@hackathon/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@hackathon/ui/components/field";
import { Input } from "@hackathon/ui/components/input";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  cvv: string;
  expiration: string;
}

const MOCK_CARD: CardDetails = {
  cardholderName: "Marta Silva",
  cardNumber: "4111 1111 1111 1234",
  cvv: "123",
  expiration: "12/30",
} as const;
const EMPTY_CARD: CardDetails = {
  cardholderName: "",
  cardNumber: "",
  cvv: "",
  expiration: "",
} as const;

const CheckoutPage = () => {
  const { orderId } = useSearch({ from: "/checkout" });
  const [status, setStatus] = useState<"idle" | "paid">("idle");
  const [card, setCard] = useState(EMPTY_CARD);
  const [isCardFilled, setIsCardFilled] = useState(false);

  const fillMockCard = () => {
    if (!isCardFilled) {
      setCard(MOCK_CARD);
      setIsCardFilled(true);
    }
  };

  if (!orderId) {
    return <div className="p-6 text-sm">Missing orderId</div>;
  }

  const pay = () => {
    setStatus("paid");
  };

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Finalizar compra</h1>
      <div className="rounded border p-4 text-sm">
        <div className="font-medium">Order</div>
        <div className="text-muted-foreground">{orderId}</div>
      </div>

      {status === "idle" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            pay();
          }}
        >
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field className="col-span-2">
              <FieldLabel htmlFor="cardholder-name">Nome no cartão</FieldLabel>
              <Input
                id="cardholder-name"
                onChange={fillMockCard}
                value={card.cardholderName}
              />
            </Field>
            <Field className="col-span-2">
              <FieldLabel htmlFor="card-number">Número do cartão</FieldLabel>
              <Input
                id="card-number"
                inputMode="numeric"
                onChange={fillMockCard}
                value={card.cardNumber}
              />
              <FieldDescription>
                Digite qualquer caractere para preencher os dados de teste.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="card-expiration">Validade</FieldLabel>
              <Input
                id="card-expiration"
                inputMode="numeric"
                onChange={fillMockCard}
                value={card.expiration}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="card-cvv">CVV</FieldLabel>
              <Input
                id="card-cvv"
                inputMode="numeric"
                onChange={fillMockCard}
                value={card.cvv}
              />
            </Field>
          </FieldGroup>
          <Button type="submit">Pagar R$ 89,90</Button>
        </form>
      ) : (
        <>
          <div className="rounded border p-4 text-sm">
            <div className="font-medium">Pagamento realizado</div>
            <div className="text-muted-foreground">R$ 89,90</div>
          </div>
          <Button
            onClick={() => {
              window.parent.postMessage(
                {
                  type: "checkout_returned",
                  payload: {
                    brand: "visa",
                    last4: "1234",
                    order_id: orderId,
                    status: "paid",
                    token: "mock_token_visa_1234",
                    tokenSaved: true,
                  },
                },
                "*"
              );
            }}
            type="button"
          >
            Voltar para o WhatsApp
          </Button>
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
});
