import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { collection, getDocs, query, where, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import IconButton from "../components/IconButton";
import ProfileCard from "../components/ProfileCard";
import ProfileCardSkeleton from "../components/ProfileCardSkeleton";
import Pill from "../components/Pill";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import InlineError from "../components/InlineError";
import { SwipeRibbonOverlay } from "../components/SwipeRibbonOverlay";
import { vibeScore } from "../utils/vibeScore";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";
import { db } from "../firebaseApp";
import { haptics } from "../utils/haptics";
import { connectionStorage } from "../utils/connectionStorage";
import { vibeQuestions } from "../data/vibeQuestions";
import { Toast } from "../components/ui/Toast";
import { isProfileComplete } from "../utils/profileCompleteness";
import PrimaryButton from "../components/PrimaryButton";
import { interestGroups } from "../data/interests";
import { idConnectionStorage, FoundUserProfile } from "../utils/idConnectionStorage";
import Card from "../components/Card";
import { ImageBackground } from "react-native";
import { getPlanTier } from "../utils/connectionPolicy";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const vibeFilters = ["High Energy", "Chill", "Night Owl"];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_X_THRESHOLD = 0.28 * SCREEN_W;
const SWIPE_VX_THRESHOLD = 900;
const SUPER_Y_THRESHOLD = -0.18 * SCREEN_H;
const springConfig = { damping: 16, stiffness: 180, mass: 0.9 };

// Phase 1: Discover filters
type FilterState = {
  radius: number; // 5-50 km (client-side, based on city match)
  timeWindow: "all" | "recent" | "7days"; // Active recently, Last 7 days
  interestTags: string[]; // Multi-select interest tags
};

const DEFAULT_FILTERS: FilterState = {
  radius: 50, // Default: show all (no radius limit)
  timeWindow: "all",
  interestTags: [],
};

type PendingAction =
  | {
      type: "vibe" | "pass";
      profile: any;
      timeoutId: NodeJS.Timeout;
    }
  | null;

const PeopleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [isActing, setIsActing] = useState(false);
  const isActingRef = useRef(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [toast, setToast] = useState<{ message: string; variant?: "default" | "success" | "error" } | null>(null);
  // Phase 1: Discover filters
  const [discoverFilters, setDiscoverFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Connect by ID
  const [userCodeInput, setUserCodeInput] = useState("");
  const [findingUser, setFindingUser] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [userCodeError, setUserCodeError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<{ uid: string; name: string; profile_photo_url?: string; city?: string } | null>(null);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const isPlus = useMemo(() => getPlanTier(profile) === "plus", [profile]);

  const handleSpotlightActivate = async () => {
    if (!user || !profile) return;
    if (!isPlus) {
      Alert.alert(
        "Premium required",
        "Upgrade to activate Spotlight.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => navigation.navigate("Subscription"),
          },
        ]
      );
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.id), {
        spotlightActiveUntil: serverTimestamp(),
      });
      logger.info("spotlight.activated", { userId: user.id });
      Alert.alert("Spotlight Activated", "Your profile is now boosted for 24 hours!");
      setShowFilterModal(false);
    } catch (error) {
      logger.error("spotlight.activate.failed", { error });
      Alert.alert("Error", "Failed to activate spotlight. Please try again.");
    }
  };

  const loadPeople = useCallback(async () => {
    if (!profile || !isProfileComplete(profile)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const connectionsSnap = await getDocs(
        query(collection(db, "connections"), where("fromUserId", "==", profile.user_id))
      );
      const skipsSnap = await getDocs(
        query(collection(db, "skips"), where("fromUserId", "==", profile.user_id))
      );
      // Phase 3: Load blocked users
      const blocksSnap = await getDocs(
        query(collection(db, "blocks"), where("blockerUid", "==", profile.user_id))
      );
      const blockedIds = new Set<string>([
        ...connectionsSnap.docs.map((docItem) => docItem.data().toUserId as string),
        ...skipsSnap.docs.map((docItem) => docItem.data().toUserId as string),
        ...blocksSnap.docs.map((docItem) => docItem.data().blockedUid as string),
      ]);
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("onboarding_complete", "==", true))
      );
      const people = usersSnap.docs
        .map((docItem) => {
          const data = docItem.data();
          return {
            ...data,
            quick_badges: data.quick_badges || [],
            prompts: data.prompts || [],
          };
        })
        .filter((user: any) => user.user_id !== profile.user_id)
        .filter((user: any) => !blockedIds.has(user.user_id));
      setFeed(people);
      setError(null);
      logger.info("people.feed.loaded", { count: people.length });
    } catch (loadError) {
      logger.error("people.load.failed", { error: loadError });
      setError("Failed to load people.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Phase 1: Compute match reasons helper
  const computeMatchReasons = useCallback((user: any, match: any): string[] => {
    const reasons: string[] = [];
    
    // Same city
    if (profile?.city && user.city?.toLowerCase() === profile.city.toLowerCase()) {
      reasons.push("Same city");
    }
    
    // Shared interests
    if (profile?.interests && user.interests) {
      const sharedInterests = profile.interests.filter((i) => user.interests.includes(i));
      if (sharedInterests.length > 0) {
        reasons.push(`Both love ${sharedInterests[0]}`);
      }
    }
    
    // High vibe score
    if (match.score >= 70) {
      reasons.push("High vibe match");
    }
    
    // Shared tags
    if (match.tags && match.tags.length > 0) {
      reasons.push(`Both ${match.tags[0]}`);
    }
    
    return reasons.slice(0, 2); // Max 2 reasons
  }, [profile]);

  const sorted = useMemo(() => {
    if (!profile) return feed;
    const scored = feed.map((user) => {
      const match = vibeScore(profile.vibe_answers, user.vibe_answers);
      const sameCity =
        profile.city &&
        user.city?.toLowerCase() === profile.city.toLowerCase();
      const matchReasons = computeMatchReasons(user, match);
      return {
        ...user,
        match,
        sameCity,
        matchReasons, // Phase 1: Match reasons
        age: getAge(user.birthdate),
        photo: user.profile_photo_url || user.photo || "",
        photos: user.profilePhotoUrls || (user.profile_photo_url ? [user.profile_photo_url] : []),
        bio: user.bio || user.headline || "",
      };
    });
    let filtered = selectedFilter
      ? scored.filter((item) => item.match.tags.includes(selectedFilter))
      : scored;
    
    // Phase 1: Apply discover filters (client-side)
    // Radius filter (based on city match - simplified for client-side)
    if (discoverFilters.radius < 50 && profile?.city) {
      // For now, radius filter is based on city match (same city = within radius)
      // In a real app, you'd compute distance from lat/lng
      if (discoverFilters.radius < 25) {
        // Only show same city if radius is small
        filtered = filtered.filter((item) => item.sameCity);
      }
    }
    
    // Time window filter
    if (discoverFilters.timeWindow !== "all") {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((item) => {
        const created = item.created_at || 0;
        if (discoverFilters.timeWindow === "recent") {
          // Active recently: within last 7 days
          return created >= sevenDaysAgo;
        } else if (discoverFilters.timeWindow === "7days") {
          // Last 7 days
          return created >= sevenDaysAgo;
        }
        return true;
      });
    }
    
    // Interest tags filter
    if (discoverFilters.interestTags.length > 0 && profile?.interests) {
      filtered = filtered.filter((item) => {
        const userInterests = item.interests || [];
        return discoverFilters.interestTags.some((tag) => userInterests.includes(tag));
      });
    }
    
    return filtered.sort((a, b) => {
      if (a.sameCity !== b.sameCity) {
        return a.sameCity ? -1 : 1;
      }
      return b.match.score - a.match.score;
    });
  }, [feed, profile, selectedFilter, computeMatchReasons, discoverFilters]);

  useEffect(() => {
    setQueue(sorted);
  }, [sorted]);

  const current = queue[0];
  const currentAge = current ? getAge(current.birthdate) : null;

  const currentVibeAnswers = (current?.vibe_answers as Record<string, string>) || {};
  const currentBio = current?.bio as string | undefined;

  const vibeHighlights = useMemo(() => {
    if (!current) return [];
    const entries = Object.entries(currentVibeAnswers);
    if (!entries.length) return [];

    // Map to nice labels using vibeQuestions config
    const byKey: Record<string, string> = {};
    vibeQuestions.forEach((q) => {
      const answer = currentVibeAnswers[q.key];
      if (!answer) return;
      const opt = q.options.find((o) => o.value === answer);
      if (opt) {
        byKey[q.key] = `${q.title}: ${opt.label}`;
      } else {
        byKey[q.key] = `${q.title}: ${answer}`;
      }
    });

    return Object.values(byKey).slice(0, 3);
  }, [current, currentVibeAnswers]);

  const showToast = useCallback((message: string, variant: "default" | "success" | "error" = "default") => {
    setToast({ message, variant });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 2500);
  }, []);

  // Profile completeness gating
  if (!profile || !isProfileComplete(profile)) {
    return (
      <Screen contentContainerStyle={styles.emptyContainer}>
        <EmptyState
          title="Complete your profile to see people"
          subtitle="Add photos, prompts, and interests to unlock your feed."
          icon={<Ionicons name="sparkles" size={48} color={tokens.colors.text.subtle} />}
          actionLabel="Edit Profile"
          onAction={() => navigation.navigate("EditProfile")}
        />
      </Screen>
    );
  }

  const handleDecision = async (type: "vibe" | "skip") => {
    if (!profile || !current || isActingRef.current || pendingAction) return;

    const acted = current;
    isActingRef.current = true;
    setIsActing(true);

    // Show immediate feedback & schedule Firestore write after undo window
    if (type === "vibe") {
      haptics.medium();
      setBanner(`Vibed ${acted.name}`);
    } else {
      haptics.light();
      setBanner(`Passed ${acted.name}`);
    }

    setTimeout(() => setBanner(null), 1800);

    // Optimistically advance queue
    setQueue((prev) => prev.slice(1));
    isActingRef.current = false;
    setIsActing(false);

    // Schedule Firestore write with undo window
    const timeoutId = setTimeout(async () => {
      try {
        if (type === "vibe") {
          await connectionStorage.sendVibe({
            fromUid: profile.user_id,
            toUid: acted.user_id,
            fromProfile: profile,
            vibeScore: acted.match.score,
            mutualTagIds: acted.match.tags || [],
            mutualInterestIds: acted.interests || [],
            source: "people_feed",
            city: profile.city,
          });
          logger.info("people.vibe.sent", { toUid: acted.user_id });
        } else {
          await setDoc(doc(db, "skips", `${profile.user_id}_${acted.user_id}`), {
            fromUserId: profile.user_id,
            toUserId: acted.user_id,
            createdAt: serverTimestamp(),
            source: "people_pass",
          });
          logger.info("people.pass.sent", { toUid: acted.user_id });
        }
      } catch (decisionError: any) {
        logger.error(
          type === "vibe" ? "people.vibe.failed" : "people.pass.failed",
          { error: decisionError }
        );
        const code = decisionError?.code || decisionError?.message;
        if (code === "LIMIT" || code === "DAILY_LIMIT_REACHED") {
          Alert.alert(
            "Daily limit reached",
            "Upgrade to send more vibes today.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Upgrade",
                onPress: () => navigation.navigate("Subscription"),
              },
            ]
          );
        } else if (type === "vibe") {
          showToast("Couldn’t vibe. Check connection.", "error");
        } else {
          showToast("Couldn’t pass. Try again.", "error");
        }
        // Rollback: put card back on top if it's not there
        setQueue((prev) => [acted, ...prev]);
      } finally {
        setPendingAction(null);
      }
    }, 3000);

    setPendingAction({
      type: type === "vibe" ? "vibe" : "pass",
      profile: acted,
      timeoutId,
    });
  };

  const commitSwipe = useCallback(
    (decision: "vibe" | "skip" | "super") => {
      "worklet";
      if (isAnimating.value) return;
      isAnimating.value = true;
      const targetX =
        decision === "vibe" ? SCREEN_W * 1.3 : decision === "skip" ? -SCREEN_W * 1.3 : 0;
      const targetY = decision === "super" ? SUPER_Y_THRESHOLD * 1.3 : 0;
      tx.value = withTiming(
        targetX,
        { duration: 240, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            if (decision === "vibe") {
              runOnJS(handleDecision)("vibe");
            } else if (decision === "skip") {
              runOnJS(handleDecision)("skip");
            }
          }
          tx.value = 0;
          ty.value = 0;
          isAnimating.value = false;
        }
      );
      ty.value = withTiming(targetY, { duration: 240, easing: Easing.out(Easing.cubic) });
    },
    [handleDecision, isAnimating, tx, ty]
  );

  const resetSwipe = useCallback(() => {
    "worklet";
    if (isAnimating.value) return;
    isAnimating.value = true;
    tx.value = withSpring(0, springConfig, () => {
      isAnimating.value = false;
    });
    ty.value = withSpring(0, springConfig);
  }, [isAnimating, tx, ty]);

  const swipeGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!buttonsDisabled)
      .activeOffsetX([-6, 6])
      .onUpdate((event) => {
        if (isAnimating.value) return;
        tx.value = event.translationX;
        ty.value = event.translationY;
      })
      .onEnd((event) => {
        if (isAnimating.value) return;
        const like = tx.value > SWIPE_X_THRESHOLD || event.velocityX > SWIPE_VX_THRESHOLD;
        const pass = tx.value < -SWIPE_X_THRESHOLD || event.velocityX < -SWIPE_VX_THRESHOLD;
        const superSwipe =
          ty.value < SUPER_Y_THRESHOLD && Math.abs(tx.value) < SWIPE_X_THRESHOLD * 0.65;
        if (superSwipe) {
          commitSwipe("super");
          return;
        }
        if (like) {
          commitSwipe("vibe");
          return;
        }
        if (pass) {
          commitSwipe("skip");
          return;
        }
        resetSwipe();
      });
  }, [buttonsDisabled, commitSwipe, resetSwipe, isAnimating, tx, ty]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12]);
    const distance = Math.abs(tx.value) + Math.abs(ty.value);
    const baseScale = interpolate(distance, [0, SCREEN_W], [1, 0.985], Extrapolate.CLAMP);
    const superProgress = Math.min(
      1,
      Math.max(0, -ty.value / Math.abs(SUPER_Y_THRESHOLD || 1))
    );
    const scale = baseScale + superProgress * 0.02;
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value * 0.2 },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const cardOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      tx.value,
      [-SCREEN_W * 0.7, 0, SCREEN_W * 0.7],
      [0, 1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });


  const handleUndo = () => {
    if (!pendingAction) return;
    clearTimeout(pendingAction.timeoutId);
    const { profile: undoneProfile, type } = pendingAction;
    setPendingAction(null);
    setQueue((prev) => [undoneProfile, ...prev]);
    setBanner(type === "vibe" ? "Vibe undone" : "Pass undone");
    setTimeout(() => setBanner(null), 1500);
  };

  const buttonsDisabled = !current || isActing || !!pendingAction;

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <ScreenHeader
        title="People"
        compact
        actions={
          <>
            {/* Phase 1: Filter button */}
            <IconButton
              icon={<Ionicons name="filter" size={18} color={tokens.colors.text.secondary} />}
              onPress={() => setShowFilterModal(true)}
            />
            <IconButton
              icon={<Ionicons name="person" size={18} color={tokens.colors.text.secondary} />}
              onPress={() => navigation.navigate("MyProfile")}
            />
          </>
        }
        subheader={
          <View>
            {/* Connect by ID Search Bar */}
            {profile && isProfileComplete(profile) ? (
              <View style={styles.connectSearchWrap}>
                <View style={styles.connectSearchBar}>
                  <Ionicons
                    name="search"
                    size={18}
                    color={tokens.colors.text.muted}
                  />
                  <TextInput
                    style={styles.connectSearchInput}
                    placeholder="Search by User ID"
                    placeholderTextColor={tokens.colors.text.muted}
                    value={userCodeInput}
                    onChangeText={(text) => {
                      // Auto-uppercase and filter to only allow alphanumeric
                      const filtered = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      setUserCodeInput(filtered);
                      setUserCodeError(null);
                      // Clear found user when input changes
                      setFoundUser(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                  />
                  <Pressable
                    style={[
                      styles.connectSearchAction,
                      (!userCodeInput.trim() || userCodeInput.trim().length < 8 || findingUser) && styles.connectSearchActionDisabled,
                    ]}
                    onPress={async () => {
                      if (!user) return;
                      const trimmed = userCodeInput.trim();
                      if (!trimmed || trimmed.length < 8 || trimmed.length > 10) {
                        setUserCodeError("User ID must be 8-10 characters");
                        return;
                      }
                      setFindingUser(true);
                      setUserCodeError(null);
                      setFoundUser(null);
                      try {
                        const result = await idConnectionStorage.findUserByCode(trimmed);
                        if (result.success && result.user) {
                          // Prevent self-request
                          if (result.user.uid === user.id) {
                            setUserCodeError("You can't add yourself.");
                            setFoundUser(null);
                          } else {
                            setFoundUser(result.user);
                            setUserCodeError(null);
                          }
                        } else {
                          setUserCodeError(result.error || "No user found.");
                          setFoundUser(null);
                        }
                      } catch (err: any) {
                        const errorMsg = err?.message || "Failed to find user";
                        setUserCodeError(errorMsg);
                        setFoundUser(null);
                        showToast(errorMsg, "error");
                      } finally {
                        setFindingUser(false);
                      }
                    }}
                    disabled={findingUser || !userCodeInput.trim() || userCodeInput.trim().length < 8}
                  >
                    <Text style={styles.connectSearchActionText}>
                      {findingUser ? "..." : "Find"}
                    </Text>
                  </Pressable>
                </View>
                {userCodeError ? (
                  <Text style={styles.connectSearchError}>{userCodeError}</Text>
                ) : null}
              </View>
            ) : null}
            {/* Vibe Filter Pills */}
            <View style={styles.filterRow}>
              {vibeFilters.map((filter) => (
                <Pill
                  key={filter}
                  label={filter}
                  selected={selectedFilter === filter}
                  onPress={() =>
                    setSelectedFilter(selectedFilter === filter ? null : filter)
                  }
                />
              ))}
            </View>
          </View>
        }
      />

      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      {error ? (
        <InlineError
          message={error}
          onRetry={loadPeople}
        />
      ) : null}

      {/* Preview Card - shown after successful Find */}
      {foundUser ? (
        <Card style={styles.previewCard} padding="lg">
          <View style={styles.previewContent}>
            <View style={styles.previewLeft}>
              {foundUser.profile_photo_url ? (
                <ImageBackground
                  source={{ uri: foundUser.profile_photo_url }}
                  style={styles.previewAvatar}
                  imageStyle={styles.previewAvatarImage}
                />
              ) : (
                <View style={styles.previewAvatarFallback}>
                  <Text style={styles.previewAvatarFallbackText}>
                    {foundUser.name[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.previewRight}>
              <Text style={styles.previewName}>{foundUser.name}</Text>
              {foundUser.city ? (
                <Text style={styles.previewCity}>{foundUser.city}</Text>
              ) : null}
            </View>
            <PrimaryButton
              label="Connect"
              onPress={async () => {
                if (!profile || !user || !foundUser) return;
                setSendingRequest(true);
                setUserCodeError(null);
                try {
                  logger.info("people.connect.attempt", { 
                    fromUid: user.id, 
                    toUid: foundUser.uid 
                  });
                  const result = await idConnectionStorage.sendIdConnectionRequest({
                    fromUid: user.id,
                    toUid: foundUser.uid,
                    fromProfile: profile,
                  });
                  if (result.status === "sent") {
                    setUserCodeInput("");
                    setFoundUser(null);
                    showToast("Request sent!", "success");
                    haptics.medium();
                    logger.info("people.connect.success", { 
                      fromUid: user.id, 
                      toUid: foundUser.uid 
                    });
                  } else {
                    const errorMsg = result.error || "Failed to send request";
                    setUserCodeError(errorMsg);
                    showToast(errorMsg, "error");
                    logger.error("people.connect.failed", { 
                      fromUid: user.id, 
                      toUid: foundUser.uid,
                      error: errorMsg 
                    });
                  }
                } catch (err: any) {
                  const errorMsg = err?.message || err?.code || "Failed to send request";
                  setUserCodeError(errorMsg);
                  showToast(errorMsg, "error");
                  logger.error("people.connect.exception", { 
                    error: err, 
                    fromUid: user.id, 
                    toUid: foundUser.uid,
                    code: err?.code,
                    message: err?.message 
                  });
                } finally {
                  setSendingRequest(false);
                }
              }}
              disabled={sendingRequest}
              loading={sendingRequest}
              style={styles.connectButton}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + tokens.spacing.lg * 6 },
              ]}
            >
              <View style={styles.cardWrap}>
                <ProfileCardSkeleton />
              </View>
            </ScrollView>
            {/* Skeleton Footer Buttons */}
            <View
              style={[
                styles.footer,
                { paddingBottom: insets.bottom + tokens.spacing.lg },
              ]}
            >
              <View style={styles.actions}>
                <Skeleton width={120} height={52} radius={tokens.radius.button} />
                <Skeleton width={120} height={52} radius={tokens.radius.button} />
              </View>
            </View>
          </>
        ) : current ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + tokens.spacing.lg * 6 },
            ]}
          >
            <View style={styles.cardWrap}>
              <GestureDetector gesture={swipeGesture}>
                <Animated.View style={[cardAnimatedStyle, cardOpacityStyle]}>
                  <SwipeRibbonOverlay tx={tx} threshold={SWIPE_X_THRESHOLD} />
                  <ProfileCard
                    name={current.name}
                    age={currentAge ?? current.age}
                    height={current.height}
                    city={current.city}
                    country={current.country}
                    bio={currentBio}
                    photo={current.photo}
                    photos={current.photos}
                    interests={current.interests}
                    score={current.match.score}
                    tags={current.match.tags}
                    showDetails
                    vibeHighlights={vibeHighlights}
                    memberSince={current.created_at}
                    quickBadges={current.quick_badges}
                    prompts={current.prompts}
                    work={current.work}
                    education={current.education}
                    isVerified={current.isVerified}
                    matchReasons={current.matchReasons || []}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.centered}>
            <EmptyState
              title="No more people right now"
              subtitle="Check back later — new vibes drop all day."
              icon={<Ionicons name="heart" size={48} color={tokens.colors.text.subtle} />}
            />
          </View>
        )}
      </View>

      {pendingAction ? (
        <View
          style={[
            styles.snackbar,
            { paddingBottom: insets.bottom + tokens.spacing.sm },
          ]}
        >
          <View style={styles.snackbarInner}>
            <Text style={styles.snackbarText}>
              {pendingAction.type === "vibe"
                ? `Vibed ${pendingAction.profile.name}`
                : `Passed ${pendingAction.profile.name}`}
            </Text>
            <Pressable onPress={handleUndo} hitSlop={8}>
              <Text style={styles.snackbarAction}>Undo</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {toast ? (
        <View style={[styles.toastWrap, { paddingBottom: insets.bottom + tokens.spacing.lg * 4 }]}>
          <Toast message={toast.message} variant={toast.variant} />
        </View>
      ) : null}

      {/* Phase 1 + Phase 4: Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={tokens.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {/* Phase 1: Basic Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Radius</Text>
                <Text style={styles.filterValue}>{discoverFilters.radius} km</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>5</Text>
                  <View style={styles.sliderTrack}>
                    {[5, 10, 25, 50].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.sliderOption,
                          discoverFilters.radius === val && styles.sliderOptionActive,
                        ]}
                        onPress={() =>
                          setDiscoverFilters({ ...discoverFilters, radius: val })
                        }
                      >
                        <Text
                          style={[
                            styles.sliderOptionText,
                            discoverFilters.radius === val &&
                              styles.sliderOptionTextActive,
                          ]}
                        >
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.sliderLabel}>50</Text>
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Time Window</Text>
                <View style={styles.optionRow}>
                  {[
                    { value: "all", label: "All Time" },
                    { value: "recent", label: "Recent" },
                    { value: "7days", label: "Last 7 Days" },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.filterOption,
                        discoverFilters.timeWindow === opt.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters({
                          ...discoverFilters,
                          timeWindow: opt.value as any,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          discoverFilters.timeWindow === opt.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Phase 4: Premium Filters Section */}
              <View style={styles.filterSection}>
                <View style={styles.premiumHeader}>
                  <Ionicons
                    name="star"
                    size={18}
                    color={tokens.colors.primary.solid}
                  />
                  <Text style={styles.premiumLabel}>Premium Filters</Text>
                </View>
                <Text style={styles.filterHint}>
                  {isPlus
                    ? "Premium active. Enjoy advanced filters and priority visibility."
                    : "Upgrade to Premium to unlock advanced radius filters and priority visibility."}
                </Text>
                {!isPlus ? (
                  <TouchableOpacity
                    style={styles.premiumCta}
                    onPress={() => {
                      setShowFilterModal(false);
                      navigation.navigate("Subscription");
                    }}
                  >
                    <Text style={styles.premiumCtaText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Phase 4: Spotlight Feature */}
              <View style={styles.filterSection}>
                <View style={styles.spotlightCard}>
                  <View style={styles.spotlightHeader}>
                    <Ionicons
                      name="flash"
                      size={20}
                      color={tokens.colors.primary.solid}
                    />
                    <Text style={styles.spotlightTitle}>Spotlight</Text>
                  </View>
                  <Text style={styles.spotlightText}>
                    {isPlus
                      ? "Boost your visibility for 24 hours. Get seen by more people!"
                      : "Premium required to boost visibility for 24 hours."}
                  </Text>
                  <PrimaryButton
                    label={isPlus ? "Activate Spotlight" : "Upgrade to Activate"}
                    onPress={handleSpotlightActivate}
                    style={styles.spotlightButton}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setDiscoverFilters(DEFAULT_FILTERS)}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Apply Filters"
                onPress={() => setShowFilterModal(false)}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  banner: {
    textAlign: "center",
    color: tokens.colors.primary.solid,
    ...tokens.typography.body2,
    marginBottom: tokens.spacing.sm,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.lg,
  },
  cardWrap: {
    alignItems: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  // Phase 1: Filter Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: tokens.colors.bg.base,
    borderTopLeftRadius: tokens.radius.card,
    borderTopRightRadius: tokens.radius.card,
    maxHeight: "80%",
    paddingTop: tokens.spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h2,
    fontWeight: "700",
  },
  modalScroll: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
  },
  filterSection: {
    marginBottom: tokens.spacing.lg * 2,
  },
  filterLabel: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
    marginBottom: tokens.spacing.sm,
  },
  filterValue: {
    color: tokens.colors.primary.solid,
    ...tokens.typography.body2,
    marginBottom: tokens.spacing.sm,
  },
  filterHint: {
    color: colors.textMuted,
    ...tokens.typography.body2,
    fontSize: 12,
    marginBottom: tokens.spacing.sm,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  sliderLabel: {
    color: colors.textMuted,
    ...tokens.typography.body2,
    fontSize: 12,
  },
  sliderTrack: {
    flex: 1,
    flexDirection: "row",
    gap: tokens.spacing.sm,
    justifyContent: "space-between",
  },
  sliderOption: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.button,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  sliderOptionActive: {
    backgroundColor: tokens.colors.primary.solid,
    borderColor: tokens.colors.primary.solid,
  },
  sliderOptionText: {
    color: colors.textSecondary,
    ...tokens.typography.body2,
    fontSize: 12,
  },
  sliderOptionTextActive: {
    color: tokens.colors.bg.base,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  filterOption: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.button,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: tokens.colors.primary.solid,
    borderColor: tokens.colors.primary.solid,
  },
  filterOptionText: {
    color: colors.textSecondary,
    ...tokens.typography.body2,
  },
  filterOptionTextActive: {
    color: tokens.colors.bg.base,
    fontWeight: "600",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  interestChip: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestChipActive: {
    backgroundColor: tokens.colors.primary.solid,
    borderColor: tokens.colors.primary.solid,
  },
  interestChipText: {
    color: colors.textSecondary,
    ...tokens.typography.body2,
    fontSize: 13,
  },
  interestChipTextActive: {
    color: tokens.colors.bg.base,
    fontWeight: "600",
  },
  resetButton: {
    paddingVertical: tokens.spacing.lg,
    alignItems: "center",
    marginTop: tokens.spacing.lg,
  },
  resetButtonText: {
    color: colors.textMuted,
    ...tokens.typography.body2,
    textDecorationLine: "underline",
  },
  modalFooter: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Phase 4: Premium filters
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  premiumLabel: {
    color: tokens.colors.primary.solid,
    ...tokens.typography.body,
    fontWeight: "700",
  },
  premiumCta: {
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.colors.primary.soft,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
    alignItems: "center",
  },
  premiumCtaText: {
    color: tokens.colors.primary.solid,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  // Phase 4: Spotlight
  spotlightCard: {
    backgroundColor: tokens.colors.primary.soft,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
    ...tokens.shadows.glow.soft,
  },
  spotlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  spotlightTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h3,
    fontWeight: "700",
  },
  spotlightText: {
    color: tokens.colors.text.secondary,
    ...tokens.typography.body2,
    marginBottom: tokens.spacing.lg,
    lineHeight: 20,
  },
  spotlightButton: {
    marginTop: tokens.spacing.sm,
  },
  // Connect by ID Search Bar
  connectSearchWrap: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  connectSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface2,
    borderRadius: 999,
    height: 44,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  connectSearchInput: {
    flex: 1,
    color: tokens.colors.text.primary,
    fontSize: 14,
    paddingVertical: 0,
    marginLeft: 8,
  },
  connectSearchAction: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  connectSearchActionDisabled: {
    opacity: 0.5,
  },
  connectSearchActionText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  connectSearchError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 6,
  },
  // Preview Card
  previewCard: {
    marginHorizontal: tokens.spacing.xl,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  previewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  previewLeft: {
    width: 52,
    height: 52,
  },
  previewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  previewAvatarImage: {
    borderRadius: 26,
  },
  previewAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarFallbackText: {
    color: colors.textPrimary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  previewRight: {
    flex: 1,
    gap: tokens.spacing.compact / 2,
  },
  previewName: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  previewCity: {
    color: tokens.colors.text.muted,
    ...tokens.typography.micro,
  },
  connectButton: {
    minWidth: 100,
  },
});

export default PeopleScreen;
