export type Prompt = {
  id: string;
  category: string;
  question: string;
};

export const PROMPTS_CORE: Prompt[] = [
  { id: "core_1", category: "core", question: "The vibe I bring to a group is…" },
  { id: "core_2", category: "core", question: "A night out with me usually ends with…" },
  { id: "core_3", category: "core", question: "My people would describe me as…" },
  { id: "core_4", category: "core", question: "The quickest way to get me talking is…" },
  { id: "core_5", category: "core", question: "One thing people misunderstand about me…" },
  { id: "core_6", category: "core", question: "My comfort zone looks like…" },
  { id: "core_7", category: "core", question: "The last time I felt truly alive was when…" },
  { id: "core_8", category: "core", question: "My social battery recharges by…" },
  { id: "core_9", category: "core", question: "The energy I'm attracted to is…" },
  { id: "core_10", category: "core", question: "If we vibe, expect a lot of…" },
];

export const PROMPTS_SOCIAL: Prompt[] = [
  { id: "social_1", category: "social", question: "My ideal party looks like…" },
  { id: "social_2", category: "social", question: "My role at a party is usually…" },
  { id: "social_3", category: "social", question: "I'm the friend who always…" },
  { id: "social_4", category: "social", question: "The kind of music that instantly changes my mood…" },
  { id: "social_5", category: "social", question: "I'm most fun when the vibe is…" },
  { id: "social_6", category: "social", question: "House parties or clubs? Why?" },
  { id: "social_7", category: "social", question: "The best conversations happen when…" },
  { id: "social_8", category: "social", question: "I leave a party when…" },
  { id: "social_9", category: "social", question: "My go-to drink (or non-drink) is…" },
  { id: "social_10", category: "social", question: "The best nights are unplanned because…" },
];

export const PROMPTS_DEPTH: Prompt[] = [
  { id: "depth_1", category: "depth", question: "A belief I've changed my mind about…" },
  { id: "depth_2", category: "depth", question: "Something I value more as I grow older…" },
  { id: "depth_3", category: "depth", question: "I feel most understood when…" },
  { id: "depth_4", category: "depth", question: "A conversation I could talk about for hours…" },
  { id: "depth_5", category: "depth", question: "Something I'm still figuring out…" },
  { id: "depth_6", category: "depth", question: "The kind of people I feel safest around…" },
  { id: "depth_7", category: "depth", question: "A moment that shaped who I am…" },
  { id: "depth_8", category: "depth", question: "What makes a connection meaningful to me…" },
];

export const PROMPTS_FUN: Prompt[] = [
  { id: "fun_1", category: "fun", question: "My most random talent…" },
  { id: "fun_2", category: "fun", question: "The weirdest compliment I've received…" },
  { id: "fun_3", category: "fun", question: "If my life had a theme song, it'd be…" },
  { id: "fun_4", category: "fun", question: "My toxic trait at parties…" },
  { id: "fun_5", category: "fun", question: "The hill I will die on…" },
  { id: "fun_6", category: "fun", question: "My most-used emoji says a lot about me…" },
  { id: "fun_7", category: "fun", question: "Something I'll never stop enjoying…" },
  { id: "fun_8", category: "fun", question: "A harmless habit I have…" },
];

export const PROMPTS_CITY: Prompt[] = [
  { id: "city_1", category: "city", question: "My favorite Mumbai spot right now…" },
  { id: "city_2", category: "city", question: "The best late-night plan in this city…" },
  { id: "city_3", category: "city", question: "My comfort neighborhood is…" },
  { id: "city_4", category: "city", question: "What I love (or hate) about this city…" },
  { id: "city_5", category: "city", question: "If you're new here, I'd recommend…" },
];

export const promptGroups = [
  { label: "Personality", prompts: PROMPTS_CORE },
  { label: "Social / Party", prompts: PROMPTS_SOCIAL },
  { label: "Depth / Intimacy", prompts: PROMPTS_DEPTH },
  { label: "Light / Fun", prompts: PROMPTS_FUN },
  { label: "City / Context", prompts: PROMPTS_CITY },
];

// All prompts flattened
export const allPrompts = [
  ...PROMPTS_CORE,
  ...PROMPTS_SOCIAL,
  ...PROMPTS_DEPTH,
  ...PROMPTS_FUN,
  ...PROMPTS_CITY,
];








