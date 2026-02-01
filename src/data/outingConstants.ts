export type OutingTypeId =
  | "house_party"
  | "rooftop_mixer"
  | "club_pre_game"
  | "after_party"
  | "sunset_soiree"
  | "beach_vibes"
  | "terrace_chill"
  | "board_games"
  | "karaoke"
  | "open_mic"
  | "live_music"
  | "dj_set"
  | "deep_talks"
  | "coffee_social"
  | "brunch_meet"
  | "movie_night"
  | "anime_watch"
  | "sports_screening"
  | "gaming_lan"
  | "arcade_hang"
  | "food_crawl"
  | "street_food_run"
  | "dessert_date_group"
  | "museum_date"
  | "art_walk"
  | "thrift_walk"
  | "photowalk"
  | "drive_chill"
  | "night_market"
  | "festival_meet"
  | "college_mixer"
  | "freshers_mixer"
  | "study_sprint"
  | "wellness_hang";

export type VibeTagId =
  // Energy & social style
  | "high_energy"
  | "chill"
  | "calm"
  | "chaos"
  | "introvert_friendly"
  | "extrovert_heavy"
  | "small_circle"
  | "big_crowd"
  | "games_icebreakers"
  | "deep_convos"
  // Music vibe
  | "bollywood"
  | "punjabi"
  | "hiphop"
  | "techno"
  | "house"
  | "deep_house"
  | "indie"
  | "edm"
  | "afro"
  | "lofi"
  // Drinking & rules
  | "byob"
  | "no_alcohol"
  | "light_drinks"
  | "smoke_friendly"
  | "non_smoke"
  | "strict_rules"
  | "safe_space"
  | "respect_first"
  // Crowd & access
  | "invite_only"
  | "students_only"
  | "verified_host"
  | "freshers_welcome"
  | "girls_friendly"
  | "mixed_group"
  | "new_people_welcome"
  | "friends_of_friends"
  // Vibe aesthetics
  | "aesthetic"
  | "minimal"
  | "dressed_up"
  | "casual"
  | "late_night"
  | "sunset"
  | "rooftop"
  | "cozy";

export type OutingType = {
  id: OutingTypeId;
  label: string;
  emoji?: string;
  category: "party" | "social" | "food" | "culture" | "gaming" | "wellness" | "other";
};

export type VibeTag = {
  id: VibeTagId;
  label: string;
  group: "energy" | "music" | "rules" | "crowd" | "aesthetic";
};

export const OUTING_TYPES: Record<OutingTypeId, OutingType> = {
  house_party: { id: "house_party", label: "House Party", emoji: "🏠", category: "party" },
  rooftop_mixer: { id: "rooftop_mixer", label: "Rooftop Mixer", emoji: "🌆", category: "party" },
  club_pre_game: { id: "club_pre_game", label: "Pre-game", emoji: "🍻", category: "party" },
  after_party: { id: "after_party", label: "Afterparty", emoji: "🌙", category: "party" },
  sunset_soiree: { id: "sunset_soiree", label: "Sunset Soirée", emoji: "🌅", category: "social" },
  beach_vibes: { id: "beach_vibes", label: "Beach Vibes", emoji: "🏖️", category: "social" },
  terrace_chill: { id: "terrace_chill", label: "Terrace Chill", emoji: "🌴", category: "social" },
  board_games: { id: "board_games", label: "Board Games Night", emoji: "🎲", category: "social" },
  karaoke: { id: "karaoke", label: "Karaoke Night", emoji: "🎤", category: "social" },
  open_mic: { id: "open_mic", label: "Open Mic", emoji: "🎙️", category: "culture" },
  live_music: { id: "live_music", label: "Live Music Hang", emoji: "🎸", category: "culture" },
  dj_set: { id: "dj_set", label: "DJ Set", emoji: "🎧", category: "party" },
  deep_talks: { id: "deep_talks", label: "Deep Talks Circle", emoji: "💭", category: "social" },
  coffee_social: { id: "coffee_social", label: "Coffee Social", emoji: "☕", category: "social" },
  brunch_meet: { id: "brunch_meet", label: "Brunch Meet", emoji: "🥐", category: "food" },
  movie_night: { id: "movie_night", label: "Movie Night", emoji: "🎬", category: "social" },
  anime_watch: { id: "anime_watch", label: "Anime Watch Party", emoji: "🎌", category: "social" },
  sports_screening: { id: "sports_screening", label: "Match Screening", emoji: "⚽", category: "social" },
  gaming_lan: { id: "gaming_lan", label: "Gaming Night", emoji: "🎮", category: "gaming" },
  arcade_hang: { id: "arcade_hang", label: "Arcade Hang", emoji: "🕹️", category: "gaming" },
  food_crawl: { id: "food_crawl", label: "Food Crawl", emoji: "🍜", category: "food" },
  street_food_run: { id: "street_food_run", label: "Street Food Run", emoji: "🌮", category: "food" },
  dessert_date_group: { id: "dessert_date_group", label: "Dessert Run", emoji: "🍰", category: "food" },
  museum_date: { id: "museum_date", label: "Museum / Gallery Visit", emoji: "🖼️", category: "culture" },
  art_walk: { id: "art_walk", label: "Art Walk", emoji: "🎨", category: "culture" },
  thrift_walk: { id: "thrift_walk", label: "Thrift / Shopping Walk", emoji: "👗", category: "other" },
  photowalk: { id: "photowalk", label: "Photo Walk", emoji: "📸", category: "culture" },
  drive_chill: { id: "drive_chill", label: "Late-night Drive", emoji: "🚗", category: "other" },
  night_market: { id: "night_market", label: "Night Market", emoji: "🌃", category: "other" },
  festival_meet: { id: "festival_meet", label: "Festival Meetup", emoji: "🎪", category: "other" },
  college_mixer: { id: "college_mixer", label: "College Mixer", emoji: "🎓", category: "social" },
  freshers_mixer: { id: "freshers_mixer", label: "Freshers Mixer", emoji: "🎉", category: "social" },
  study_sprint: { id: "study_sprint", label: "Study Sprint + Breaks", emoji: "📚", category: "other" },
  wellness_hang: { id: "wellness_hang", label: "Yoga / Wellness Hang", emoji: "🧘", category: "wellness" },
};

export const VIBE_TAGS: Record<VibeTagId, VibeTag> = {
  // Energy & social style
  high_energy: { id: "high_energy", label: "High Energy", group: "energy" },
  chill: { id: "chill", label: "Chill", group: "energy" },
  calm: { id: "calm", label: "Calm", group: "energy" },
  chaos: { id: "chaos", label: "Chaos", group: "energy" },
  introvert_friendly: { id: "introvert_friendly", label: "Introvert Friendly", group: "energy" },
  extrovert_heavy: { id: "extrovert_heavy", label: "Extrovert Heavy", group: "energy" },
  small_circle: { id: "small_circle", label: "Small Circle", group: "energy" },
  big_crowd: { id: "big_crowd", label: "Big Crowd", group: "energy" },
  games_icebreakers: { id: "games_icebreakers", label: "Games & Icebreakers", group: "energy" },
  deep_convos: { id: "deep_convos", label: "Deep Conversations", group: "energy" },
  // Music vibe
  bollywood: { id: "bollywood", label: "Bollywood", group: "music" },
  punjabi: { id: "punjabi", label: "Punjabi", group: "music" },
  hiphop: { id: "hiphop", label: "Hip Hop", group: "music" },
  techno: { id: "techno", label: "Techno", group: "music" },
  house: { id: "house", label: "House", group: "music" },
  deep_house: { id: "deep_house", label: "Deep House", group: "music" },
  indie: { id: "indie", label: "Indie", group: "music" },
  edm: { id: "edm", label: "EDM", group: "music" },
  afro: { id: "afro", label: "Afro", group: "music" },
  lofi: { id: "lofi", label: "Lo-Fi", group: "music" },
  // Drinking & rules
  byob: { id: "byob", label: "BYOB", group: "rules" },
  no_alcohol: { id: "no_alcohol", label: "No Alcohol", group: "rules" },
  light_drinks: { id: "light_drinks", label: "Light Drinks", group: "rules" },
  smoke_friendly: { id: "smoke_friendly", label: "Smoke Friendly", group: "rules" },
  non_smoke: { id: "non_smoke", label: "Non-Smoke", group: "rules" },
  strict_rules: { id: "strict_rules", label: "Strict Rules", group: "rules" },
  safe_space: { id: "safe_space", label: "Safe Space", group: "rules" },
  respect_first: { id: "respect_first", label: "Respect First", group: "rules" },
  // Crowd & access
  invite_only: { id: "invite_only", label: "Invite Only", group: "crowd" },
  students_only: { id: "students_only", label: "Students Only", group: "crowd" },
  verified_host: { id: "verified_host", label: "Verified Host", group: "crowd" },
  freshers_welcome: { id: "freshers_welcome", label: "Freshers Welcome", group: "crowd" },
  girls_friendly: { id: "girls_friendly", label: "Girls Friendly", group: "crowd" },
  mixed_group: { id: "mixed_group", label: "Mixed Group", group: "crowd" },
  new_people_welcome: { id: "new_people_welcome", label: "New People Welcome", group: "crowd" },
  friends_of_friends: { id: "friends_of_friends", label: "Friends of Friends", group: "crowd" },
  // Vibe aesthetics
  aesthetic: { id: "aesthetic", label: "Aesthetic", group: "aesthetic" },
  minimal: { id: "minimal", label: "Minimal", group: "aesthetic" },
  dressed_up: { id: "dressed_up", label: "Dressed Up", group: "aesthetic" },
  casual: { id: "casual", label: "Casual", group: "aesthetic" },
  late_night: { id: "late_night", label: "Late Night", group: "aesthetic" },
  sunset: { id: "sunset", label: "Sunset", group: "aesthetic" },
  rooftop: { id: "rooftop", label: "Rooftop", group: "aesthetic" },
  cozy: { id: "cozy", label: "Cozy", group: "aesthetic" },
};

// Popular types shown first (top 8)
export const POPULAR_OUTING_TYPES: OutingTypeId[] = [
  "house_party",
  "rooftop_mixer",
  "club_pre_game",
  "beach_vibes",
  "board_games",
  "karaoke",
  "coffee_social",
  "movie_night",
];

// Quick pick tags (top 12)
export const QUICK_PICK_TAGS: VibeTagId[] = [
  "byob",
  "invite_only",
  "deep_house",
  "students_only",
  "high_energy",
  "chill",
  "bollywood",
  "safe_space",
  "new_people_welcome",
  "casual",
  "late_night",
  "cozy",
];

// Get all tags by group
export const getTagsByGroup = (group: VibeTag["group"]): VibeTag[] => {
  return Object.values(VIBE_TAGS).filter((tag) => tag.group === group);
};

// Get all types by category
export const getTypesByCategory = (category: OutingType["category"]): OutingType[] => {
  return Object.values(OUTING_TYPES).filter((type) => type.category === category);
};


