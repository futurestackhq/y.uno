export interface MessageAction {
  id: string;
  label: string;
  kind: "primary" | "secondary";
}

export interface CarouselCard {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  price: string;
  actionLabel: string;
  tone: string;
  imageUrl?: string;
}

export interface ListItem {
  id: string;
  title: string;
  description: string;
}

export type WhatsMessage =
  | {
      id: string;
      direction: "in" | "out";
      kind: "text";
      text: string;
      time: string;
      state?: "sent" | "delivered" | "read";
    }
  | {
      id: string;
      direction: "in";
      kind: "flow";
      title: string;
      description: string;
      actionLabel: string;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "carousel";
      title: string;
      cards: CarouselCard[];
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "list";
      title: string;
      items: ListItem[];
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "purchase_summary";
      title: string;
      merchant: string;
      description: string;
      total: string;
      actions: MessageAction[];
      orderId?: string;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "product_detail";
      catalogItemId: string;
      title: string;
      description: string;
      price: string;
      actionLabel: string;
      isOrderStarted?: boolean;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "pix_confirmation";
      prompt: string;
      details: string[];
      actionLabel: string;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "category_prompt";
      text: string;
      actionLabel: string;
      time: string;
    }
  | {
      id: string;
      direction: "in";
      kind: "receipt";
      text: string;
      time: string;
    }
  | {
      id: string;
      direction: "out";
      kind: "paid_status";
      title: string;
      subtitle: string;
      time: string;
    };

export const initialMessages: WhatsMessage[] = [
  {
    direction: "in",
    id: "welcome",
    kind: "text",
    text: "Hello! I am the y.uno commerce assistant. How can I help?",
    time: "10:32",
  },
  {
    direction: "out",
    id: "request",
    kind: "text",
    state: "read",
    text: "Hi! I need pet food for a medium-sized adult dog.",
    time: "10:33",
  },
  {
    cards: [
      {
        actionLabel: "View details",
        description: "Adult dogs • 15 kg",
        eyebrow: "Dry pet food",
        id: "premium-food",
        price: "R$ 189,90",
        title: "PremieR Fórmula",
        tone: "from-[#d9fdd3] to-[#a9e6cf]",
      },
      {
        actionLabel: "View details",
        description: "Adult dogs • 10.1 kg",
        eyebrow: "Natural pet food",
        id: "natural-food",
        price: "R$ 219,90",
        title: "Biofresh Adultos",
        tone: "from-[#d9eefa] to-[#b7d8e8]",
      },
      {
        actionLabel: "View details",
        description: "Medium Adult • 15 kg",
        eyebrow: "Linha premium",
        id: "royal-food",
        price: "R$ 249,90",
        title: "Royal Canin",
        tone: "from-[#fce3c5] to-[#efbd89]",
      },
      {
        actionLabel: "View details",
        description: "Adult dogs • 15 kg",
        eyebrow: "Super premium pet food",
        id: "proplan-food",
        price: "R$ 279,90",
        title: "Pro Plan",
        tone: "from-[#e8d8f5] to-[#c6b0df]",
      },
    ],
    direction: "in",
    id: "carousel",
    kind: "carousel",
    time: "10:34",
    title: "I found these options for you:",
  },
  {
    direction: "in",
    id: "details",
    items: [
      {
        description: "Receba em casa ou retire na loja",
        id: "buy",
        title: "Buy now",
      },
      {
        description: "Compare product differences",
        id: "compare",
        title: "Compare options",
      },
      {
        description: "View available discounts",
        id: "discount",
        title: "Ver ofertas",
      },
    ],
    kind: "list",
    time: "10:35",
    title: "What would you like to do?",
  },
  {
    actionLabel: "Abrir Flow",
    description: "Enter your delivery details in a fast, secure flow.",
    direction: "in",
    id: "flow",
    kind: "flow",
    time: "10:36",
    title: "Continuar pelo Flow",
  },
  {
    actionLabel: "Confirm",
    details: [
      "👤 Nome: Adedayo Diana Costa Sanni",
      "💰 Valor: R$ 10,00",
      "🧾 Documento: ***.352.948-**",
      "🏦 Institution: CAIXA ECONOMICA FEDERAL",
      "🔑 Chave: 10735294879",
    ],
    direction: "in",
    id: "pix-confirmation",
    kind: "pix_confirmation",
    prompt: "Do you confirm this PIX payment of R$10.00?",
    time: "10:40",
  },
  {
    actionLabel: "Adicionar categoria",
    direction: "in",
    id: "category-prompt",
    kind: "category_prompt",
    text: "You can add a category to this PIX payment below",
    time: "10:41",
  },
  {
    direction: "in",
    id: "receipt",
    kind: "receipt",
    text: "Order #YU-1042 confirmed. Thank you for shopping with Petz!",
    time: "10:42",
  },
];
