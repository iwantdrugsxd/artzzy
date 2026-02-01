import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  ScrollView,
  Animated as RNAnimated,
  Modal,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const vibeFilters = ["High Energy", "Chill", "Night Owl"];

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
  const { profile } = useAuth();
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
          Alert.alert("Daily limit reached", "You’ve used today’s free vibes.");
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
              onPress={() => navigation.navigate("MyProfile")}
              style={styles.avatarButton}
              pressedStyle={styles.avatarPressed}
              icon={
                profile?.profile_photo_url ? (
                  <ImageBackground
                    source={{ uri: profile.profile_photo_url }}
                    style={styles.profileImage}
                    imageStyle={styles.profileImageStyle}
                  />
                ) : (
                  <Ionicons name="person" size={18} color={tokens.colors.text.secondary} />
                )
              }
            />
          </>
        }
        subheader={
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
        }
      />

      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      {error ? (
        <InlineError
          message={error}
          onRetry={loadPeople}
        />
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

      {current ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + tokens.spacing.lg },
          ]}
        >
          <View style={styles.actions}>
            <ActionButton
              label="Pass"
              icon="close"
              tone="surface"
              disabled={buttonsDisabled}
              onPress={() => handleDecision("skip")}
            />
            <ActionButton
              label="Vibe"
              icon="sparkles"
              tone="primary"
              disabled={buttonsDisabled}
              onPress={() => handleDecision("vibe")}
            />
          </View>
        </View>
      ) : null}

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
                  Upgrade to Premium to unlock advanced radius filters and priority visibility.
                </Text>
                <TouchableOpacity
                  style={styles.premiumCta}
                  onPress={() => {
                    setShowFilterModal(false);
                    navigation.navigate("Subscription");
                  }}
                >
                  <Text style={styles.premiumCtaText}>Upgrade to Premium</Text>
                </TouchableOpacity>
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
                    Boost your visibility for 24 hours. Get seen by more people!
                  </Text>
                  <PrimaryButton
                    label="Activate Spotlight"
                    onPress={async () => {
                      if (!user || !profile) return;
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
                    }}
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

const ActionButton = ({
  label,
  icon,
  tone,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "surface" | "primary";
  onPress: () => void;
  disabled?: boolean;
}) => {
  const scale = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <RNAnimated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.actionButton,
          tone === "primary" ? styles.actionPrimary : styles.actionSurface,
          disabled && { opacity: 0.6 },
        ]}
        disabled={disabled}
      >
        <Ionicons
          name={icon}
          size={18}
          color={tone === "primary" ? tokens.colors.bg.base : tokens.colors.text.primary}
        />
        <Text
          style={[
            styles.actionText,
            tone === "primary" ? styles.actionTextPrimary : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarButton: {
    borderWidth: 1,
    borderColor: tokens.colors.transparent,
  },
  avatarPressed: {
    borderColor: tokens.colors.primary.solid,
    ...tokens.shadows.glow.soft,
  },
  profileImage: {
    width: 32,
    height: 32,
  },
  profileImageStyle: {
    borderRadius: 16,
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
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    minWidth: 120,
    ...tokens.shadows.card.raised,
  },
  actionSurface: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: {
    backgroundColor: tokens.colors.primary.solid,
  },
  actionText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  actionTextPrimary: {
    color: tokens.colors.bg.base,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: tokens.spacing.lg,
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
});

export default PeopleScreen;
