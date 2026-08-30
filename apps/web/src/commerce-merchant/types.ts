export type CommerceConnectionStatus =
  | "not_started"
  | "setup"
  | "agreement_pending"
  | "active";

export type MockOrderStatus = "paid" | "failed";

export interface MerchantProfile {
  legalName: string;
  name: string;
  routingConnectionName: string;
  supportEmail: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  priceCents: number;
  category: string;
  published: boolean;
}

export interface MockOrder {
  createdAt: string;
  customer: string;
  id: string;
  productName: string;
  status: MockOrderStatus;
  totalCents: number;
}
