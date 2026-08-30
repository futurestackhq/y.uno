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
    text: "Olá! Eu sou o assistente da y.uno commerce. Como posso ajudar?",
    time: "10:32",
  },
  {
    direction: "out",
    id: "request",
    kind: "text",
    state: "read",
    text: "Oi! Preciso de uma ração para cachorro adulto de porte médio.",
    time: "10:33",
  },
  {
    cards: [
      {
        actionLabel: "Ver detalhes",
        description: "Cães adultos • 15 kg",
        eyebrow: "Ração seca",
        id: "premium-food",
        price: "R$ 189,90",
        title: "PremieR Fórmula",
        tone: "from-[#d9fdd3] to-[#a9e6cf]",
      },
      {
        actionLabel: "Ver detalhes",
        description: "Cães adultos • 10,1 kg",
        eyebrow: "Ração natural",
        id: "natural-food",
        price: "R$ 219,90",
        title: "Biofresh Adultos",
        tone: "from-[#d9eefa] to-[#b7d8e8]",
      },
      {
        actionLabel: "Ver detalhes",
        description: "Medium Adult • 15 kg",
        eyebrow: "Linha premium",
        id: "royal-food",
        price: "R$ 249,90",
        title: "Royal Canin",
        tone: "from-[#fce3c5] to-[#efbd89]",
      },
      {
        actionLabel: "Ver detalhes",
        description: "Cães adultos • 15 kg",
        eyebrow: "Ração super premium",
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
    title: "Encontrei estas opções para você:",
  },
  {
    direction: "in",
    id: "details",
    items: [
      {
        description: "Receba em casa ou retire na loja",
        id: "buy",
        title: "Comprar agora",
      },
      {
        description: "Veja diferenças entre os produtos",
        id: "compare",
        title: "Comparar opções",
      },
      {
        description: "Confira descontos disponíveis",
        id: "discount",
        title: "Ver ofertas",
      },
    ],
    kind: "list",
    time: "10:35",
    title: "O que você gostaria de fazer?",
  },
  {
    actionLabel: "Abrir Flow",
    description:
      "Preencha seus dados de entrega em uma experiência rápida e segura.",
    direction: "in",
    id: "flow",
    kind: "flow",
    time: "10:36",
    title: "Continuar pelo Flow",
  },
  {
    actionLabel: "Confirmar",
    details: [
      "👤 Nome: Adedayo Diana Costa Sanni",
      "💰 Valor: R$ 10,00",
      "🧾 Documento: ***.352.948-**",
      "🏦 Instituição: CAIXA ECONOMICA FEDERAL",
      "🔑 Chave: 10735294879",
    ],
    direction: "in",
    id: "pix-confirmation",
    kind: "pix_confirmation",
    prompt: "Você confirma esse PIX no valor de R$ 10,00?",
    time: "10:40",
  },
  {
    actionLabel: "Adicionar categoria",
    direction: "in",
    id: "category-prompt",
    kind: "category_prompt",
    text: "Você pode adicionar uma categoria para esse Pix clicando abaixo",
    time: "10:41",
  },
  {
    direction: "in",
    id: "receipt",
    kind: "receipt",
    text: "Pedido #YU-1042 confirmado. Obrigado por comprar com a Petz!",
    time: "10:42",
  },
];
