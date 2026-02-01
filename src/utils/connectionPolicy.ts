import { Profile } from "../types/profile";

export const CONNECTION_LIMITS = {
  free: {
    dailyVibes: 3,
    maxActiveChats: 1,
    chatExpiryHours: 72,
  },
  plus: {
    dailyVibes: Infinity,
    maxActiveChats: 5,
    chatExpiryHours: 168,
  },
};

export const REQUEST_EXPIRY_HOURS = 24;
export const REQUEST_COOLDOWN_DAYS = 14;

export const getPlanTier = (profile?: Profile | null) => {
  const anyProfile = profile as any;
  if (!anyProfile) return "free" as const;
  if (anyProfile.plan === "plus" || anyProfile.isPremium || anyProfile.isPro) {
    return "plus" as const;
  }
  return "free" as const;
};

export const getDailyVibeLimit = (profile?: Profile | null) => {
  const tier = getPlanTier(profile);
  return CONNECTION_LIMITS[tier].dailyVibes;
};

export const getMaxActiveChats = (profile?: Profile | null) => {
  const tier = getPlanTier(profile);
  return CONNECTION_LIMITS[tier].maxActiveChats;
};

export const getChatExpiryHours = (profile?: Profile | null) => {
  const tier = getPlanTier(profile);
  return CONNECTION_LIMITS[tier].chatExpiryHours;
};

export const formatHoursLeft = (expiresAt?: any) => {
  if (!expiresAt?.toDate) return "";
  const expires = expiresAt.toDate();
  const diffMs = expires.getTime() - Date.now();
  const diffHours = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 0);
  return `${diffHours}h`;
};

export const getExpiryTimestamp = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};
