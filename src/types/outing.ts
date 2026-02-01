import { OutingTypeId, VibeTagId } from "../data/outingConstants";

export type Outing = {
  id: string;
  hostId: string;
  city: string;
  hostName: string;
  hostPhotoUrl: string;
  title: string;
  // Normalized fields
  typeId: OutingTypeId;
  type?: string; // Legacy support - can be removed later
  vibeTagIds: VibeTagId[];
  vibeTags?: string[]; // Legacy support
  // Vibe & energy
  vibeMode: "CHAOS" | "CALM" | "HIGH_ENERGY" | "CHILL";
  energy: number;
  // Location
  area: string;
  exactAddress?: string;
  location?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
  };
  // Timing
  dateTime: any;
  durationMins: number;
  // Capacity
  maxGuests: number;
  approvedCount: number;
  pendingCount: number;
  waitlistCount?: number; // Phase 2: Waitlist count
  // Status
  status: "active" | "cancelled" | "ended" | "full"; // Phase 2: Added "full" status
  visibility?: "public" | "invite_only";
  genderMix?: "mixed" | "women_only" | "men_only";
  // Event mode (dual-mode system)
  eventMode: "curated" | "fast";
  // Location reveal
  locationRevealMode?: "timelock" | "host_triggered";
  revealAt?: any; // Timestamp - when to reveal exact address
  manualReveal?: boolean; // Host manually revealed location
  // Media
  coverImageUrl: string;
  // Content
  rules: string[];
  description: string;
  // Search & discovery
  searchTokens?: string[];
  // Chat expiration
  chatExpiresAt?: any; // Timestamp
  // Timestamps
  createdAt?: any;
  updatedAt?: any;
};
