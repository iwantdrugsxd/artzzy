export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type ConnectionRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  status: ConnectionRequestStatus;
  vibeScore: number;
  mutualTagIds: string[];
  mutualInterestIds: string[];
  message?: string;
  createdAt?: any;
  expiresAt?: any;
  decisionAt?: any;
  decidedBy?: string;
  city?: string;
  source: "people_feed" | "profile" | "post_event";
};

export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type ConnectionRequestSource =
  | "people_feed"
  | "profile"
  | "post_event";

export type ConnectionRequest = {
  id?: string;
  fromUid: string;
  toUid: string;
  status: ConnectionRequestStatus;
  vibeScore: number;
  mutualTagIds: string[];
  mutualInterestIds: string[];
  message?: string;
  createdAt: any;
  expiresAt: any;
  decisionAt?: any;
  decidedBy?: string;
  city?: string;
  source: ConnectionRequestSource;
  fromName?: string;
  fromPhoto?: string;
};

export type ConnectionNotificationType =
  | "connection_request"
  | "connection_accepted"
  | "connection_rejected"
  | "connection_expired"
  | "direct_chat_expired"
  | "saved_connection_confirmed";
