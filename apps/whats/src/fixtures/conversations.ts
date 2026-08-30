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
    preview: "Perfect, I will check the options for you.",
    status: "online",
    timestamp: "10:42",
    unread: 2,
  },
  {
    avatarTone: "bg-[#ffe8cc] text-[#c26a00]",
    id: "pingo-pet",
    name: "Pingo Pet Shop",
    pinned: true,
    preview: "Delivery is expected tomorrow.",
    timestamp: "09:18",
  },
  {
    avatarTone: "bg-[#e4d9ff] text-[#6b45b5]",
    id: "marina",
    muted: true,
    name: "Marina Oliveira",
    preview: "You: Thank you!",
    timestamp: "Ontem",
  },
  {
    avatarTone: "bg-[#d8f3ff] text-[#087ca5]",
    id: "petz-team",
    name: "Petz Commerce",
    preview: "Lucas: New catalog published",
    timestamp: "Ontem",
  },
  {
    avatarTone: "bg-[#ffe0e7] text-[#b83c5a]",
    id: "delivery",
    name: "Logistics and deliveries",
    preview: "You: Let’s track the order.",
    timestamp: "Sat",
  },
];
