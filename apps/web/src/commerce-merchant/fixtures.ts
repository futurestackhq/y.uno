import type { CatalogProduct, MerchantProfile, MockOrder } from "./types";

export const YUNO_COMMISSION_BPS = 350;

export const petzMerchant: MerchantProfile = {
  legalName: "Petz Comércio e Participações S.A.",
  name: "Petz",
  routingConnectionName: "Petz · Brasil",
  supportEmail: "commerce@petz.com.br",
};

export const petzCatalog: CatalogProduct[] = [
  {
    category: "Alimentação",
    id: "petz-racao-adulto",
    name: "Ração seca para cães adultos",
    priceCents: 8_990,
    published: true,
  },
  {
    category: "Higiene",
    id: "petz-tapete-higienico",
    name: "Tapete higiênico premium",
    priceCents: 6_790,
    published: true,
  },
  {
    category: "Bem-estar",
    id: "petz-antipulgas",
    name: "Antipulgas para cães até 10 kg",
    priceCents: 11_490,
    published: true,
  },
];

export const petzOrders: MockOrder[] = [
  {
    createdAt: "Hoje, 10:32",
    customer: "Maria S.",
    id: "YC-2048",
    productName: "Ração seca para cães adultos",
    status: "paid",
    totalCents: 8_990,
  },
  {
    createdAt: "Hoje, 09:47",
    customer: "Rafael M.",
    id: "YC-2047",
    productName: "Antipulgas para cães até 10 kg",
    status: "failed",
    totalCents: 11_490,
  },
  {
    createdAt: "Ontem, 17:16",
    customer: "Ana C.",
    id: "YC-2046",
    productName: "Tapete higiênico premium",
    status: "paid",
    totalCents: 13_580,
  },
];

export const formatCurrency = (valueCents: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
