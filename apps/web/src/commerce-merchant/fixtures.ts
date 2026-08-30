import type { CatalogProduct, MerchantProfile, MockOrder } from "./types";

export const YUNO_COMMISSION_BPS = 350;

export const petzMerchant: MerchantProfile = {
  legalName: "Petz Commerce and Holdings S.A.",
  name: "Petz",
  routingConnectionName: "Petz · Brazil",
  supportEmail: "commerce@petz.com.br",
};

export const petzCatalog: CatalogProduct[] = [
  {
    category: "Food",
    id: "petz-racao-adulto",
    name: "Adult dry dog food",
    priceCents: 8990,
    published: true,
  },
  {
    category: "Hygiene",
    id: "petz-tapete-higienico",
    name: "Premium training pads",
    priceCents: 6790,
    published: true,
  },
  {
    category: "Wellness",
    id: "petz-antipulgas",
    name: "Flea treatment for dogs up to 10 kg",
    priceCents: 11_490,
    published: true,
  },
];

export const petzOrders: MockOrder[] = [
  {
    createdAt: "Today, 10:32 AM",
    customer: "Maria S.",
    id: "YC-2048",
    productName: "Adult dry dog food",
    status: "paid",
    totalCents: 8990,
  },
  {
    createdAt: "Today, 9:47 AM",
    customer: "Rafael M.",
    id: "YC-2047",
    productName: "Flea treatment for dogs up to 10 kg",
    status: "failed",
    totalCents: 11_490,
  },
  {
    createdAt: "Yesterday, 5:16 PM",
    customer: "Ana C.",
    id: "YC-2046",
    productName: "Premium training pads",
    status: "paid",
    totalCents: 13_580,
  },
];

export const formatCurrency = (valueCents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
