export type BadgeGroup = {
  label: string;
  badges: string[];
};

export const LIFESTYLE_BADGES = [
  "🍷 Social Drinker",
  "🚫 Non-Drinker",
  "🚬 Smokes",
  "🌿 420 Friendly",
  "🚭 Non-Smoker",
  "🥗 Vegetarian",
  "🌱 Vegan",
  "🍖 Non-Vegetarian",
  "☕ Coffee Lover",
  "🫖 Tea Person",
  "🏋️ Gym Regular",
  "🧘 Yoga / Wellness",
  "🎮 Gamer",
  "📚 Reader",
  "🎵 Music First",
  "🎬 Movie Buff",
  "🛫 Loves Traveling",
  "🏠 Homebody",
];

export const SOCIAL_ENERGY_BADGES = [
  "⚡ High Energy",
  "🌊 Go With The Flow",
  "🌙 Night Owl",
  "☀️ Early Bird",
  "🪩 Party Friendly",
  "🕯️ Small Circles",
  "🎤 Loud & Social",
  "🤍 Calm Presence",
];

export const RELATIONSHIP_INTENT_BADGES = [
  "🤝 Here to Socialize",
  "🧠 Deep Connections",
  "🫂 Making Friends",
  "💬 Conversation First",
  "💃 Party Buddies",
  "🧘 No Expectations",
];

export const PERSONAL_CONTEXT_BADGES = [
  "💍 Single",
  "🧍‍♂️ Seeing Someone",
  "👫 Open Relationship",
  "❓ Prefer Not To Say",
  "🏙️ New to City",
  "📍 Local",
  "🎓 Student",
  "💼 Working Professional",
];

export const VALUES_BADGES = [
  "🧠 Mental Health Aware",
  "🤍 Respectful",
  "🚫 No Drama",
  "🌈 LGBTQ+ Friendly",
  "🛑 Consent First",
  "🧭 Values Privacy",
];

export const badgeGroups: BadgeGroup[] = [
  { label: "Lifestyle", badges: LIFESTYLE_BADGES },
  { label: "Social Energy", badges: SOCIAL_ENERGY_BADGES },
  { label: "Relationship / Intent", badges: RELATIONSHIP_INTENT_BADGES },
  { label: "Personal Context", badges: PERSONAL_CONTEXT_BADGES },
  { label: "Values / Boundaries", badges: VALUES_BADGES },
];

// All badges flattened for easy lookup
export const allBadges = [
  ...LIFESTYLE_BADGES,
  ...SOCIAL_ENERGY_BADGES,
  ...RELATIONSHIP_INTENT_BADGES,
  ...PERSONAL_CONTEXT_BADGES,
  ...VALUES_BADGES,
];







