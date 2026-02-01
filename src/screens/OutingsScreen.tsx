import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ImageBackground,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { RootStackParamList } from "../types/navigation";
import { colors, radius, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import IconButton from "../components/IconButton";
import Pill from "../components/Pill";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import InlineError from "../components/InlineError";
import { db } from "../firebaseApp";
import { Outing } from "../types/outing";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";
import { OutingCard } from "../components/OutingCard";
import { OutingRequestStatus } from "../utils/outingStorage";
import { vibeScore } from "../utils/vibeScore";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const filters = [
  { key: "All Outings", label: "ALL" },
  { key: "Chaos Mode", label: "CHAOS" },
  { key: "Calm", label: "CALM" },
  { key: "High Energy", label: "ENERGY" },
  { key: "Chill", label: "CHILL" },
];

const OutingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [active, setActive] = React.useState(filters[0].key);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestStates, setRequestStates] = useState<Record<string, OutingRequestStatus>>({});
  const [vibeMatches, setVibeMatches] = useState<Record<string, number>>({});
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [hostScores, setHostScores] = useState<Record<string, number>>({}); // Phase 2: Host scores
  const [searchQuery, setSearchQuery] = useState(""); // Phase 2: Search query

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = Timestamp.fromDate(new Date());
    // Base query: dateTime only (avoid composite index requirements)
    // We'll filter status and vibeMode client-side to avoid index needs
    const baseFilters = [where("dateTime", ">=", now)];

    const vibeModeMap: Record<string, "CHAOS" | "CALM" | "HIGH_ENERGY" | "CHILL"> = {
      "Chaos Mode": "CHAOS",
      Calm: "CALM",
      "High Energy": "HIGH_ENERGY",
      Chill: "CHILL",
    };

    const vibeModeFilter = active !== "All Outings" && vibeModeMap[active];

    // Show all public outings by default - only filter out invite_only if visibility field exists
    // Don't filter by city - show global discover feed
    // Note: Filter vibeMode client-side to avoid needing composite index
    const q = query(
      collection(db, "outings"),
      ...baseFilters,
      orderBy("dateTime", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((docItem) => {
            const outingData = docItem.data() as Outing;
            return {
              ...outingData,
              id: docItem.id, // Ensure id is set after spread
            };
          })
          .filter((outing) => {
            // Filter out user's own outings
            if (outing.hostId === user.id) return false;
            // Filter to active status client-side
            if (outing.status && outing.status !== "active") return false;
            // Only show public outings (or outings without visibility field for backward compatibility)
            if (outing.visibility === "invite_only") return false;
            // Filter by vibe mode client-side (avoids composite index requirement)
            if (vibeModeFilter && outing.vibeMode !== vibeModeFilter) return false;
            return true;
          })
          // Sort: user's city first, then others
          .sort((a, b) => {
            if (profile?.city) {
              const aInCity = a.city === profile.city;
              const bInCity = b.city === profile.city;
              if (aInCity && !bInCity) return -1;
              if (!aInCity && bInCity) return 1;
            }
            return 0;
          });
        setOutings(data);
        setLoading(false);
        setError(null);
        logger.info("outings.feed.loaded", { count: data.length });
      },
      (snapError: any) => {
        logger.error("outings.query.failed", { error: snapError });
        // If it's an index error, show a more helpful message
        if (snapError?.code === "failed-precondition") {
          setError("Loading outings... Please wait a moment.");
        } else {
          setError("Failed to load outings.");
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user, active, profile?.city]);

  useEffect(() => {
    if (!user || outings.length === 0) return;

    const loadRequestStates = async () => {
      try {
        const requestsQuery = query(
          collection(db, "outingRequests"),
          where("userId", "==", user.id)
        );
        const requestsSnap = await getDocs(requestsQuery);

        const states: Record<string, OutingRequestStatus> = {};
        requestsSnap.docs.forEach((docItem) => {
          const data = docItem.data();
          if (data.outingId && data.status) {
            states[data.outingId] = data.status as OutingRequestStatus;
          }
        });
        setRequestStates(states);

        const membershipChecks: Record<string, boolean> = {};
        await Promise.all(
          outings.map(async (outing) => {
            try {
              const memberRef = doc(db, "outings", outing.id, "members", user.id);
              const memberSnap = await getDoc(memberRef);
              membershipChecks[outing.id] = memberSnap.exists();
            } catch (error) {
              logger.error("membership.check.failed", { outingId: outing.id, error });
              membershipChecks[outing.id] = false;
            }
          })
        );
        setMemberships(membershipChecks);

        if (profile?.vibe_answers) {
          const matches: Record<string, number> = {};
          await Promise.all(
            outings.map(async (outing) => {
              try {
                const hostSnap = await getDoc(doc(db, "users", outing.hostId));
                if (hostSnap.exists()) {
                  const hostProfile = hostSnap.data();
                  if (hostProfile?.vibe_answers) {
                    const match = vibeScore(profile.vibe_answers, hostProfile.vibe_answers).score;
                    matches[outing.id] = match;
                  }
                }
              } catch (error) {
                logger.error("vibe.match.compute.failed", { outingId: outing.id, error });
              }
            })
          );
          setVibeMatches(matches);
        }

        // Phase 2: Load host scores
        const scores: Record<string, number> = {};
        await Promise.all(
          outings.map(async (outing) => {
            try {
              const hostSnap = await getDoc(doc(db, "users", outing.hostId));
              if (hostSnap.exists()) {
                const hostProfile = hostSnap.data();
                if (hostProfile?.hostScore !== undefined) {
                  scores[outing.id] = hostProfile.hostScore;
                } else {
                  // Compute if not stored
                  const { computeHostScore } = await import("../utils/hostScore");
                  const computed = await computeHostScore(outing.hostId);
                  scores[outing.id] = computed;
                }
              }
            } catch (error) {
              logger.error("host.score.load.failed", { outingId: outing.id, error });
            }
          })
        );
        setHostScores(scores);
      } catch (error) {
        logger.error("request.states.load.failed", { error });
      }
    };

    loadRequestStates();
  }, [user, outings, profile?.vibe_answers]);

  const handleCardPress = (outingId: string) => {
    navigation.navigate("OutingDetails", { outingId });
  };

  const handleCtaPress = (outing: Outing, status: OutingRequestStatus | null) => {
    if (status === "approved") {
      navigation.navigate("ChatThread", { outingId: outing.id });
    } else {
      navigation.navigate("OutingDetails", { outingId: outing.id });
    }
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <IconButton icon={<Ionicons name="search" size={18} color={tokens.colors.text.secondary} />} />
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
    </View>
  );

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader title="Discover" actions={headerActions} showDivider={false} />
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const isActive = active === filter.key;
            return (
              <Pill
                key={filter.key}
                label={filter.label}
                selected={isActive}
                style={styles.filterPill}
                onPress={() => setActive(filter.key)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Phase 2: Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={tokens.colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search outings..."
          placeholderTextColor={tokens.colors.text.subtle}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={tokens.colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <InlineError
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            // Force reload by resetting state - useEffect will re-run
            setOutings([]);
          }}
        />
      ) : null}

      {loading ? (
        <View style={styles.skeletonStack}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`outing-skeleton-${index}`} style={styles.skeletonCard}>
              <Skeleton height={230} radius={radius.card} />
              <View style={styles.skeletonBody}>
                <Skeleton height={18} radius={10} />
                <Skeleton height={12} width="70%" radius={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (() => {
        // Phase 2: Filter by search query (client-side)
        const filteredOutings = searchQuery.trim()
          ? outings.filter((outing) => {
              const query = searchQuery.toLowerCase();
              return (
                outing.title?.toLowerCase().includes(query) ||
                outing.hostName?.toLowerCase().includes(query) ||
                outing.location?.name?.toLowerCase().includes(query) ||
                outing.area?.toLowerCase().includes(query)
              );
            })
          : outings;

        if (filteredOutings.length === 0) {
          return (
            <EmptyState
              title={searchQuery ? "No results" : "No outings yet"}
              subtitle={searchQuery ? "Try a different search term." : "Be the first to create a plan in your city."}
              actionLabel={profile?.isHost && !searchQuery ? "Create outing" : undefined}
              onAction={
                profile?.isHost && !searchQuery ? () => navigation.navigate("CreateOuting") : undefined
              }
              icon={<Ionicons name="planet" size={48} color={tokens.colors.text.subtle} />}
            />
          );
        }

        return filteredOutings.map((outing) => (
          <OutingCard
            key={outing.id}
            outing={outing}
            requestStatus={requestStates[outing.id] || null}
            isMember={memberships[outing.id] || false}
            vibeMatch={vibeMatches[outing.id]}
            hostScore={hostScores[outing.id]} // Phase 2: Host score
            isHost={user?.id === outing.hostId}
            currentUserId={user?.id}
            onPress={() => handleCardPress(outing.id)}
            onCtaPress={() => handleCtaPress(outing, requestStates[outing.id] || null)}
          />
        ));
      })()}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.spacing.xxl,
    backgroundColor: tokens.colors.bg.base,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
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
  filterWrapper: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
    position: "relative",
  },
  filterRow: {
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.lg,
  },
  filterPill: {
    paddingHorizontal: tokens.spacing.lg,
  },
  skeletonStack: {
    gap: tokens.spacing.lg,
  },
  skeletonCard: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    overflow: "hidden",
  },
  skeletonBody: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  // Phase 2: Search styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.text.primary,
    fontSize: 15,
  },
  searchClear: {
    marginLeft: tokens.spacing.sm,
  },
});

export default OutingsScreen;
