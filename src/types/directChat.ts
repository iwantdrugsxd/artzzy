export type DirectChatState = "active" | "expired" | "blocked";

export type DirectChatThread = {
  id: string;
  participants: string[]; // [fromUid, toUid]
  createdAt?: any;
  expiresAt?: any;
  lastMessage?: {
    text: string;
    senderUid: string;
    createdAt: any;
  };
  state: DirectChatState;
};

export type DirectChatMessage = {
  id: string;
  type: "user" | "system";
  senderUid: string | null;
  text: string;
  createdAt: any;
};

export type DirectChatState = "active" | "expired" | "blocked" | "saved";

export type DirectChat = {
  id?: string;
  participants: string[];
  createdAt: any;
  expiresAt: any;
  lastMessage?: {
    text: string;
    senderUid: string;
    createdAt: any;
  };
  state: DirectChatState;
};

export type DirectMessage = {
  id?: string;
  type: "user" | "system";
  senderUid: string | null;
  text: string;
  createdAt: any;
};
