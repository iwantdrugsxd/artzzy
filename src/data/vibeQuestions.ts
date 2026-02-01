export type VibeOption = {
  value: string;
  label: string;
  subtitle?: string;
};

export type VibeQuestion = {
  key: string;
  title: string;
  subtitle?: string;
  options: VibeOption[];
};

export const vibeQuestions: VibeQuestion[] = [
  {
    key: "social_energy",
    title: "How social are you at parties?",
    subtitle: "This helps us match your energy with the right events.",
    options: [
      { value: "observe", label: "I mostly observe" },
      { value: "known_people", label: "I talk to people I already know" },
      { value: "warm_up", label: "I warm up slowly" },
      { value: "few_new", label: "I talk to a few new people" },
      { value: "everyone", label: "I love meeting everyone" },
      { value: "center", label: "I'm the center of attention" },
    ],
  },
  {
    key: "party_style",
    title: "What kind of plans excite you most?",
    options: [
      { value: "coffee", label: "Quiet coffee" },
      { value: "deep_talks", label: "Deep late-night talks" },
      { value: "movie", label: "Movie nights" },
      { value: "house_party", label: "Small house parties" },
      { value: "clubbing", label: "Clubbing" },
      { value: "chaos", label: "Big chaotic parties" },
    ],
  },
  {
    key: "spontaneity",
    title: "How spontaneous are you?",
    options: [
      { value: "two_days", label: "I need 2 days' notice" },
      { value: "planning", label: "I prefer planning" },
      { value: "flexible", label: "Somewhat flexible" },
      { value: "down_if_free", label: "Down if free" },
      { value: "spontaneous", label: "Very spontaneous" },
      { value: "right_now", label: "Let's go right now" },
    ],
  },
  {
    key: "conversation",
    title: "What do you enjoy talking about most?",
    options: [
      { value: "growth", label: "Personal growth" },
      { value: "relationships", label: "Relationships" },
      { value: "memes", label: "Memes & jokes" },
      { value: "music_movies", label: "Music & movies" },
      { value: "random", label: "Random nonsense" },
      { value: "philosophy", label: "Deep philosophy" },
    ],
  },
  {
    key: "alcohol",
    title: "What's your vibe around alcohol?",
    options: [
      { value: "none", label: "I don't drink" },
      { value: "rarely", label: "Rarely" },
      { value: "socially", label: "Socially" },
      { value: "weekends", label: "Weekends only" },
      { value: "often", label: "Often at parties" },
      { value: "lit", label: "Let's get lit" },
    ],
  },
  {
    key: "energy_level",
    title: "What's your usual energy level?",
    options: [
      { value: "calm", label: "Calm & quiet" },
      { value: "soft", label: "Soft-spoken" },
      { value: "balanced", label: "Balanced" },
      { value: "energetic", label: "Energetic" },
      { value: "hyper", label: "Hyper" },
      { value: "chaos", label: "Chaos mode" },
    ],
  },
  {
    key: "group_size",
    title: "What group size do you enjoy most?",
    options: [
      { value: "one_two", label: "1-2 people" },
      { value: "three_four", label: "3-4" },
      { value: "five_seven", label: "5-7" },
      { value: "eight_ten", label: "8-10" },
      { value: "ten_plus", label: "10+" },
      { value: "any", label: "Doesn't matter" },
    ],
  },
  {
    key: "intent",
    title: "What are you mainly here for?",
    options: [
      { value: "friends", label: "Making friends" },
      { value: "hangouts", label: "Casual hangouts" },
      { value: "party_buddies", label: "Party buddies" },
      { value: "networking", label: "Networking" },
      { value: "dating", label: "Dating vibes" },
      { value: "anything", label: "Anything fun" },
    ],
  },
];
