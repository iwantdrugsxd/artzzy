import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, tokens, typography } from "../theme";
import Screen from "../components/Screen";
import IconButton from "../components/IconButton";
import Card from "../components/Card";
import Pill from "../components/Pill";
import Skeleton from "../components/Skeleton";
import InlineError from "../components/InlineError";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { outingStorage, OutingRequestStatus } from "../utils/outingStorage";
import { logger } from "../utils/logger";
import { db } from "../firebaseApp";
import { Outing } from "../types/outing";
import { vibeScore } from "../utils/vibeScore";
import { OUTING_TYPES, VIBE_TAGS } from "../data/outingConstants";
import { getEventPolicy } from "../utils/eventPolicy";
import { computeHostScore } from "../utils/hostScore";
import { backfillOutingTitleForHost } from "../utils/outingTitleBackfill";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";

type Route = RouteProp<RootStackParamList, "OutingDetails">;
type Nav = StackNavigationProp<RootStackParamList, "OutingDetails">;

const OutingDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [outing, setOuting] = useState<Outing | null>(null);
  const [status, setStatus] = useState<OutingRequestStatus | null>(null);
  const [vibeMatch, setVibeMatch] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostScore, setHostScore] = useState<number | null>(null); // Phase 2: Host score

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "outings", route.params.outingId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const outingData = { id: snap.id, ...(snap.data() as Outing) };
          
          // Ensure title exists (required for display)
          if (!outingData.title?.trim()) {
            // Backfill: some legacy/overwritten outing docs may have lost `title`.
            // If the host has the title in their indices, restore it on the outing doc.
            if (user?.id && user.id === outingData.hostId) {
              const recoveredTitle = await backfillOutingTitleForHost({
                outingId: route.params.outingId,
                hostId: user.id,
                currentTitle: (outingData as any).title,
              });
              if (recoveredTitle) {
                outingData.title = recoveredTitle;
              }
            }
            // Fallback if recovery fails
            if (!outingData.title?.trim()) {
              outingData.title = "Outing";
            }
          }

          setOuting(outingData);

          if (user) {
            const existing = await outingStorage.getRequestForUser(
              route.params.outingId,
              user.id
            );
            setStatus(existing?.status ?? null);

            if (profile?.vibe_answers && user.id !== outingData.hostId) {
              const hostSnap = await getDoc(doc(db, "users", outingData.hostId));
              if (hostSnap.exists()) {
                const hostProfile = hostSnap.data();
                if (hostProfile?.vibe_answers) {
                  const match = vibeScore(profile.vibe_answers, hostProfile.vibe_answers).score;
                  setVibeMatch(match);
                }
              }
            }

            const memberRef = doc(db, "outings", route.params.outingId, "members", user.id);
            const memberSnap = await getDoc(memberRef);
            setIsMember(memberSnap.exists());

            const membersQuery = query(
              collection(db, "outings", route.params.outingId, "members"),
              where("role", "in", ["member", "host"])
            );
            const membersSnap = await getDocs(membersQuery);
            const memberIds = membersSnap.docs.map((d) => d.id);

            const attendeeProfiles = await Promise.all(
              memberIds.slice(0, 10).map(async (memberId) => {
                try {
                  const userSnap = await getDoc(doc(db, "users", memberId));
                  if (userSnap.exists()) {
                    return {
                      id: memberId,
                      name: userSnap.data().name,
                      photoUrl: userSnap.data().profile_photo_url,
                    };
                  }
                } catch (attendeeError) {
                  logger.error("attendee.load.failed", { memberId, error: attendeeError });
                }
                return null;
              })
            );
            setAttendees(attendeeProfiles.filter(Boolean));

            // Phase 2: Load host score
            if (outingData.hostId) {
              try {
                const hostSnap = await getDoc(doc(db, "users", outingData.hostId));
                if (hostSnap.exists()) {
                  const hostProfile = hostSnap.data();
                  if (hostProfile?.hostScore !== undefined) {
                    setHostScore(hostProfile.hostScore);
                  } else {
                    // Compute if not stored
                    const computed = await computeHostScore(outingData.hostId);
                    setHostScore(computed);
                  }
                }
              } catch (scoreError) {
                logger.error("host.score.load.failed", { error: scoreError, hostId: outingData.hostId });
              }
            }
          }
          setError(null);
        } else {
          setError("Outing not found.");
        }
      } catch (loadError) {
        logger.error("outing.load.failed", { error: loadError });
        setError("Failed to load outing.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, route.params.outingId, profile?.vibe_answers]);

  const handleJoin = async () => {
    if (!user || !outing || !profile) return;

    const isCurated = outing.eventMode === "curated";
    const isFast = outing.eventMode === "fast";
    const spotsLeft = Math.max(outing.maxGuests - (outing.approvedCount ?? 0), 0);
    const isFull = spotsLeft <= 0 || outing.status === "full";

    try {
      // Phase 2: Handle waitlist join when full
      if (isFull) {
        await outingStorage.joinWaitlist(outing.id, user.id, outing.hostId, {
          userName: profile.name,
          userCity: profile.city,
          userPhotoUrl: profile.profile_photo_url,
          vibeMatch: vibeMatch ?? 0,
        });
        setStatus("pending"); // Show as pending when on waitlist
        return;
      }

      if (isCurated) {
        setStatus("pending");

        const hostSnap = await getDoc(doc(db, "users", outing.hostId));
        const hostProfile = hostSnap.exists() ? (hostSnap.data() as any) : null;
        const match = hostProfile?.vibe_answers && profile?.vibe_answers
          ? vibeScore(profile.vibe_answers, hostProfile.vibe_answers).score
          : 0;

        await outingStorage.createRequest(outing.id, user.id, outing.hostId, {
          userName: profile.name ?? "Guest",
          userCity: profile.city ?? "Unknown",
          userPhotoUrl: profile.profile_photo_url ?? null,
          vibeMatch: match,
        });
      } else if (isFast) {
        setIsMember(true);
        setStatus("approved");

        const hostSnap = await getDoc(doc(db, "users", outing.hostId));
        const hostProfile = hostSnap.exists() ? (hostSnap.data() as any) : null;
        const match = hostProfile?.vibe_answers && profile?.vibe_answers
          ? vibeScore(profile.vibe_answers, hostProfile.vibe_answers).score
          : 0;

        await outingStorage.fastJoin(outing.id, user.id, outing.hostId, {
          userName: profile.name ?? "Guest",
          userCity: profile.city ?? "Unknown",
          userPhotoUrl: profile.profile_photo_url ?? null,
          vibeMatch: match,
        });
      }
    } catch (joinError: any) {
      logger.error("outing.join.failed", { error: joinError, eventMode: outing.eventMode });
      if (isCurated) {
        setStatus(null);
      } else {
        setIsMember(false);
        setStatus(null);
      }
    }
  };

  const formatDateTime = (value: any) => {
    if (!value?.toDate) return "Date TBD";
    const date = value.toDate();
    const dateLabel = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeLabel = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dateLabel} · ${timeLabel}`;
  };

  // Phase 4: Share outing
  const handleShareOuting = async () => {
    if (!outing) return;
    try {
      const deepLink = `partizo://outing/${outing.id}`;
      const shareTitle = outing.title?.trim() || "this outing";
      const shareText = `Check out "${shareTitle}" on Partizo!\n${deepLink}`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync({
          message: shareText,
        });
        logger.info("outing.shared", { outingId: outing.id });
      } else {
        // Fallback: copy to clipboard
        Clipboard.setString(shareText);
        Alert.alert("Link copied", "Outing link copied to clipboard");
        logger.info("outing.share.fallback", { outingId: outing.id });
      }
    } catch (error) {
      logger.error("outing.share.failed", { error, outingId: outing.id });
    }
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <View style={styles.skeletonHero}>
          <Skeleton height={260} radius={0} />
        </View>
        <View style={styles.skeletonContent}>
          <Skeleton height={24} width="80%" radius={10} />
          <Skeleton height={16} width="60%" radius={10} />
          <Skeleton height={90} radius={14} />
        </View>
      </Screen>
    );
  }

  if (error || !outing) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        {error ? <InlineError message={error} /> : null}
      </Screen>
    );
  }

  const isHost = user?.id === outing.hostId;

  const policy = outing && user
    ? getEventPolicy({
        outing,
        currentUserId: user.id,
        requestStatus: status,
        isMember,
        isHost,
      })
    : null;

  const spotsLeft = Math.max(outing.maxGuests - (outing.approvedCount ?? 0), 0);
  const canViewAddress = policy?.shouldShowExactAddress ?? false;
  const vibeTags = outing.vibeTagIds
    ? outing.vibeTagIds.map((id) => VIBE_TAGS[id]?.label).filter(Boolean)
    : outing.vibeTags ?? [];
  const rules = outing.rules ?? [];
  const displayTitle = outing.title?.trim() || "Outing";
  const outingTypeLabel = outing.typeId
    ? OUTING_TYPES[outing.typeId]?.label
    : outing.type ?? "Outing";

  const badges = [
    outing.eventMode ? outing.eventMode.toUpperCase() : null,
    status === "approved" ? "APPROVED" : status === "pending" ? "REQUESTED" : null,
    spotsLeft <= 0 ? "FULL" : null,
  ].filter(Boolean) as string[];

  return (
    <Screen contentContainerStyle={styles.screenContent} edges={["left", "right"]} glow={false}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ImageBackground
            source={{ uri: outing.coverImageUrl }}
            style={styles.hero}
          >
            <View style={styles.heroOverlay} />
            <View style={[styles.heroHeader, { paddingTop: insets.top + tokens.spacing.lg }]}>
              <IconButton
                icon={<Ionicons name="arrow-back" size={18} color={tokens.colors.text.secondary} />}
                onPress={() => navigation.goBack()}
              />
              <View style={styles.headerActions}>
                <IconButton
                  icon={<Ionicons name="share-outline" size={18} color={tokens.colors.text.secondary} />}
                  onPress={handleShareOuting}
                />
                <IconButton
                  icon={<Ionicons name="ellipsis-horizontal" size={18} color={tokens.colors.text.secondary} />}
                />
              </View>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.badgeRow}>
                {badges.map((badge) => (
                  <Pill key={badge} label={badge} selected />
                ))}
              </View>
            </View>
          </ImageBackground>

          <View style={styles.content}>
            <Text style={styles.title}>{displayTitle}</Text>
            <View style={styles.typeRow}>
              <Pill label={outingTypeLabel} selected />
              {vibeMatch !== null ? (
                <Pill label={`${vibeMatch}% match`} selected />
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={tokens.colors.text.secondary} />
              <Text style={styles.metaText}>{formatDateTime(outing.dateTime)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={tokens.colors.text.secondary} />
              <Text style={styles.metaText}>
                {outing.location?.name || outing.area}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={16} color={tokens.colors.text.secondary} />
              <Text style={styles.metaText}>{outing.approvedCount} going · {spotsLeft} spots left</Text>
            </View>

            <Text style={styles.sectionLabel}>The vibe</Text>
            <View style={styles.chipRow}>
              {vibeTags.map((tag) => (
                <Pill key={tag} label={tag} />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Rules & intel</Text>
            <View style={styles.chipRow}>
              {rules.map((rule, index) => (
                <Pill key={`${rule}-${index}`} label={rule} />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Who's going</Text>
            <View style={styles.attendeesRow}>
              {attendees.slice(0, 8).map((attendee, index) => (
                <ImageBackground
                  key={attendee.id || index}
                  source={{ uri: attendee.photoUrl || "" }}
                  style={styles.attendeeAvatar}
                  imageStyle={styles.attendeeAvatarStyle}
                >
                  {!attendee.photoUrl && (
                    <View style={styles.attendeeAvatarFallback}>
                      <Text style={styles.attendeeAvatarText}>
                        {attendee.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                </ImageBackground>
              ))}
              {outing.approvedCount > 8 ? (
                <View style={styles.attendeeMore}>
                  <Text style={styles.attendeeMoreText}>+{outing.approvedCount - 8}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>Host</Text>
            <Card
              style={styles.hostCard}
              padding="lg"
              onPress={() =>
                navigation.navigate("Profile", {
                  userId: outing.hostId,
                  context: "people",
                })
              }
            >
              <ImageBackground
                source={{ uri: outing.hostPhotoUrl }}
                style={styles.hostAvatar}
                imageStyle={styles.hostAvatarStyle}
              />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{outing.hostName}</Text>
                <View style={styles.hostMeta}>
                  <Text style={styles.hostTitle}>Host</Text>
                  {hostScore !== null && (
                    <Text style={styles.hostScore}>• {hostScore}/100</Text>
                  )}
                </View>
              </View>
            </Card>

            <Text style={styles.sectionLabel}>Address</Text>
            <Card style={styles.addressCard} padding="lg">
              {canViewAddress && (outing.location?.address || outing.exactAddress) ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location" size={18} color={tokens.colors.text.secondary} />
                  <Text style={styles.addressText}>
                    {outing.location?.address || outing.exactAddress}
                  </Text>
                </View>
              ) : (
                <View style={styles.addressLocked}>
                  <Ionicons name="lock-closed" size={18} color={tokens.colors.text.subtle} />
                  <Text style={styles.addressLockedText}>Reveals 60m before</Text>
                </View>
              )}
            </Card>

            {/* Phase 2: RSVP Reminders + Calendar Add */}
            {isMember && !isHost && outing.dateTime && (
              <Card style={styles.reminderCard} padding="lg">
                <View style={styles.reminderRow}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.colors.primary.solid} />
                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTitle}>Add to Calendar</Text>
                    <Text style={styles.reminderSubtitle}>Get notified 24h before</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reminderButton}
                    onPress={() => {
                      // Phase 2: Calendar add stub (would use expo-calendar or similar)
                      logger.info("outing.calendar.add", { outingId: outing.id });
                      // TODO: Implement actual calendar integration
                    }}
                  >
                    <Text style={styles.reminderButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>

        {policy ? (
          <View style={[styles.ctaBar, { paddingBottom: insets.bottom + tokens.spacing.lg }]}>
            <View style={styles.ctaContent}>
              {policy.showRequestStatus && policy.requestStatusLabel ? (
                <Pill label={policy.requestStatusLabel} selected />
              ) : null}
              <PrimaryButton
                label={policy.ctaLabel}
                onPress={() => {
                  if (policy.primaryCTA === "OpenChat") {
                    navigation.navigate("ChatThread", { outingId: outing.id });
                  } else if (policy.primaryCTA === "Request" || policy.primaryCTA === "JoinNow") {
                    handleJoin();
                  }
                }}
                disabled={!policy.ctaEnabled}
                style={styles.ctaButton}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  hero: {
    height: 300,
    justifyContent: "space-between",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.colors.overlay.strong,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.xl,
  },
  headerActions: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  heroBottom: {
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  content: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl + 96,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h2,
    marginBottom: tokens.spacing.sm,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
    ...typography.caption,
  },
  sectionLabel: {
    color: colors.textSubtle,
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  attendeesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  attendeeAvatarStyle: {
    borderRadius: 20,
  },
  attendeeAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface3,
  },
  attendeeAvatarText: {
    color: colors.textPrimary,
    ...typography.body2,
    fontWeight: "600",
  },
  attendeeMore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendeeMoreText: {
    color: colors.textSecondary,
    ...typography.micro,
  },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  hostAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  hostAvatarStyle: {
    borderRadius: 26,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  hostMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  hostTitle: {
    color: colors.textMuted,
    ...typography.body2,
  },
  hostScore: {
    color: colors.primary,
    ...typography.body2,
    fontWeight: "600",
  },
  addressCard: {
    marginBottom: tokens.spacing.xl,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  addressText: {
    color: colors.textPrimary,
    ...typography.body2,
    flex: 1,
  },
  addressLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  addressLockedText: {
    color: colors.textSubtle,
    ...typography.body2,
  },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgGlass,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.sm,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  ctaButton: {
    flex: 1,
  },
  skeletonHero: {
    height: 260,
  },
  skeletonContent: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  // Phase 2: RSVP Reminder styles
  reminderCard: {
    marginTop: tokens.spacing.lg,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  reminderSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: tokens.spacing.sm / 2,
  },
  reminderButton: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  reminderButtonText: {
    color: colors.textPrimary,
    ...typography.body2,
    fontWeight: "600",
  },
});

export default OutingDetailsScreen;
