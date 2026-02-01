export type ChatMessage = {
  id: string;
  type?: "user" | "system";
  senderId?: string;
  senderName?: string;
  senderPhotoUrl?: string;
  text: string;
  createdAt: any;
};
