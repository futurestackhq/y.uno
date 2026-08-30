import { Button } from "@hackathon/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@hackathon/ui/components/field";
import { Input } from "@hackathon/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@hackathon/ui/components/sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  cvv: string;
  expiration: string;
}

const EMPTY_CARD: CardDetails = {
  cardNumber: "",
  cardholderName: "",
  cvv: "",
  expiration: "",
};
const MOCK_CARD: CardDetails = {
  cardNumber: "4111 1111 1111 1234",
  cardholderName: "Marta Silva",
  cvv: "123",
  expiration: "12/30",
};

const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(cents / 100);

export const CheckoutDrawer = (props: {
  onClose: () => void;
  onPaymentComplete: (payment: {
    brand: string;
    last4: string;
    orderId: string;
    token: string;
  }) => Promise<void>;
  open: boolean;
  orderId: string | null;
}) => {
  const { onClose, onPaymentComplete, open, orderId } = props;
  const [card, setCard] = useState(EMPTY_CARD);
  const [isCardFilled, setIsCardFilled] = useState(false);
  const checkoutQuery = useQuery(
    trpc.commerce.getCheckoutOrder.queryOptions(
      { orderId: orderId ?? "" },
      { enabled: open && Boolean(orderId) }
    )
  );
  const updateQuantityMutation = useMutation(
    trpc.commerce.updateCheckoutQuantity.mutationOptions()
  );
  const paymentMutation = useMutation({
    mutationFn: onPaymentComplete,
    onSuccess: () => {
      setCard(EMPTY_CARD);
      setIsCardFilled(false);
    },
  });

  const fillMockCard = () => {
    if (!isCardFilled) {
      setCard(MOCK_CARD);
      setIsCardFilled(true);
    }
  };

  const checkout = checkoutQuery.data;
  const [item] = checkout?.items ?? [];

  const updateQuantity = async (quantity: number) => {
    if (!orderId) {
      return;
    }
    await updateQuantityMutation.mutateAsync({ orderId, quantity });
    await checkoutQuery.refetch();
  };

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <SheetContent side="bottom" className="mx-auto max-h-[85svh] max-w-xl">
        <SheetHeader>
          <SheetTitle>Complete purchase</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          {checkoutQuery.isLoading ? (
            <div className="text-muted-foreground text-sm">
              Loading checkout…
            </div>
          ) : null}
          {checkoutQuery.isError ? (
            <div className="text-destructive text-sm">
              Unable to load the order.
            </div>
          ) : null}
          {checkout ? (
            <>
              <div className="rounded border p-4 text-sm">
                <div className="font-medium">{checkout.merchant}</div>
                <div className="text-muted-foreground">
                  Order {checkout.orderId}
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded border p-4 text-sm">
                {checkout.items.map((lineItem) => (
                  <div
                    className="flex flex-col gap-1"
                    key={lineItem.lineItemId}
                  >
                    <div className="font-medium">{lineItem.title}</div>
                    {lineItem.subtitle ? (
                      <div className="text-muted-foreground">
                        {lineItem.subtitle}
                      </div>
                    ) : null}
                    <div>
                      {formatPrice(lineItem.unitPriceCents, checkout.currency)}
                    </div>
                  </div>
                ))}
                {item ? (
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-muted-foreground">Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label="Decrease quantity"
                        disabled={
                          item.quantity === 1 ||
                          updateQuantityMutation.isPending
                        }
                        onClick={() => {
                          void updateQuantity(item.quantity - 1);
                        }}
                        size="icon-sm"
                        type="button"
                        variant="outline"
                      >
                        −
                      </Button>
                      <span aria-live="polite" className="min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        aria-label="Increase quantity"
                        disabled={updateQuantityMutation.isPending}
                        onClick={() => {
                          void updateQuantity(item.quantity + 1);
                        }}
                        size="icon-sm"
                        type="button"
                        variant="outline"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t pt-3 font-semibold">
                  <span>Total</span>
                  <span>
                    {formatPrice(checkout.totalCents, checkout.currency)}
                  </span>
                </div>
              </div>
              <FieldGroup className="grid grid-cols-2 gap-3">
                <Field className="col-span-2">
                  <FieldLabel htmlFor="cardholder-name">
                    Name on card
                  </FieldLabel>
                  <Input
                    id="cardholder-name"
                    onChange={fillMockCard}
                    value={card.cardholderName}
                  />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel htmlFor="card-number">Card number</FieldLabel>
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    onChange={fillMockCard}
                    value={card.cardNumber}
                  />
                  <FieldDescription>
                    Type any character to fill the test card details.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="card-expiration">Expiration</FieldLabel>
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
            </>
          ) : null}
        </div>

        <SheetFooter>
          <Button
            disabled={
              !checkout ||
              !isCardFilled ||
              paymentMutation.isPending ||
              updateQuantityMutation.isPending
            }
            onClick={() => {
              if (!orderId) {
                return;
              }
              paymentMutation.mutate({
                brand: "visa",
                last4: "1234",
                orderId,
                token: "mock_token_visa_1234",
              });
            }}
            type="button"
          >
            {paymentMutation.isPending
              ? "Processing..."
              : `Save and pay ${checkout ? formatPrice(checkout.totalCents, checkout.currency) : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
