export interface CheckoutReturnedMessage {
  type: "checkout_returned";
  payload: {
    order_id: string;
    status: "paid" | "failed";
    tokenSaved?: boolean;
    brand?: string;
    last4?: string;
    token?: string;
  };
}
