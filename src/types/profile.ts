export type Gender = "male" | "female" | "prefer_not_to_say";

export type ProfilePrompt = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export type Profile = {
  user_id: string;
  email: string;
  name: string;
  birthdate: string;
  gender: Gender;
  city: string;
  country: string;
  bio: string;
  // Legacy single photo field (still populated for backward compatibility)
  profile_photo_url: string;
  // New multi-photo fields
  profilePhotoUrls?: string[]; // ordered, min length 1 when set
  primaryPhotoUrl?: string; // equals profilePhotoUrls[0]
  // Social proof
  connectionsCount?: number;
  interests: string[];
  vibe_answers: Record<string, string>;
  // Partizo Profile Intelligence System
  quick_badges?: string[]; // 4-6 badges selected by user
  prompts?: ProfilePrompt[]; // 2-3 prompts with answers
  created_at: number;
  onboarding_complete: boolean;
  isHost?: boolean;
  hostScore?: number; // Phase 2: Host credibility score (0-100)
  // Phase 1: Profile upgrades
  height?: string; // e.g., "175 cm" or "5'9""
  work?: string; // Job title or company
  education?: string; // School or degree
  isVerified?: boolean; // Verification badge
  // Phase 4: Referral and premium
  referralCode?: string; // Unique referral code
  spotlightActiveUntil?: any; // Timestamp - when spotlight expires
};

export type ProfileDraft = Omit<Profile, "user_id" | "email" | "created_at">;
