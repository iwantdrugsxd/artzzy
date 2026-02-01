import admin from "firebase-admin";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const getArg = (key: string, fallback?: string) => {
  const index = args.indexOf(`--${key}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
};
const toNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const BULK = hasFlag("--bulk");
const SEED_CITY = getArg("city", "Mumbai") as string;
const USERS_COUNT = toNumber(getArg("users"), BULK ? 150 : 10);
const OUTINGS_COUNT = toNumber(getArg("outings"), BULK ? 90 : 12);
const REQUESTS_COUNT = toNumber(getArg("requests"), BULK ? 240 : 30);
const NOTIFS_COUNT = toNumber(getArg("notifications"), BULK ? 200 : 20);
const TARGET_UID = getArg("forUid", "") as string;
const HOST_EMAIL = getArg("hostEmail", "") as string;
const GUEST_EMAIL = getArg("guestEmail", "") as string;

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "..", "serviceAccountKey.json");

if (!existsSync(serviceAccountPath)) {
  console.error("Service account JSON not found:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const sample = <T>(arr: T[], count: number) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const names = [
  "Aarya",
  "Meera",
  "Ishaan",
  "Kabir",
  "Aanya",
  "Riya",
  "Diya",
  "Zara",
  "Karan",
  "Vihaan",
  "Arjun",
  "Neha",
  "Aditi",
  "Rohan",
  "Sana",
  "Pranav",
  "Maya",
  "Nikhil",
  "Tara",
  "Aman",
];

const cities = [SEED_CITY, "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai"];

const interests = [
  "Techno",
  "House",
  "Deep Talks",
  "Photography",
  "Rooftops",
  "Coffee",
  "Karaoke",
  "Board Games",
  "Food Crawl",
  "Night Markets",
  "Movies",
  "Beach",
  "Live Music",
  "Street Food",
  "Brunch",
  "Art Walks",
];

const coverImages = [
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
  "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee?w=1200&q=80",
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
];

const profileImages = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80",
  "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=400&q=80",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80",
];

const typeIds = [
  "house_party",
  "rooftop_mixer",
  "club_pre_game",
  "after_party",
  "beach_vibes",
  "karaoke",
  "board_games",
  "coffee_social",
  "live_music",
  "deep_talks",
];

const vibeTagIds = [
  "high_energy",
  "chill",
  "calm",
  "chaos",
  "introvert_friendly",
  "extrovert_heavy",
  "deep_convos",
  "rooftop",
  "late_night",
  "aesthetic",
];

const areas = [
  "Bandra West",
  "Andheri West",
  "Juhu",
  "Lower Parel",
  "Powai",
  "Versova",
  "Worli",
  "South Mumbai",
];

const vibeAnswerOptions: Record<string, string[]> = {
  social_energy: ["low_key", "balanced", "energetic"],
  party_style: ["house_party", "clubbing", "lounge"],
  spontaneity: ["planner", "spontaneous"],
  conversation: ["light", "philosophy", "relationships"],
  alcohol: ["byob", "light_drinks", "no_alcohol"],
  energy_level: ["calm", "chill", "energetic", "chaos"],
  group_size: ["small", "medium", "big"],
  intent: ["friends", "network", "dating"],
};

const makeVibeAnswers = () => {
  const answers: Record<string, string> = {};
  Object.keys(vibeAnswerOptions).forEach((key) => {
    answers[key] = rand(vibeAnswerOptions[key]);
  });
  return answers;
};

const makeProfile = (uid: string, index: number, forceCity?: string | null) => {
  const name = `${rand(names)} ${String.fromCharCode(65 + (index % 26))}`;
  const city = forceCity || rand(cities);
  const photo = rand(profileImages);
  const photos = sample(profileImages, 2);
  const birthYear = 1996 + (index % 7);
  return {
    user_id: uid,
    email: `seed${index}@partizo.dev`,
    name,
    birthdate: `${birthYear}-0${(index % 9) + 1}-15`,
    gender: index % 2 === 0 ? "female" : "male",
    city,
    country: "India",
    bio: "Curating neon-lit nights and good conversations.",
    profile_photo_url: photo,
    profilePhotoUrls: photos,
    primaryPhotoUrl: photos[0],
    connectionsCount: Math.floor(Math.random() * 40),
    interests: sample(interests, 4),
    vibe_answers: makeVibeAnswers(),
    created_at: Date.now(),
    onboarding_complete: true,
    isHost: index % 3 === 0,
  };
};

const makeOuting = (hostProfile: any) => {
  const energy = 30 + Math.floor(Math.random() * 60);
  const mode =
    energy <= 30
      ? "CALM"
      : energy <= 60
        ? "CHILL"
        : energy <= 85
          ? "HIGH_ENERGY"
          : "CHAOS";
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 20) + 1);
  date.setHours(18 + Math.floor(Math.random() * 6), 0, 0, 0);

  return {
    hostId: hostProfile.user_id,
    hostName: hostProfile.name,
    hostPhotoUrl: hostProfile.profile_photo_url,
    city: hostProfile.city,
    title: `${rand([
      "Rooftop Vibes",
      "Midnight Mix",
      "Neon Social",
      "Deep Talks & Wine",
      "House Party",
      "Sunset Chill",
    ])} ${Math.floor(Math.random() * 90 + 10)}`,
    typeId: rand(typeIds),
    vibeTagIds: sample(vibeTagIds, 3),
    vibeMode: mode,
    energy,
    area: rand(areas),
    dateTime: Timestamp.fromDate(date),
    durationMins: rand([90, 120, 180, 240]),
    maxGuests: rand([8, 10, 12, 15, 18]),
    approvedCount: 0,
    pendingCount: 0,
    status: "active",
    eventMode: Math.random() > 0.5 ? "curated" : "fast",
    coverImageUrl: rand(coverImages),
    rules: sample(
      ["Be respectful", "Bring good energy", "No heavy drinking", "Respect the host"],
      2
    ),
    description: "A premium outing for high-signal connections.",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    location: {
      name: rand(areas),
      address: `${rand(areas)}, ${hostProfile.city}`,
      lat: 19.07 + Math.random() * 0.1,
      lng: 72.86 + Math.random() * 0.1,
      placeId: `seed_place_${Math.floor(Math.random() * 10000)}`,
    },
  };
};

const makeNotification = (type: string, payload: Record<string, any>) => ({
  type,
  read: false,
  createdAt: Timestamp.now(),
  ...payload,
});

const batchWrite = async (ops: Array<(batch: admin.firestore.WriteBatch) => void>) => {
  const batchSize = 400;
  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = db.batch();
    ops.slice(i, i + batchSize).forEach((op) => op(batch));
    await batch.commit();
  }
};

async function main() {
  console.log("Seeding Partizo Firestore data…");

  const users: Array<{ uid: string; profile: any }> = [];
  const hosts: any[] = [];

  for (let i = 0; i < USERS_COUNT; i += 1) {
    const uid = TARGET_UID && i === 0 ? TARGET_UID : `seed_user_${i}`;
    const profile = makeProfile(uid, i, i < 10 ? SEED_CITY : null);
    users.push({ uid, profile });
    if (profile.isHost) hosts.push(profile);
  }

  if (hosts.length === 0) hosts.push(users[0].profile);

  const resolveAccount = async (email: string) => {
    if (!email) return null;
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error) {
      console.error("Could not find auth user for", email);
      throw error;
    }
  };

  const hostAccount = await resolveAccount(HOST_EMAIL);
  const guestAccount = await resolveAccount(GUEST_EMAIL);

  const upsertUser = (uid: string, profile: any) => {
    const idx = users.findIndex((u) => u.uid === uid);
    if (idx >= 0) {
      users[idx] = { uid, profile };
    } else {
      users.push({ uid, profile });
    }
  };

  let hostProfile: any | null = null;
  let guestProfile: any | null = null;

  if (hostAccount) {
    const existing = await db.collection("users").doc(hostAccount.uid).get();
    const base = makeProfile(hostAccount.uid, 999, SEED_CITY);
    hostProfile = {
      ...base,
      ...(existing.exists ? existing.data() : {}),
      user_id: hostAccount.uid,
      email: hostAccount.email,
      name: existing.data()?.name || "Ramu",
      isHost: true,
      onboarding_complete: true,
      city: existing.data()?.city || SEED_CITY,
    };
    upsertUser(hostAccount.uid, hostProfile);
    hosts.push(hostProfile);
  }

  if (guestAccount) {
    const existing = await db.collection("users").doc(guestAccount.uid).get();
    const base = makeProfile(guestAccount.uid, 998, SEED_CITY);
    guestProfile = {
      ...base,
      ...(existing.exists ? existing.data() : {}),
      user_id: guestAccount.uid,
      email: guestAccount.email,
      name: existing.data()?.name || "V Nair",
      isHost: false,
      onboarding_complete: true,
      city: existing.data()?.city || SEED_CITY,
    };
    upsertUser(guestAccount.uid, guestProfile);
  }

  const outings: Array<{ id: string; data: any }> = [];
  for (let i = 0; i < OUTINGS_COUNT; i += 1) {
    const host = rand(hosts);
    outings.push({ id: `seed_outing_${i}`, data: makeOuting(host) });
  }

  if (TARGET_UID) {
    const targetDoc = await db.collection("users").doc(TARGET_UID).get();
    const targetProfile = targetDoc.exists
      ? targetDoc.data()
      : makeProfile(TARGET_UID, 997, SEED_CITY);

    const hostOuting = makeOuting({
      user_id: TARGET_UID,
      name: targetProfile?.name || "Host",
      profile_photo_url: targetProfile?.profile_photo_url || rand(profileImages),
      city: targetProfile?.city || SEED_CITY,
    });

    outings.unshift({ id: `seed_outing_host_${TARGET_UID}`, data: hostOuting });

    if (!targetDoc.exists) {
      upsertUser(TARGET_UID, targetProfile);
      hosts.push(targetProfile);
    }
  }

  const createHostOuting = (profile: any, suffix: string, mode: "curated" | "fast") => {
    const outing = makeOuting(profile);
    outing.eventMode = mode;
    outing.title = mode === "curated" ? "Curated Rooftop Night" : "Fast Join Mixer";
    return { id: `seed_outing_host_${suffix}`, data: outing };
  };

  if (hostProfile) {
    outings.unshift(createHostOuting(hostProfile, "primary", "curated"));
    outings.unshift(createHostOuting(hostProfile, "fast", "fast"));
  }

  const requests: Array<{ id: string; data: any }> = [];
  const outingCounts = new Map<string, { pending: number; approved: number }>();

  const trackCounts = (outingId: string, status: string) => {
    const counts = outingCounts.get(outingId) || { pending: 0, approved: 0 };
    if (status === "pending") counts.pending += 1;
    if (status === "approved") counts.approved += 1;
    outingCounts.set(outingId, counts);
  };

  const addRequest = (outing: { id: string; data: any }, user: { uid: string; profile: any }, status: string) => {
    const requestId = `${outing.id}_${user.uid}`;
    requests.push({
      id: requestId,
      data: {
        outingId: outing.id,
        userId: user.uid,
        hostId: outing.data.hostId,
        status,
        source: "curated_request",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userName: user.profile.name,
        userPhotoUrl: user.profile.profile_photo_url,
        userCity: user.profile.city,
        vibeMatch: Math.floor(Math.random() * 40 + 60),
      },
    });
    trackCounts(outing.id, status);
  };

  for (let i = 0; i < REQUESTS_COUNT; i += 1) {
    const outing = rand(outings);
    const user = rand(users);
    if (user.uid === outing.data.hostId) continue;
    const status = rand(["pending", "approved", "declined"]);
    addRequest(outing, user, status);
  }

  const notifications: Array<{ uid: string; data: any }> = [];
  for (let i = 0; i < NOTIFS_COUNT; i += 1) {
    const user = rand(users);
    notifications.push({
      uid: user.uid,
      data: makeNotification("system", {
        title: "Welcome to Partizo",
        body: "Your vibe feed is warming up.",
      }),
    });
  }

  if (hostProfile) {
    const hostOuting = outings.find((o) => o.data.hostId === hostProfile?.user_id);
    if (hostOuting) {
      sample(users.filter((u) => u.uid !== hostProfile?.user_id), 10).forEach((u, idx) => {
        addRequest(hostOuting, u, "pending");
        if (idx < 4) {
          notifications.push({
            uid: hostProfile.user_id,
            data: makeNotification("join_request", {
              title: "New join request",
              body: `${u.profile.name} wants to join "${hostOuting.data.title}"`,
              outingId: hostOuting.id,
              requesterId: u.uid,
            }),
          });
        }
      });
    }
  }

  if (guestProfile) {
    const approvedOuting = rand(outings.filter((o) => o.data.hostId !== guestProfile?.user_id));
    if (approvedOuting) {
      addRequest(approvedOuting, { uid: guestProfile.user_id, profile: guestProfile }, "approved");
      notifications.push({
        uid: guestProfile.user_id,
        data: makeNotification("request_approved", {
          title: "You're in 🎉",
          body: `You've been approved for "${approvedOuting.data.title}"`,
          outingId: approvedOuting.id,
        }),
      });
    }
  }

  outings.forEach((outing) => {
    const counts = outingCounts.get(outing.id) || { pending: 0, approved: 0 };
    outing.data.pendingCount = counts.pending;
    outing.data.approvedCount = counts.approved;
  });

  const ops: Array<(batch: admin.firestore.WriteBatch) => void> = [];

  users.forEach((user) => {
    ops.push((batch) => {
      batch.set(db.collection("users").doc(user.uid), user.profile, { merge: true });
    });
  });

  outings.forEach((outing) => {
    ops.push((batch) => {
      batch.set(db.collection("outings").doc(outing.id), outing.data, { merge: true });
    });
  });

  // Host memberships + activeOutings index
  outings.forEach((outing) => {
    ops.push((batch) => {
      batch.set(
        db.collection("outings").doc(outing.id).collection("members").doc(outing.data.hostId),
        { role: "host", joinedAt: Timestamp.now() },
        { merge: true }
      );
    });
    ops.push((batch) => {
      batch.set(
        db.collection("users").doc(outing.data.hostId).collection("activeOutings").doc(outing.id),
        {
          outingId: outing.id,
          title: outing.data.title,
          dateTime: outing.data.dateTime,
          role: "host",
          coverImageUrl: outing.data.coverImageUrl,
          status: "active",
        },
        { merge: true }
      );
    });
  });

  requests.forEach((req) => {
    ops.push((batch) => {
      batch.set(db.collection("outingRequests").doc(req.id), req.data, { merge: true });
    });
    if (req.data.status === "approved") {
      ops.push((batch) => {
        batch.set(
          db.collection("outings").doc(req.data.outingId).collection("members").doc(req.data.userId),
          { role: "member", joinedAt: Timestamp.now() },
          { merge: true }
        );
      });
      ops.push((batch) => {
        batch.set(
          db.collection("users").doc(req.data.userId).collection("activeOutings").doc(req.data.outingId),
          {
            outingId: req.data.outingId,
            title: outings.find((o) => o.id === req.data.outingId)?.data.title || "Outing",
            coverImageUrl:
              outings.find((o) => o.id === req.data.outingId)?.data.coverImageUrl || null,
            dateTime: outings.find((o) => o.id === req.data.outingId)?.data.dateTime || null,
            role: "member",
          },
          { merge: true }
        );
      });
    }
  });

  notifications.forEach((notif) => {
    ops.push((batch) => {
      const ref = db.collection("users").doc(notif.uid).collection("notifications").doc();
      batch.set(ref, notif.data);
    });
  });

  await batchWrite(ops);

  console.log("Seed complete:", {
    users: users.length,
    outings: outings.length,
    requests: requests.length,
    notifications: notifications.length,
    city: SEED_CITY,
    hostEmail: HOST_EMAIL || "none",
    guestEmail: GUEST_EMAIL || "none",
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
