export interface ConversationFixture {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  unread?: number;
  muted?: boolean;
  pinned?: boolean;
  avatarTone: string;
  status?: string;
}

export const conversations: ConversationFixture[] = [
  {
    avatarTone: "bg-[#d9fdd3] text-[#008069]",
    id: "yuno-commerce",
    name: "y.uno commerce",
    preview: "Perfeito, vou verificar as opções para você.",
    status: "online",
    timestamp: "10:42",
    unread: 2,
  },
  {
    avatarTone: "bg-[#ffe8cc] text-[#c26a00]",
    id: "pingo-pet",
    name: "Pingo Pet Shop",
    pinned: true,
    preview: "A entrega está prevista para amanhã.",
    timestamp: "09:18",
  },
  {
    avatarTone: "bg-[#e4d9ff] text-[#6b45b5]",
    id: "marina",
    muted: true,
    name: "Marina Oliveira",
    preview: "Você: Obrigado!",
    timestamp: "Ontem",
  },
  {
    avatarTone: "bg-[#d8f3ff] text-[#087ca5]",
    id: "petz-team",
    name: "Petz Commerce",
    preview: "Lucas: Novo catálogo publicado",
    timestamp: "Ontem",
  },
  {
    avatarTone: "bg-[#ffe0e7] text-[#b83c5a]",
    id: "delivery",
    name: "Logística e entregas",
    preview: "Você: Vamos acompanhar o pedido.",
    timestamp: "Sáb",
  },
];
