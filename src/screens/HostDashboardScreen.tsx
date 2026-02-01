import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Image, Pressable, ScrollView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import InlineError from "../components/InlineError";
import { outingStorage } from "../utils/outingStorage";
import { db } from "../firebaseApp";
import { useAuth } from "../context/AuthContext";
import { Outing } from "../types/outing";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { logger } from "../utils/logger";
import { computeHostScore } from "../utils/hostScore";

type Nav = StackNavigationProp<RootStackParamList, "HostDashboard">;

type RequestItem = {
  id: string;
  userId: string;
  name: string;
  city: string;
  vibeMatch: number;
  quote: string;
  avatar: string;
  outingId: string;
};

const HostDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeOutings, setActiveOutings] = useState<Outing[]>([]);
  const [hasOutings, setHasOutings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"incoming" | "approved">("incoming");
  const [hostScore, setHostScore] = useState<number | null>(null); // Phase 2: Host score

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const outingsSnap = await getDocs(
          query(collection(db, "outings"), where("hostId", "==", user.id))
        );
        const outings = outingsSnap.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as Outing),
        }));
        setActiveOutings(outings);
        setHasOutings(outings.length > 0);

        const curatedOutingIds = new Set(
          outings.filter((o) => o.eventMode === "curated").map((o) => o.id)
        );

        const requestsSnap = await getDocs(
          query(
            collection(db, "outingRequests"),
            where("hostId", "==", user.id)
          )
        );
        setRequests(
          requestsSnap.docs
            .filter((docItem) => curatedOutingIds.has(docItem.data().outingId))
            .map((docItem) => ({
              id: docItem.id,
              userId: docItem.data().userId,
              name: docItem.data().userName ?? "Guest",
              city: docItem.data().userCity ?? "Unknown",
              vibeMatch: docItem.data().vibeMatch ?? 0,
              quote: docItem.data().message ?? "Looking to join your outing.",
              avatar: docItem.data().userPhotoUrl ?? "",
              outingId: docItem.data().outingId,
              status: docItem.data().status ?? "pending",
            }))
        );
        
        // Phase 2: Compute host score
        if (user.id) {
          const score = await computeHostScore(user.id);
          setHostScore(score);
        }
        
        setError(null);
      } catch (loadError) {
        logger.error("host.dashboard.load.failed", { error: loadError });
        setError("Failed to load host dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState title="Sign in to view host tools" />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <ScreenHeader title="Host Dashboard" />
        <View style={styles.skeletonStack}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`host-skeleton-${index}`} style={styles.skeletonCard}>
              <Skeleton height={80} radius={16} />
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (!hasOutings && !profile?.isHost) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState
          title="Host tools locked"
          subtitle="Create your first outing to unlock host tools."
          actionLabel="Create outing"
          onAction={() => navigation.navigate("CreateOuting")}
        />
      </Screen>
    );
  }

  const handleViewProfile = (request: RequestItem) => {
    navigation.navigate("Profile", {
      userId: request.userId,
      outingId: request.outingId,
      context: "host_request",
    });
  };

  const handleDecision = async (requestId: string, status: "approved" | "declined") => {
    const request = requests.find((item) => item.id === requestId);
    if (!request || !user) return;
    if (status === "approved") {
      const outing = activeOutings.find((item) => item.id === request.outingId);
      await outingStorage.approveRequest(request.outingId, request.userId, user.id, {
        outingId: request.outingId,
        title: outing?.title ?? "Outing",
        coverImageUrl: outing?.coverImageUrl ?? null,
        dateTime: outing?.dateTime ?? null,
        area: outing?.area ?? null,
      });
    } else {
      await outingStorage.declineRequest(request.outingId, request.userId);
    }
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId ? { ...item, status } : item
      )
    );
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Host Dashboard" />
      {error ? <InlineError message={error} /> : null}

      <View style={styles.statsRow}>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Active Outings</Text>
          <Text style={styles.statValue}>{activeOutings.length}</Text>
          <Text style={styles.statDelta}>Live now</Text>
        </Card>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Pending Requests</Text>
          <Text style={styles.statValue}>
            {requests.filter((r: any) => r.status === "pending").length}
          </Text>
          <Text style={styles.statDelta}>Need review</Text>
        </Card>
        {/* Phase 2: Host Score */}
        {hostScore !== null && (
          <Card style={styles.statCard} padding="lg">
            <Text style={styles.statLabel}>Host Score</Text>
            <Text style={styles.statValue}>{hostScore}</Text>
            <Text style={styles.statDelta}>Credibility</Text>
          </Card>
        )}
      </View>

      {/* New join requests pill */}
      {requests.filter((r: any) => r.status === "pending").length > 0 && (
        <View style={styles.bannerPill}>
          <Text style={styles.bannerEmoji}>🔔</Text>
          <Text style={styles.bannerText}>
            {requests.filter((r: any) => r.status === "pending").length} New Join
            Requests
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Active Outings</Text>
        <Text style={styles.link}>View All</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.outingRow}
      >
        {activeOutings.map((outing) => (
          <Card key={outing.id} style={styles.outingCard} padding="none">
            <View style={styles.outingCardInner}>
              <Image source={{ uri: outing.coverImageUrl }} style={styles.outingImage} />
              <View style={styles.outingTextWrap}>
                <Text style={styles.outingTitle} numberOfLines={1}>
                  {outing.title}
                </Text>
                <Text style={styles.outingMeta} numberOfLines={1}>
                  {outing.area ?? "Mumbai"}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Tabs for Incoming / Approved */}
      <View style={styles.tabsRow}>
        <Text
          style={[styles.tab, tab === "incoming" && styles.tabActive]}
          onPress={() => setTab("incoming")}
        >
          Incoming
        </Text>
        <Text
          style={[styles.tab, tab === "approved" && styles.tabActive]}
          onPress={() => setTab("approved")}
        >
          Approved
        </Text>
      </View>

      <Text style={styles.sectionSubtitle}>Review users wanting to join your vibe</Text>

      {requests.filter((r: any) =>
        tab === "incoming" ? r.status === "pending" : r.status === "approved"
      ).length === 0 ? (
        <EmptyState
          title={
            tab === "incoming" ? "No pending requests" : "No approved guests yet"
          }
          subtitle="You're all caught up."
        />
      ) : (
        requests
          .filter((r: any) =>
            tab === "incoming" ? r.status === "pending" : r.status === "approved"
          )
          .map((request) => (
          <Card key={request.id} style={styles.requestCard} padding="xl">
            <View style={styles.requestHeader}>
              <Image source={{ uri: request.avatar }} style={styles.requestAvatar} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestCity}>{request.city}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.requestMatch}>{request.vibeMatch}%</Text>
                <Text style={styles.matchLabel}>Match</Text>
              </View>
            </View>
            {request.quote ? (
              <Text style={styles.requestQuote}>"{request.quote}"</Text>
            ) : null}
            <Pressable
              style={styles.viewProfileButton}
              onPress={() => handleViewProfile(request)}
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
            </Pressable>
            {tab === "incoming" && (
              <View style={styles.requestActions}>
                <SecondaryButton
                  label="Decline"
                  onPress={() => handleDecision(request.id, "declined")}
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label="Accept"
                  onPress={() => handleDecision(request.id, "approved")}
                  style={styles.actionButton}
                />
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  centered: {
    justifyContent: "center",
  },
  skeletonStack: {
    gap: layout.section,
  },
  skeletonCard: {
    borderRadius: radius.card,
  },
  statsRow: {
    flexDirection: "row",
    gap: layout.section,
    marginBottom: layout.section,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    color: colors.textMuted,
    ...typography.micro,
  },
  statValue: {
    color: colors.textPrimary,
    ...typography.h2,
    marginTop: layout.compact,
  },
  statDelta: {
    color: colors.textSecondary,
    ...typography.micro,
    marginTop: layout.compact,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: layout.section,
  },
  sectionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginBottom: layout.section,
  },
  link: {
    color: colors.textSecondary,
    ...typography.body2,
  },
  outingRow: {
    flexDirection: "row",
    gap: layout.section,
    paddingRight: layout.section,
    marginBottom: layout.section,
  },
  outingCard: {
    width: 150,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  outingCardInner: {
    alignItems: "flex-start",
  },
  outingImage: {
    width: "100%",
    height: 140,
  },
  outingTextWrap: {
    paddingHorizontal: layout.compact,
    paddingVertical: layout.compact,
  },
  outingTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  outingMeta: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
  },
  requestCard: {
    marginBottom: layout.section,
    borderRadius: radius.sheet,
    backgroundColor: colors.surface,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.section,
  },
  requestAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface2,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  requestCity: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
  },
  matchBadge: {
    alignItems: "center",
  },
  requestMatch: {
    color: colors.primary,
    ...typography.h3,
  },
  matchLabel: {
    color: colors.textSubtle,
    ...typography.micro,
    marginTop: 2,
  },
  viewProfileButton: {
    marginTop: layout.section,
    marginBottom: layout.compact,
    paddingVertical: layout.compact,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: "center",
  },
  viewProfileText: {
    color: colors.textSecondary,
    ...typography.body2,
    fontWeight: "600",
  },
  requestQuote: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.section,
    fontStyle: "italic",
  },
  requestActions: {
    flexDirection: "row",
    gap: layout.section,
    marginTop: layout.compact,
  },
  actionButton: {
    flex: 1,
  },
  bannerPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    marginBottom: layout.section,
  },
  bannerEmoji: {
    marginRight: layout.compact,
  },
  bannerText: {
    color: colors.textPrimary,
    ...typography.body2,
    fontWeight: "600",
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    padding: 2,
    marginBottom: layout.compact,
  },
  tab: {
    flex: 1,
    textAlign: "center",
    paddingVertical: layout.compact,
    borderRadius: radius.pill,
    ...typography.body2,
    color: colors.textMuted,
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

export default HostDashboardScreen;
