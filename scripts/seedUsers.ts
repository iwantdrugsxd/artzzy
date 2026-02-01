import admin from "firebase-admin";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const DRY_RUN = hasFlag("--dry-run");
const FORCE = hasFlag("--force");

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "..", "serviceAccountKey.json");

if (!existsSync(serviceAccountPath)) {
  console.error("❌ Service account JSON not found:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
const PROJECT_ID = serviceAccount.project_id;

// Safety check: Prevent running on production
const PROD_INDICATORS = ["prod", "production", "live"];
const isProd = PROD_INDICATORS.some((indicator) =>
  PROJECT_ID.toLowerCase().includes(indicator)
);

if (isProd && !FORCE) {
  console.error("❌ SAFETY CHECK FAILED");
  console.error(`Project ID "${PROJECT_ID}" appears to be a PRODUCTION project.`);
  console.error("If you're absolutely sure this is dev, use --force flag.");
  process.exit(1);
}

console.log("🔍 Project ID:", PROJECT_ID);
if (DRY_RUN) {
  console.log("🔍 DRY RUN MODE - No changes will be made");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const storage = admin.storage();
const Timestamp = admin.firestore.Timestamp;

// Utility functions
const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const sample = <T>(arr: T[], count: number) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Realistic Bumble-quality data
const firstNames = {
  female: [
    "Aanya", "Meera", "Riya", "Diya", "Zara", "Neha", "Aditi", "Sana", "Maya", "Tara",
    "Isha", "Kavya", "Ananya", "Pooja", "Priya", "Sneha", "Shreya", "Anjali", "Radha", "Lakshmi"
  ],
  male: [
    "Ishaan", "Kabir", "Karan", "Vihaan", "Arjun", "Rohan", "Pranav", "Nikhil", "Aman",
    "Rahul", "Arnav", "Aryan", "Ved", "Dev", "Reyansh", "Aarav", "Advik", "Dhruv", "Krish", "Rey"
  ]
};

const lastNames = [
  "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Verma", "Mehta", "Shah", "Reddy", "Joshi",
  "Malhotra", "Agarwal", "Nair", "Iyer", "Menon", "Narayan", "Rao", "Desai", "Kapoor", "Chopra"
];

const cities = [
  "Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad"
];

const bios = [
  "Coffee enthusiast, sunset chaser, and always down for spontaneous plans ☕🌅",
  "Music lover, deep conversation seeker, and rooftop vibes enthusiast 🎵✨",
  "Fitness junkie by day, party animal by night. Let's make memories 🏋️🎉",
  "Art galleries, wine nights, and meaningful connections. Here for the vibes 🍷🎨",
  "Travel addict, foodie, and always up for a good time. Let's explore together ✈️🍜",
  "Yoga practitioner, bookworm, and lover of late-night conversations 🧘📚",
  "Tech nerd, gaming enthusiast, and always down for board game nights 💻🎲",
  "Photography obsessed, adventure seeker, and here for authentic connections 📸🌍",
  "Dance floor regular, karaoke queen, and always bringing the energy 💃🎤",
  "Wine connoisseur, fine dining lover, and here for quality over quantity 🍷🍽️",
  "Beach bum, water sports enthusiast, and sunset cocktail lover 🏖️🍹",
  "Minimalist lifestyle, wellness focused, and here for mindful connections 🧘✨",
  "Fashion forward, brunch enthusiast, and always dressed for the occasion 👗🥂",
  "Live music fanatic, concert goer, and here for the sound and the scene 🎸🎵",
  "Street food explorer, local culture enthusiast, and always hungry for adventure 🍜🌆"
];

// High-quality profile photo URLs (using Unsplash for realistic photos)
// Expanded pool for variety across 50 users
const profilePhotos = {
  female: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80"
  ],
  male: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&q=80"
  ]
};

// Outing cover images
const outingCoverImages = [
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&q=80"
];

// Import badge and prompt data
const allBadges = [
  "🍷 Social Drinker", "🚫 Non-Drinker", "🚬 Smokes", "🌿 420 Friendly", "🚭 Non-Smoker",
  "🥗 Vegetarian", "🌱 Vegan", "🍖 Non-Vegetarian", "☕ Coffee Lover", "🫖 Tea Person",
  "🏋️ Gym Regular", "🧘 Yoga / Wellness", "🎮 Gamer", "📚 Reader", "🎵 Music First",
  "🎬 Movie Buff", "🛫 Loves Traveling", "🏠 Homebody", "⚡ High Energy", "🌊 Go With The Flow",
  "🌙 Night Owl", "☀️ Early Bird", "🪩 Party Friendly", "🕯️ Small Circles", "🎤 Loud & Social",
  "🤍 Calm Presence", "🤝 Here to Socialize", "🧠 Deep Connections", "🫂 Making Friends",
  "💬 Conversation First", "💃 Party Buddies", "🧘 No Expectations", "💍 Single",
  "🧍‍♂️ Seeing Someone", "👫 Open Relationship", "❓ Prefer Not To Say", "🏙️ New to City",
  "📍 Local", "🎓 Student", "💼 Working Professional", "🧠 Mental Health Aware",
  "🤍 Respectful", "🚫 No Drama", "🌈 LGBTQ+ Friendly", "🛑 Consent First", "🧭 Values Privacy"
];

const allPrompts = [
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
  { id: "depth_1", category: "depth", question: "A belief I've changed my mind about…" },
  { id: "depth_2", category: "depth", question: "Something I value more as I grow older…" },
  { id: "depth_3", category: "depth", question: "I feel most understood when…" },
  { id: "depth_4", category: "depth", question: "A conversation I could talk about for hours…" },
  { id: "depth_5", category: "depth", question: "Something I'm still figuring out…" },
  { id: "depth_6", category: "depth", question: "The kind of people I feel safest around…" },
  { id: "depth_7", category: "depth", question: "A moment that shaped who I am…" },
  { id: "depth_8", category: "depth", question: "What makes a connection meaningful to me…" },
  { id: "fun_1", category: "fun", question: "My most random talent…" },
  { id: "fun_2", category: "fun", question: "The weirdest compliment I've received…" },
  { id: "fun_3", category: "fun", question: "If my life had a theme song, it'd be…" },
  { id: "fun_4", category: "fun", question: "My toxic trait at parties…" },
  { id: "fun_5", category: "fun", question: "The hill I will die on…" },
  { id: "fun_6", category: "fun", question: "My most-used emoji says a lot about me…" },
  { id: "fun_7", category: "fun", question: "Something I'll never stop enjoying…" },
  { id: "fun_8", category: "fun", question: "A harmless habit I have…" },
  { id: "city_1", category: "city", question: "My favorite Mumbai spot right now…" },
  { id: "city_2", category: "city", question: "The best late-night plan in this city…" },
  { id: "city_3", category: "city", question: "My comfort neighborhood is…" },
  { id: "city_4", category: "city", question: "What I love (or hate) about this city…" },
  { id: "city_5", category: "city", question: "If you're new here, I'd recommend…" }
];

// Comprehensive first-person prompt answers (120-200 chars, realistic, unique per user)
const promptAnswers: Record<string, string[]> = {
  "core_1": [
    "I bring positive energy and make sure everyone feels included. I'm the one who notices when someone's quiet and pulls them into the conversation.",
    "I'm usually the calm presence in the group—I listen more than I talk, but when I do speak, people actually listen.",
    "I bring laughter and spontaneity. I'm the friend who suggests we do something wild at 2am and somehow everyone agrees.",
    "I bring authenticity and real talk. I don't do surface-level conversations—if we're talking, we're going deep."
  ],
  "core_2": [
    "Usually ends with deep conversations at 3am, either at someone's place or a late-night cafe. The best talks happen when everyone's tired and honest.",
    "Dancing until sunrise, then finding a breakfast spot and laughing about the night. Those are the nights I remember forever.",
    "Finding a new favorite spot we'll all come back to. I love discovering hidden gems in the city with good people.",
    "Making new friends and exchanging numbers. I believe every night out is a chance to meet someone who'll change your perspective."
  ],
  "core_3": [
    "They'd say I'm the life of the party—always bringing energy and making sure everyone's having a good time. But I also know when to dial it back.",
    "The listener and advice giver. People come to me when they need someone to talk to, and I'm always there with honest feedback.",
    "The planner and organizer. I'm the one who makes the group chat, books the table, and ensures everything runs smoothly.",
    "The spontaneous adventurer. I'm always down for last-minute plans and I'm usually the one suggesting we do something unexpected."
  ],
  "core_4": [
    "Mention music, books, or travel. Those three topics can get me talking for hours, especially if you share similar interests.",
    "Ask about my weekend plans or something I'm passionate about. I light up when talking about things I genuinely care about.",
    "Bring up a controversial topic or ask for my opinion on something. I love thoughtful debates and hearing different perspectives.",
    "Talk about food or share a restaurant recommendation. I'm a foodie at heart and I can talk about good food all day."
  ],
  "core_5": [
    "People think I'm always confident, but I actually struggle with anxiety sometimes. I've learned to fake it till I make it, but it's exhausting.",
    "They think I'm extroverted because I'm social, but I'm actually an introvert who's learned to be outgoing. I need alone time to recharge.",
    "People assume I have it all figured out, but I'm just as lost as everyone else. I'm just better at hiding it and staying positive.",
    "They think I'm always happy, but I have my down days too. I just prefer to keep those private and focus on being there for others."
  ],
  "core_6": [
    "My comfort zone is a small group of close friends, good music, and meaningful conversations. That's where I feel most like myself.",
    "It's a cozy space—could be my room, a quiet cafe, or a friend's place. Somewhere I can be quiet and not feel pressured to perform.",
    "It's anywhere with people I trust. I'm comfortable in crowds if I'm with the right people, but I prefer intimate settings.",
    "It's a balance—I love both quiet nights in and wild nights out. My comfort zone expands based on who I'm with and how I'm feeling."
  ],
  "core_7": [
    "When I went on a solo trip to Goa last month. I felt completely free and alive, meeting new people and doing things I never thought I'd do.",
    "At a music festival last summer. The energy, the music, the people—everything aligned perfectly and I felt like I was exactly where I was meant to be.",
    "During a deep conversation with a stranger at a rooftop party. We talked for hours about life, dreams, and everything in between. That connection was everything.",
    "When I finally quit my toxic job and started pursuing what I actually love. The freedom and excitement of that moment was indescribable."
  ],
  "core_8": [
    "I recharge by spending time alone—reading, listening to music, or just being in my own space. Social interactions drain me, so I need that balance.",
    "By being around people I love. I'm an extrovert, so being alone too long actually drains me. I need social connection to feel energized.",
    "Through movement—going to the gym, dancing, or just taking a long walk. Physical activity clears my mind and gives me energy.",
    "By doing something creative or learning something new. Whether it's writing, painting, or taking an online course, growth energizes me."
  ],
  "core_9": [
    "I'm attracted to people who are authentic and unapologetically themselves. Confidence without arrogance, kindness without weakness.",
    "I'm drawn to people who are curious and open-minded. I love conversations with people who ask good questions and actually listen to the answers.",
    "I'm attracted to positive energy and people who lift others up. Life's too short to be around negativity and drama.",
    "I'm drawn to people who are passionate about something—anything. I love seeing people light up when they talk about what they care about."
  ],
  "core_10": [
    "Expect a lot of laughter, deep conversations, and spontaneous adventures. I'm all about creating memories and genuine connections.",
    "Expect honesty, loyalty, and someone who'll always have your back. I'm the friend who shows up, no questions asked.",
    "Expect good vibes, great music recommendations, and someone who'll push you out of your comfort zone in the best way.",
    "Expect someone who's genuinely interested in getting to know you. I ask a lot of questions because I actually care about the answers."
  ],
  "social_1": [
    "An intimate house party with good music, great people, and deep conversations. I prefer smaller gatherings where you can actually connect with everyone.",
    "A rooftop mixer with sunset views, chill vibes, and a mix of people. The perfect balance of social and relaxed—that's my ideal party.",
    "A dance floor with friends, good music, and zero judgment. I love letting loose and just being in the moment with people I care about.",
    "A cozy gathering with deep talks, good food, and people who aren't afraid to be vulnerable. Those are the nights that stay with you."
  ],
  "social_2": [
    "I'm usually the DJ or the one controlling the music. I have strong opinions about what should be playing and I'm not afraid to change it.",
    "I'm the social connector—I introduce people, make sure everyone's included, and facilitate conversations. I hate seeing someone left out.",
    "I'm the observer who eventually becomes the life of the party. I start quiet, but once I'm comfortable, I'm dancing and making everyone laugh.",
    "I'm the planner who makes sure everything runs smoothly. I'm checking on people, organizing activities, and ensuring everyone's having a good time."
  ],
  "social_3": [
    "I'm the friend who always has snacks, knows the best spots in the city, and remembers everyone's preferences. I'm the designated organizer.",
    "I'm the friend who always shows up, even when it's inconvenient. I believe in being there for people, no matter what.",
    "I'm the friend who always has the best stories and can make anyone laugh. I'm the one people call when they need to lighten the mood.",
    "I'm the friend who always remembers the little things—birthdays, inside jokes, and what makes people happy. I pay attention to details."
  ],
  "social_4": [
    "Deep house or techno instantly puts me in a different headspace. There's something about those beats that just hits different, especially at night.",
    "Bollywood remixes or Punjabi music—I can't help but dance. It's in my blood and it brings out a side of me that's pure joy.",
    "Indie or alternative rock changes my mood completely. It makes me feel nostalgic and introspective, like I'm in a movie montage.",
    "Hip hop or rap gets me hyped. The energy and the lyrics speak to me in a way that other genres don't. It's my go-to for motivation."
  ],
  "social_5": [
    "I'm most fun when the vibe is relaxed and everyone's being themselves. No pressure, no judgment, just good people having a good time.",
    "I'm most fun when there's energy and excitement. I feed off the crowd's energy, so the more hyped everyone is, the more fun I have.",
    "I'm most fun when I'm with people I trust. I can be my weird, authentic self without worrying about being judged or misunderstood.",
    "I'm most fun when there's a mix of activities—not just one thing. I love variety, so parties with different zones or activities are my favorite."
  ],
  "social_6": [
    "House parties, 100%. You can actually talk to people, the music is usually better, and there's no pressure to look a certain way. It's more authentic.",
    "Clubs, but only if the music is good. I love dancing and the energy of a packed dance floor, but I need the right vibe to enjoy it.",
    "It depends on my mood. Sometimes I want the intimacy of a house party, other times I want the energy of a club. Both have their place.",
    "House parties for deep connections, clubs for letting loose. I appreciate both, but house parties are where I make the best memories."
  ],
  "social_7": [
    "The best conversations happen when everyone's a little tired and a little honest. Late nights bring out the real talk, and that's when connections form.",
    "When there's no pressure and people feel comfortable being vulnerable. I love conversations that go beyond surface-level small talk.",
    "Over food or drinks—there's something about sharing a meal that makes people more open. Food brings people together in a special way.",
    "When you're doing something together, not just sitting and talking. Walking, cooking, or even just being in the same space makes conversations flow better."
  ],
  "social_8": [
    "I leave when I'm tired or when the energy shifts. I can sense when a party's peaked and I'd rather leave on a high note than stay too long.",
    "When people start getting too drunk or the vibe becomes negative. I'm not about drama or watching people make bad decisions.",
    "I leave when I've had my fill of socializing. As an introvert, I know my limits and I'd rather leave early than crash and burn.",
    "I leave when I'm not having fun anymore. Life's too short to stay somewhere you don't want to be, even if it means leaving early."
  ],
  "social_9": [
    "Old Fashioned or a good whiskey on the rocks. I'm a classic drinker—I appreciate quality over quantity and I like drinks with character.",
    "Wine, always wine. Red or white, I'm not picky. There's something sophisticated and relaxed about wine that I love.",
    "Craft beer or a good IPA. I'm a beer enthusiast and I love trying new breweries and flavors. Beer is my go-to for casual nights.",
    "Mocktails or non-alcoholic options. I don't drink much, but I still want something that feels special and tastes good."
  ],
  "social_10": [
    "The best nights are unplanned because there's no expectation. When you go with the flow, you end up in places and situations you never would have planned.",
    "Unplanned nights have the best stories. When you don't know what's going to happen, you're more open to experiences and connections.",
    "Plans can be limiting. Unplanned nights let you be present and spontaneous, which is when the magic happens. Some of my best memories are from last-minute decisions.",
    "Unplanned nights force you to be flexible and open-minded. You can't control everything, so you just have to enjoy the ride and see where it takes you."
  ],
  "depth_1": [
    "I used to believe that success meant having a high-paying job and a perfect life. Now I realize success is about happiness, fulfillment, and meaningful connections.",
    "I believed that being vulnerable was a weakness. Now I know it's actually a strength—the people who matter will appreciate your authenticity.",
    "I thought I needed to have everything figured out by a certain age. Now I understand that life is a journey and it's okay to still be figuring things out.",
    "I used to think that being alone meant being lonely. Now I've learned to enjoy my own company and value solitude as much as I value connection."
  ],
  "depth_2": [
    "I value my time and energy more as I grow older. I've learned to say no to things that don't serve me and yes to things that bring me joy.",
    "I value authenticity and real connections. As I get older, I have less patience for fake people and surface-level relationships.",
    "I value my mental health and well-being. I've learned to prioritize self-care and set boundaries, even if it means disappointing people.",
    "I value experiences over things. Material possessions don't bring the same joy that memories, travel, and meaningful moments do."
  ],
  "depth_3": [
    "I feel most understood when someone actually listens—not just waits for their turn to talk, but genuinely hears what I'm saying and responds thoughtfully.",
    "When someone sees past my exterior and recognizes the real me. It's rare, but when it happens, it's the most validating feeling in the world.",
    "I feel most understood when I'm with people who've been through similar experiences. There's a comfort in knowing you're not alone in your struggles.",
    "When someone asks the right questions and shows genuine curiosity about who I am. Understanding comes from wanting to understand, not from assumptions."
  ],
  "depth_4": [
    "I could talk about travel and different cultures for hours. There's something fascinating about how people live differently around the world.",
    "Music and its impact on emotions and memories. I love discussing how certain songs or albums have shaped people's lives and experiences.",
    "Personal growth and self-discovery. I'm fascinated by how people change, what motivates them, and how they navigate life's challenges.",
    "Food and the stories behind it. Every dish has a history, and I love learning about different cuisines and the cultures they come from."
  ],
  "depth_5": [
    "I'm still figuring out what I want to do with my life. I have ideas and passions, but I'm not sure which path will lead to the most fulfillment.",
    "I'm figuring out how to balance being independent with wanting connection. I value my freedom, but I also crave deep, meaningful relationships.",
    "I'm still figuring out how to be fully myself without worrying about what others think. It's a work in progress, but I'm getting better at it.",
    "I'm figuring out how to pursue my dreams while being practical. I want to follow my passions, but I also need stability and security."
  ],
  "depth_6": [
    "I feel safest around people who are non-judgmental and accepting. People who let me be myself without trying to change or fix me.",
    "Around people who are honest and direct. I appreciate transparency and I feel safe when I know where I stand with someone.",
    "I feel safest with people who are emotionally intelligent and empathetic. They understand boundaries and know how to create a safe space.",
    "Around people who've shown me they can be trusted. Safety comes from consistency and knowing that someone will be there when it matters."
  ],
  "depth_7": [
    "Moving to a new city alone shaped who I am. It forced me to be independent, make my own decisions, and learn to rely on myself.",
    "A difficult breakup that made me realize my worth. It taught me to set boundaries and not settle for less than I deserve.",
    "Meeting someone who believed in me when I didn't believe in myself. That person showed me what I was capable of and changed my trajectory.",
    "A period of depression that made me prioritize my mental health. It was painful, but it led me to therapy, self-care, and a better understanding of myself."
  ],
  "depth_8": [
    "A meaningful connection is one where you can be completely yourself without fear of judgment. It's about mutual respect, understanding, and genuine care.",
    "It's about depth and authenticity. Surface-level connections are easy, but meaningful ones require vulnerability and the willingness to truly know someone.",
    "Meaningful connections happen when both people are present and engaged. It's not about the quantity of time, but the quality of the interaction.",
    "It's about feeling seen and understood. When someone gets you—really gets you—that's when a connection becomes meaningful and lasting."
  ],
  "fun_1": [
    "I can solve a Rubik's cube in under two minutes. It's completely useless, but it impresses people at parties and it's oddly satisfying.",
    "I can identify most songs within the first few seconds. My friends call me Shazam because I know way too much about music.",
    "I can make really good cocktails. I've spent way too much time learning mixology, but now I'm the go-to person for drinks at parties.",
    "I can do a pretty good impression of various accents. It's a weird party trick that always gets a laugh, even if it's not always accurate."
  ],
  "fun_2": [
    "Someone once told me I have 'main character energy' and I've been riding that high for months. It's the best compliment I've ever received.",
    "A stranger told me I have a calming presence and that being around me makes them feel at peace. That meant more than they'll ever know.",
    "Someone said I have the best laugh and now I'm self-conscious about it, but also kind of proud? It's a weird compliment, but I'll take it.",
    "A friend told me I'm the most authentic person they know. Coming from someone I respect, that's the highest praise I could ask for."
  ],
  "fun_3": [
    "Probably something by The Weeknd or Dua Lipa—moody, atmospheric, and perfect for late-night drives. That's the energy I'm going for.",
    "Something upbeat and energetic, like a mix of Bollywood and EDM. I want my theme song to make people want to dance and feel alive.",
    "An indie song with deep lyrics and a good beat. Something that captures both my introspective side and my love for good music.",
    "It depends on my mood, but probably something by Taylor Swift or Lana Del Rey. Their music tells stories, and I'm all about storytelling."
  ],
  "fun_4": [
    "I'm the friend who takes way too many photos and videos. I know it's annoying, but I want to remember everything and I can't help myself.",
    "I get way too excited about things and I can be a bit much sometimes. My energy is high and not everyone can handle it, but I can't turn it off.",
    "I'm the friend who's always late. I have good intentions, but time management is not my strong suit and I'm working on it, I promise.",
    "I overthink everything and I can be indecisive. I'll ask for everyone's opinion and then still not know what I want. It's a process."
  ],
  "fun_5": [
    "Pineapple does NOT belong on pizza. I will die on this hill. It's a fruit, it doesn't belong on savory food, and I will fight anyone who disagrees.",
    "The Oxford comma is necessary and I will not be convinced otherwise. Clarity matters, and the Oxford comma provides that clarity. End of discussion.",
    "Cold coffee is better than hot coffee. Iced coffee, cold brew, frappes—all superior to hot coffee. I don't care if it's basic, it's the truth.",
    "The book is always better than the movie. Always. No exceptions. If you think otherwise, you probably haven't read the book properly."
  ],
  "fun_6": [
    "I use 😂 way too much, which probably means I'm either really happy or really awkward. It's my default response when I don't know what else to say.",
    "I'm a ✨ person. I use it to add sparkle to everything, which probably says I'm optimistic and maybe a little extra, but I'm okay with that.",
    "I use 🎉 for everything—good news, celebrations, or just when I'm excited. It's my way of bringing energy to conversations, even through text.",
    "I'm a 🥺 user, which probably means I'm emotional and maybe a little dramatic, but I think it's cute and it accurately represents my feelings."
  ],
  "fun_7": [
    "I'll never stop enjoying live music. There's something magical about being in a crowd, feeling the bass, and experiencing music in real time.",
    "I'll never stop enjoying good food and trying new restaurants. Food is one of life's greatest pleasures and I'll always be excited about a good meal.",
    "I'll never stop enjoying deep conversations with interesting people. There's nothing better than talking to someone who makes you think and feel.",
    "I'll never stop enjoying travel and exploring new places. The world is too big and too beautiful to stay in one place forever."
  ],
  "fun_8": [
    "I have to check if I locked the door at least three times before I leave. It's irrational, but it gives me peace of mind, so I do it anyway.",
    "I organize my Spotify playlists obsessively. I have playlists for every mood, occasion, and time of day. It's probably excessive, but it makes me happy.",
    "I read the last page of a book before I start reading it. I know it's controversial, but I like knowing how things end so I can enjoy the journey.",
    "I have to have my bed made before I can start my day. It's a small thing, but it sets the tone for the rest of my day and I can't function without it."
  ],
  "city_1": [
    "Carter Road in Bandra—the perfect spot for sunset walks and people watching. There's something about that place that just feels right.",
    "The rooftop at Social in Lower Parel. Great vibes, good music, and the city views are incredible. It's my go-to for a night out.",
    "Leopold Cafe in Colaba. It's a classic, and there's history in those walls. Plus, the food is consistently good and the energy is always great.",
    "Juhu Beach in the evening. It's chaotic and beautiful at the same time. The street food, the people, the sunset—it's pure Mumbai energy."
  ],
  "city_2": [
    "A late-night drive to Marine Drive, windows down, music up. There's something therapeutic about driving along the sea at night with good company.",
    "Street food at Mohammed Ali Road after midnight. The best food comes out when the sun goes down, and that area comes alive at night.",
    "A rooftop party in Bandra or Andheri. Mumbai's rooftop scene is unmatched, and there's always something happening if you know where to look.",
    "Late-night chai at a local tapri, followed by a walk through the quieter parts of the city. Simple, but it's the best way to end a night."
  ],
  "city_3": [
    "Bandra West is my comfort neighborhood. It's got everything—good food, great vibes, and it feels like home even though I'm not from here originally.",
    "Lower Parel, especially around the mill area. It's where I spend most of my time, and I know all the best spots. It's my little corner of the city.",
    "Powai, where I live. It's quieter than other parts, but it's got its own charm. I love the lake area and the sense of community here.",
    "Colaba and Fort—the old part of the city. There's history and character in those streets, and I feel most connected to Mumbai when I'm there."
  ],
  "city_4": [
    "I love the energy and the opportunities. Mumbai never sleeps, and there's always something happening. But I hate the traffic and the cost of living.",
    "I love the food scene and the diversity. You can find anything here, from street food to fine dining. But the crowds can be overwhelming sometimes.",
    "I love how ambitious and driven everyone is. It's inspiring to be around people who are chasing their dreams. But the pace can be exhausting.",
    "I love the sense of possibility. In Mumbai, you can be anyone and do anything. But I miss the quiet and the space that smaller cities offer."
  ],
  "city_5": [
    "Start with the street food—vada pav, bhel puri, pav bhaji. Then explore the different neighborhoods, each with its own vibe. And don't forget the beaches.",
    "Get lost in Colaba and Fort. Walk around, explore the old buildings, and just soak in the history. Then find a good rooftop for sunset views.",
    "Try the local trains during off-peak hours to see the city from a different perspective. And definitely check out the art galleries and cultural spots.",
    "Find a good local guide or friend who knows the city. Mumbai is best experienced with someone who can show you the hidden gems and local favorites."
  ]
};

const interests = [
  "Techno", "Hip Hop", "Jazz", "House", "Live Concerts", "Speakeasy",
  "Fine Dining", "Mixology", "Wine Tasting", "Wellness", "Travel", "Art Galleries",
  "Gaming", "Fitness", "Fashion", "Tech", "Photography", "Reading", "Food", "Dance"
];

const vibeAnswerOptions: Record<string, string[]> = {
  social_energy: ["observe", "known_people", "warm_up", "few_new", "everyone", "center"],
  party_style: ["coffee", "deep_talks", "movie", "house_party", "clubbing", "chaos"],
  spontaneity: ["two_days", "planning", "flexible", "down_if_free", "spontaneous", "right_now"],
  conversation: ["growth", "relationships", "memes", "music_movies", "random", "philosophy"],
  alcohol: ["none", "rarely", "socially", "weekends", "often", "lit"],
  energy_level: ["calm", "soft", "balanced", "energetic", "hyper", "chaos"],
  group_size: ["one_two", "three_four", "five_seven", "eight_ten", "ten_plus", "any"],
  intent: ["friends", "hangouts", "party_buddies", "networking", "dating", "anything"]
};

const makeVibeAnswers = () => {
  const answers: Record<string, string> = {};
  Object.keys(vibeAnswerOptions).forEach((key) => {
    answers[key] = rand(vibeAnswerOptions[key]);
  });
  return answers;
};

// Generate unique, realistic first-person prompt answer (120-200 chars)
const getPromptAnswer = (promptId: string, userIndex: number): string => {
  const answers = promptAnswers[promptId];
  if (answers && answers.length > 0) {
    // Use userIndex to ensure variety across users
    return answers[userIndex % answers.length];
  }
  // Fallback (should never happen with comprehensive answers above)
  return "I'm still figuring this out, but I'd love to talk about it in person.";
};

// Create a realistic user profile
const makeUserProfile = (index: number) => {
  const gender = index % 2 === 0 ? "female" : "male";
  const firstName = rand(firstNames[gender as keyof typeof firstNames]);
  const lastName = rand(lastNames);
  const name = `${firstName} ${lastName}`;
  const city = rand(cities);
  const birthYear = 1995 + (index % 10); // Ages 25-34
  const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const birthdate = `${birthYear}-${birthMonth}-${birthDay}`;
  
  // Select 1-3 photos (ensure variety by using index)
  const photoCount = Math.floor(Math.random() * 3) + 1; // 1-3 photos
  const photoPool = profilePhotos[gender as keyof typeof profilePhotos];
  const startIdx = (index * 3) % photoPool.length;
  const photos = [];
  for (let i = 0; i < photoCount; i++) {
    photos.push(photoPool[(startIdx + i) % photoPool.length]);
  }
  const primaryPhoto = photos[0];
  
  // Select 4-6 badges
  const badgeCount = Math.floor(Math.random() * 3) + 4; // 4-6 badges
  const selectedBadges = sample(allBadges, badgeCount);
  
  // Select 2-3 prompts with unique, realistic answers
  const promptCount = Math.floor(Math.random() * 2) + 2; // 2-3 prompts
  const selectedPrompts = sample(allPrompts, promptCount).map((prompt, idx) => ({
    id: prompt.id,
    category: prompt.category,
    question: prompt.question,
    answer: getPromptAnswer(prompt.id, index + idx) // Ensure variety per user
  }));
  
  // Select 3-6 interests
  const interestCount = Math.floor(Math.random() * 4) + 3; // 3-6 interests
  const selectedInterests = sample(interests, interestCount);
  
  // Some users have height (optional field)
  const hasHeight = index % 3 === 0; // 33% have height
  const height = hasHeight ? (gender === "male" ? 170 + Math.floor(Math.random() * 15) : 155 + Math.floor(Math.random() * 15)) : undefined;

  return {
    user_id: `seed_user_${index}`,
    email: `seed${index}@partizo.dev`,
    name,
    birthdate,
    gender: gender as "male" | "female",
    city,
    country: "India",
    bio: rand(bios),
    profile_photo_url: primaryPhoto,
    profilePhotoUrls: photos,
    primaryPhotoUrl: primaryPhoto,
    connectionsCount: Math.floor(Math.random() * 50),
    interests: selectedInterests,
    vibe_answers: makeVibeAnswers(),
    quick_badges: selectedBadges,
    prompts: selectedPrompts,
    created_at: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
    onboarding_complete: true,
    isHost: index % 4 === 0, // 25% are hosts (12-13 hosts out of 50)
    ...(height && { height: `${height} cm` })
  };
};

// Delete all documents from a collection
const deleteCollection = async (collectionPath: string) => {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would delete ${snapshot.size} documents from ${collectionPath}`);
    return;
  }
  
  if (snapshot.size === 0) {
    console.log(`  ℹ️  No documents in ${collectionPath}`);
    return;
  }
  
  const batchSize = 500;
  let deleted = 0;
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    deleted += chunk.length;
    
    if (deleted % 100 === 0 || deleted === snapshot.size) {
      console.log(`  Deleted ${deleted}/${snapshot.size} from ${collectionPath}...`);
    }
  }
  
  console.log(`  ✅ Deleted ${snapshot.size} documents from ${collectionPath}`);
};

// Delete all subcollections recursively
const deleteSubcollections = async (parentPath: string, subcollectionName: string) => {
  const parentRef = db.collection(parentPath);
  const parentSnapshot = await parentRef.get();
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would check ${parentSnapshot.size} parent documents for ${subcollectionName} subcollections`);
    return;
  }
  
  if (parentSnapshot.size === 0) {
    console.log(`  ℹ️  No parent documents in ${parentPath} to check for ${subcollectionName}`);
    return;
  }
  
  let totalDeleted = 0;
  const batchSize = 500;
  
  for (const parentDoc of parentSnapshot.docs) {
    const subcollectionRef = parentDoc.ref.collection(subcollectionName);
    const subSnapshot = await subcollectionRef.get();
    
    if (subSnapshot.size > 0) {
      // Delete in batches
      for (let i = 0; i < subSnapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = subSnapshot.docs.slice(i, i + batchSize);
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += chunk.length;
      }
    }
  }
  
  if (totalDeleted > 0) {
    console.log(`  ✅ Deleted ${totalDeleted} documents from ${parentPath}/*/${subcollectionName}`);
  } else {
    console.log(`  ℹ️  No documents found in ${parentPath}/*/${subcollectionName}`);
  }
};

// Delete storage objects (if any profile photos are in Firebase Storage)
const deleteStorageObjects = async () => {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would check Firebase Storage for profile photos`);
    return;
  }
  
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: "profile-photos/" });
    
    if (files.length > 0) {
      console.log(`  Found ${files.length} files in storage, deleting...`);
      await Promise.all(files.map((file) => file.delete()));
      console.log(`  ✅ Deleted ${files.length} files from storage`);
    } else {
      console.log(`  ℹ️  No files found in storage (using external URLs)`);
    }
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`  ℹ️  Storage bucket not found or not configured`);
    } else {
      console.error(`  ⚠️  Error checking storage:`, error.message);
    }
  }
};

// Main execution
async function main() {
  console.log("\n🚀 Starting User Data Reset & Seed");
  console.log("=" .repeat(50));
  
  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No actual changes will be made\n");
  }
  
  // Step 1: Delete all user data
  console.log("\n📋 Step 1: Deleting existing user data...");
  
  const collectionsToDelete = [
    "users",
    "outings",
    "outingRequests",
    "connections",
    "connectionRequests",
    "skips",
    "directChats"
  ];
  
  for (const collection of collectionsToDelete) {
    await deleteCollection(collection);
  }
  
  // Delete subcollections
  console.log("\n📋 Deleting subcollections...");
  await deleteSubcollections("users", "notifications");
  await deleteSubcollections("users", "hostedOutings");
  await deleteSubcollections("users", "activeOutings");
  await deleteSubcollections("outings", "members");
  await deleteSubcollections("outings", "messages");
  await deleteSubcollections("directChats", "messages");
  
  // Delete storage objects
  console.log("\n📋 Checking Firebase Storage...");
  await deleteStorageObjects();
  
  if (DRY_RUN) {
    console.log("\n✅ DRY RUN complete. Use without --dry-run to execute.");
    process.exit(0);
  }
  
  // Step 2: Seed new users
  console.log("\n📋 Step 2: Seeding new users...");
  
  const USER_COUNT = 50; // 50 fully completed users
  const users: Array<{ uid: string; profile: any }> = [];
  
  for (let i = 0; i < USER_COUNT; i++) {
    const profile = makeUserProfile(i);
    users.push({ uid: profile.user_id, profile });
  }
  
  // Batch write users
  const batchSize = 500;
  let written = 0;
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = db.batch();
    const chunk = users.slice(i, i + batchSize);
    
    chunk.forEach(({ uid, profile }) => {
      const ref = db.collection("users").doc(uid);
      batch.set(ref, {
        ...profile,
        created_at: Timestamp.fromMillis(profile.created_at)
      });
    });
    
    await batch.commit();
    written += chunk.length;
    console.log(`  ✅ Written ${written}/${users.length} users...`);
  }
  
  // Step 3: Generate outings for hosts
  console.log("\n📋 Step 3: Generating outings for hosts...");
  
  const hosts = users.filter(({ profile }) => profile.isHost);
  const outingTypes: string[] = [
    "house_party", "rooftop_mixer", "club_pre_game", "beach_vibes", "board_games",
    "karaoke", "coffee_social", "movie_night", "deep_talks", "sunset_soiree"
  ];
  const vibeModes = ["CHAOS", "CALM", "HIGH_ENERGY", "CHILL"];
  const vibeTagIds: string[] = [
    "high_energy", "chill", "calm", "chaos", "byob", "light_drinks",
    "bollywood", "hiphop", "techno", "house", "safe_space", "new_people_welcome",
    "casual", "late_night", "rooftop", "cozy"
  ];
  const areas = [
    "Bandra West", "Andheri West", "Juhu", "Lower Parel", "Powai", "Versova", "Worli", "South Mumbai"
  ];
  const durations = [90, 120, 180, 240];
  const maxGuestsOptions = [8, 10, 12, 15];
  
  const outings: Array<{ id: string; data: any; hostId: string }> = [];
  
  for (const { uid, profile } of hosts) {
    // Each host creates 1-2 outings
    const outingCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < outingCount; i++) {
      const typeId = rand(outingTypes);
      const vibeMode = rand(vibeModes);
      const energy = vibeMode === "CHAOS" ? 80 + Math.floor(Math.random() * 20) :
                     vibeMode === "HIGH_ENERGY" ? 60 + Math.floor(Math.random() * 20) :
                     vibeMode === "CHILL" ? 20 + Math.floor(Math.random() * 20) :
                     30 + Math.floor(Math.random() * 20);
      
      const selectedTags = sample(vibeTagIds, Math.floor(Math.random() * 3) + 2); // 2-4 tags
      const area = rand(areas);
      const durationMins = rand(durations);
      const maxGuests = rand(maxGuestsOptions);
      
      // Create date 1-30 days in the future
      const daysFromNow = Math.floor(Math.random() * 30) + 1;
      const dateTime = new Date();
      dateTime.setDate(dateTime.getDate() + daysFromNow);
      dateTime.setHours(18 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 4) * 15, 0, 0);
      
      const title = `${typeId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} in ${area}`;
      const description = `Join us for an amazing ${typeId.replace(/_/g, " ")} in ${area}. Great vibes, good people, and unforgettable memories.`;
      const rules = sample([
        "Respect everyone's boundaries",
        "No drama, just good vibes",
        "BYOB welcome",
        "Be yourself and have fun",
        "Keep it positive"
      ], Math.floor(Math.random() * 2) + 2);
      
      const outingId = `outing_${uid}_${i}`;
      const coverImageUrl = rand(outingCoverImages);
      
      // Calculate reveal time (2 hours before event)
      const revealAt = new Date(dateTime);
      revealAt.setHours(revealAt.getHours() - 2);
      
      // Chat expires 24 hours after event
      const chatExpiresAt = new Date(dateTime);
      chatExpiresAt.setHours(chatExpiresAt.getHours() + 24);
      
      const outingData = {
        hostId: uid,
        hostName: profile.name,
        hostPhotoUrl: profile.profile_photo_url,
        city: profile.city,
        title,
        typeId,
        type: typeId.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        vibeTagIds: selectedTags,
        vibeTags: selectedTags,
        vibeMode,
        energy,
        area,
        location: {
          name: `${area}, ${profile.city}`,
          address: `${area}, ${profile.city}, India`,
          lat: 19.0760 + (Math.random() - 0.5) * 0.1,
          lng: 72.8777 + (Math.random() - 0.5) * 0.1,
          placeId: `place_${uid}_${i}`
        },
        dateTime: Timestamp.fromDate(dateTime),
        durationMins,
        maxGuests,
        approvedCount: 0,
        pendingCount: 0,
        status: "active",
        visibility: "public",
        eventMode: Math.random() > 0.5 ? "curated" : "fast",
        locationRevealMode: "timelock",
        revealAt: Timestamp.fromDate(revealAt),
        coverImageUrl,
        rules,
        description,
        searchTokens: [title.toLowerCase(), area.toLowerCase(), typeId, ...selectedTags],
        chatExpiresAt: Timestamp.fromDate(chatExpiresAt),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      outings.push({ id: outingId, data: outingData, hostId: uid });
    }
  }
  
  // Write outings
  if (outings.length > 0) {
    let writtenOutings = 0;
    for (let i = 0; i < outings.length; i += batchSize) {
      const batch = db.batch();
      const chunk = outings.slice(i, i + batchSize);
      
      chunk.forEach(({ id, data, hostId }) => {
        const outingRef = db.collection("outings").doc(id);
        batch.set(outingRef, data);
        
        // Create member entry for host
        batch.set(outingRef.collection("members").doc(hostId), {
          role: "host",
          joinedAt: Timestamp.now()
        });
        
        // Create hostedOutings index entry
        batch.set(db.collection("users").doc(hostId).collection("hostedOutings").doc(id), {
          outingId: id,
          title: data.title,
          dateTime: data.dateTime,
          role: "host",
          coverImageUrl: data.coverImageUrl,
          status: "active"
        });
      });
      
      await batch.commit();
      writtenOutings += chunk.length;
      console.log(`  ✅ Written ${writtenOutings}/${outings.length} outings...`);
    }
    console.log(`  ✅ Created ${outings.length} outings for ${hosts.length} hosts`);
  }
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed Complete!");
  console.log("=".repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   • Users created: ${users.length}`);
  console.log(`   • Hosts: ${hosts.length}`);
  console.log(`   • Outings created: ${outings.length}`);
  console.log(`   • Project: ${PROJECT_ID}`);
  console.log(`\n👥 Seeded Users:`);
  users.slice(0, 10).forEach(({ profile }) => {
    console.log(`   • ${profile.name} (${profile.city}) - ${profile.email}`);
  });
  if (users.length > 10) {
    console.log(`   ... and ${users.length - 10} more`);
  }
  console.log("\n");
  
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});

