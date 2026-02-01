import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseApp";
import { logger } from "../utils/logger";
import { storage } from "../utils/storage";
import { Profile, ProfileDraft, Gender } from "../types/profile";

type User = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  draft: ProfileDraft;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  updateDraft: (patch: Partial<ProfileDraft>) => void;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_DRAFT = "partizo.profile.draft";

const emptyDraft: ProfileDraft = {
  name: "",
  birthdate: "",
  gender: "prefer_not_to_say",
  city: "",
  country: "",
  bio: "",
  profile_photo_url: "",
  profilePhotoUrls: [],
  primaryPhotoUrl: "",
  connectionsCount: 0,
  interests: [],
  vibe_answers: {},
  quick_badges: [],
  prompts: [],
  created_at: 0,
  onboarding_complete: false,
  isHost: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedDraft = await storage.get<ProfileDraft>(STORAGE_DRAFT);
      if (storedDraft) {
        setDraft(storedDraft);
      }
    };
    bootstrap();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const userRecord = { id: firebaseUser.uid, email: firebaseUser.email ?? "" };
      setUser(userRecord);
      try {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Profile;
          // Normalize multi-photo fields from legacy data
          const photos =
            (data.profilePhotoUrls && data.profilePhotoUrls.length > 0
              ? data.profilePhotoUrls
              : data.profile_photo_url
              ? [data.profile_photo_url]
              : []) ?? [];
          const primary = data.primaryPhotoUrl || photos[0] || data.profile_photo_url || "";

          const normalized: Profile = {
            ...data,
            profilePhotoUrls: photos,
            primaryPhotoUrl: primary,
            profile_photo_url: primary,
            connectionsCount: data.connectionsCount ?? 0,
            quick_badges: data.quick_badges ?? [],
            prompts: data.prompts ?? [],
          };

          setProfile(normalized);
          setDraft({
            name: normalized.name,
            birthdate: normalized.birthdate,
            gender: normalized.gender,
            city: normalized.city,
            country: normalized.country,
            bio: normalized.bio,
            profile_photo_url: normalized.profile_photo_url,
            profilePhotoUrls: normalized.profilePhotoUrls,
            primaryPhotoUrl: normalized.primaryPhotoUrl,
            connectionsCount: normalized.connectionsCount,
            interests: normalized.interests,
            vibe_answers: normalized.vibe_answers,
            quick_badges: normalized.quick_badges,
            prompts: normalized.prompts,
            created_at: normalized.created_at,
            onboarding_complete: normalized.onboarding_complete,
            isHost: normalized.isHost,
          });
        }
      } catch (error) {
        logger.error("auth.profile.load.failed", { error });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInEmail = async (email: string, _password: string) => {
    logger.info("auth.signInEmail", { email });
    await signInWithEmailAndPassword(auth, email, _password);
  };

  const signUpEmail = async (email: string, _password: string) => {
    logger.info("auth.signUpEmail", { email });
    await createUserWithEmailAndPassword(auth, email, _password);
  };

  const signOut = async () => {
    logger.info("auth.signOut");
    await firebaseSignOut(auth);
    setDraft(emptyDraft);
  };

  const signInWithGoogleIdToken = async (idToken: string) => {
    logger.info("auth.signInGoogle");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  };

  const updateDraft = (patch: Partial<ProfileDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      storage.set(STORAGE_DRAFT, next);
      return next;
    });
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Profile;
        // Normalize multi-photo fields from legacy data
        const photos =
          (data.profilePhotoUrls && data.profilePhotoUrls.length > 0
            ? data.profilePhotoUrls
            : data.profile_photo_url
            ? [data.profile_photo_url]
            : []) ?? [];
        const primary = data.primaryPhotoUrl || photos[0] || data.profile_photo_url || "";

        const normalized: Profile = {
          ...data,
          profilePhotoUrls: photos,
          primaryPhotoUrl: primary,
          profile_photo_url: primary,
          connectionsCount: data.connectionsCount ?? 0,
          quick_badges: data.quick_badges ?? [],
          prompts: data.prompts ?? [],
        };

        setProfile(normalized);
        setDraft({
          name: normalized.name,
          birthdate: normalized.birthdate,
          gender: normalized.gender,
          city: normalized.city,
          country: normalized.country,
          bio: normalized.bio,
          profile_photo_url: normalized.profile_photo_url,
          profilePhotoUrls: normalized.profilePhotoUrls,
          primaryPhotoUrl: normalized.primaryPhotoUrl,
          connectionsCount: normalized.connectionsCount,
          interests: normalized.interests,
          vibe_answers: normalized.vibe_answers,
          quick_badges: normalized.quick_badges,
          prompts: normalized.prompts,
          created_at: normalized.created_at,
          onboarding_complete: normalized.onboarding_complete,
          isHost: normalized.isHost,
        });
      }
    } catch (error) {
      logger.error("auth.profile.refresh.failed", { error });
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    const photos =
      draft.profilePhotoUrls && draft.profilePhotoUrls.length > 0
        ? draft.profilePhotoUrls
        : draft.profile_photo_url
        ? [draft.profile_photo_url]
        : [];
    const primary = draft.primaryPhotoUrl || photos[0] || draft.profile_photo_url || "";

    const profileRecord: Profile = {
      user_id: user.id,
      email: user.email,
      name: draft.name,
      birthdate: draft.birthdate,
      gender: draft.gender as Gender,
      city: draft.city,
      country: draft.country,
      bio: draft.bio,
      profile_photo_url: primary,
      profilePhotoUrls: photos,
      primaryPhotoUrl: primary,
      connectionsCount: 0,
      interests: draft.interests,
      vibe_answers: draft.vibe_answers,
      quick_badges: draft.quick_badges ?? [],
      prompts: draft.prompts ?? [],
      created_at: Date.now(),
      onboarding_complete: true,
      isHost: profile?.isHost ?? false,
    };
    setProfile(profileRecord);
    await setDoc(doc(db, "users", user.id), {
      ...profileRecord,
      created_at: serverTimestamp(),
    });
    await storage.remove(STORAGE_DRAFT);
    // Refresh profile from Firestore to ensure consistency
    await refreshProfile();
    logger.info("onboarding.completed");
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      draft,
      loading,
      signInEmail,
      signUpEmail,
      signOut,
      signInWithGoogleIdToken,
      updateDraft,
      completeOnboarding,
      refreshProfile,
    }),
    [user, profile, draft, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
