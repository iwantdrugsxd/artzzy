import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { collection, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, shadows, tokens, typography } from "../theme";
import Screen from "../components/Screen";
import PhotoCarousel from "../components/PhotoCarousel";
import Card from "../components/Card";
import Pill from "../components/Pill";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { outingStorage } from "../utils/outingStorage";
import { logger } from "../utils/logger";
import { haptics } from "../utils/haptics";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type RouteParams = RouteProp<RootStackParamList, "Profile">;
type Nav = StackNavigationProp<RootStackParamList, "Profile">;

type PublicProfile = {
  user_id: string;
  name: string;
  birthdate?: string;
  city?: string;
  country?: string;
  bio?: string;
  interests?: string[];
  profile_photo_url?: string;
  profilePhotoUrls?: string[];
  primaryPhotoUrl?: string;
  connectionsCount?: number;
  vibe_answers?: Record<string, string>;
};

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { user, profile } = useAuth();

  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);

  const context: "people" | "host_request" =
    route.params.context === "host_request" ? "host_request" : "people";

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "users", route.params.userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setPublicProfile(null);
        } else {
          setPublicProfile(snap.data() as PublicProfile);
        }

        // Load events count from pastOutings
        try {
          const pastOutingsSnap = await getDocs(
            collection(db, "users", route.params.userId, "pastOutings")
          );
          setEventsCount(pastOutingsSnap.size);
        } catch {
          setEventsCount(0);
        }
      } catch (error) {
        logger.error("profile.load.failed", { error, userId: route.params.userId });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params.userId]);

  const photos = useMemo(() => {
    if (!publicProfile) return [];
    if (publicProfile.profilePhotoUrls && publicProfile.profilePhotoUrls.length > 0) {
      return publicProfile.profilePhotoUrls;
    }
    if (publicProfile.primaryPhotoUrl) return [publicProfile.primaryPhotoUrl];
    if (publicProfile.profile_photo_url) return [publicProfile.profile_photo_url];
    return [];
  }, [publicProfile]);

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = publicProfile ? getAge(publicProfile.birthdate) : null;
  const interests = publicProfile?.interests || [];
  const vibeAnswers = publicProfile?.vibe_answers || {};

  const topVibes = Object.entries(vibeAnswers)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`);

  const isSelf = user && publicProfile && user.id === publicProfile.user_id;

  const handleConnect = async () => {
    if (!user || !publicProfile || isSelf || processing) return;
    haptics.medium();
    setProcessing(true);
    try {
      await setDoc(doc(db, "connections", `${user.id}_${publicProfile.user_id}`), {
        fromUserId: user.id,
        toUserId: publicProfile.user_id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.id), {
        connectionsCount: increment(1),
        updatedAt: serverTimestamp(),
      }).catch(() => null);
    } catch (error) {
      logger.error("profile.connect.failed", { error });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !route.params.outingId || processing || !publicProfile) return;
    setProcessing(true);
    try {
      const outingSnap = await getDoc(doc(db, "outings", route.params.outingId));
      if (!outingSnap.exists()) return;
      const outingData = outingSnap.data();
      // Sanitize outing meta: convert undefined to null (Firestore-safe)
      const outingMeta = {
        outingId: route.params.outingId,
        title: outingData.title ?? null,
        coverImageUrl: outingData.coverImageUrl ?? null,
        dateTime: outingData.dateTime ?? null,
        area: outingData.area ?? null,
      };
      await outingStorage.approveRequest(route.params.outingId, route.params.userId, user.id, outingMeta);
      navigation.goBack();
    } catch (error) {
      logger.error("profile.host.approve.failed", { error });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!route.params.outingId || processing) return;
    setProcessing(true);
    try {
      await outingStorage.declineRequest(route.params.outingId, route.params.userId);
      navigation.goBack();
    } catch (error) {
      logger.error("profile.host.decline.failed", { error });
    } finally {
      setProcessing(false);
    }
  };

  // Phase 4: Share profile
  const handleShareProfile = async () => {
    if (!publicProfile) return;
    try {
      const deepLink = `partizo://profile/${publicProfile.user_id}`;
      const shareText = `Check out ${publicProfile.name}'s profile on Partizo!\n${deepLink}`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync({
          message: shareText,
        });
        logger.info("profile.shared", { userId: publicProfile.user_id });
      } else {
        // Fallback: copy to clipboard
        Clipboard.setString(shareText);
        Alert.alert("Link copied", "Profile link copied to clipboard");
        logger.info("profile.share.fallback", { userId: publicProfile.user_id });
      }
    } catch (error) {
      logger.error("profile.share.failed", { error, userId: publicProfile.user_id });
    }
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (!publicProfile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState title="Profile unavailable" />
      </Screen>
    );
  }

  const cityLine = [publicProfile.city, publicProfile.country || "India"]
    .filter(Boolean)
    .join(" • ");

  return (
    <Screen contentContainerStyle={styles.container} edges={[]}>
      {/* Background glow circles */}
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, styles.glowCircle1]} />
        <View style={[styles.glowCircle, styles.glowCircle2]} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero / carousel - full bleed */}
        <View style={styles.heroWrap}>
          <PhotoCarousel 
            photos={photos} 
            fullBleed 
            height={SCREEN_WIDTH * 1.2}
            containerStyle={styles.carousel} 
          />
          
          {/* Back button and share button */}
          <View style={[styles.headerRow, { top: insets.top + layout.section }]}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                haptics.light();
                navigation.goBack();
              }}
            >
              <View style={styles.backButtonBlur}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </View>
            </Pressable>
            {/* Phase 4: Share profile button */}
            {!isSelf && (
              <Pressable
                style={styles.shareButton}
                onPress={handleShareProfile}
              >
                <View style={styles.backButtonBlur}>
                  <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {/* Name + city */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {publicProfile.name}
              {age ? `, ${age}` : ""}
            </Text>
            {/* Phase 1: Verification badge */}
            {(publicProfile as any).isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {!!cityLine && <Text style={styles.city}>{cityLine}</Text>}
          {/* Phase 1: Height, work, education */}
          {(publicProfile as any).height && (
            <Text style={styles.workEducation}>{(publicProfile as any).height}</Text>
          )}
          {(publicProfile as any).work && (
            <Text style={styles.workEducation}>{(publicProfile as any).work}</Text>
          )}
          {(publicProfile as any).education && (
            <Text style={styles.workEducation}>{(publicProfile as any).education}</Text>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Connections</Text>
              <Text style={styles.statValue}>{publicProfile.connectionsCount ?? 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Events</Text>
              <Text style={styles.statValue}>{eventsCount}</Text>
            </View>
          </View>

          {/* CTA */}
          {context === "host_request" ? (
            <View style={styles.hostCtaRow}>
              <SecondaryButton
                label="Decline"
                onPress={handleDecline}
                disabled={processing}
                style={styles.hostCta}
              />
              <PrimaryButton
                label="Approve"
                onPress={handleApprove}
                loading={processing}
                disabled={processing}
                style={styles.hostCta}
              />
            </View>
          ) : !isSelf ? (
            <Pressable
              style={({ pressed }) => [
                styles.connectButton,
                pressed && styles.connectButtonPressed,
                processing && styles.connectButtonDisabled,
              ]}
              onPress={handleConnect}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </Pressable>
          ) : null}

          {/* Bio */}
          {publicProfile.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.sectionText}>{publicProfile.bio}</Text>
            </View>
          ) : null}

          {/* Interests */}
          {interests.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.chips}>
                {interests.map((interest) => (
                  <Pill key={interest} label={interest} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Vibe highlights */}
          {topVibes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vibe Highlights</Text>
              {topVibes.map((v) => (
                <Text key={v} style={styles.sectionText}>
                  • {v}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: layout.major * 2,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowCircle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.15,
  },
  glowCircle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.primary,
    top: -100,
    right: -100,
  },
  glowCircle2: {
    width: 250,
    height: 250,
    backgroundColor: tokens.colors.bg.base,
    bottom: -50,
    left: -50,
  },
  heroWrap: {
    position: "relative",
    width: SCREEN_WIDTH,
    marginBottom: layout.major,
  },
  carousel: {
    width: SCREEN_WIDTH,
  },
  backButton: {
    position: "absolute",
    left: layout.gutter,
    zIndex: 10,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  body: {
    paddingHorizontal: layout.gutter,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.compact,
    marginBottom: layout.compact,
  },
  name: {
    color: colors.textPrimary,
    ...typography.h1, // H1 for prominence
  },
  // Phase 1: Verification badge
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: layout.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  verifiedText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  workEducation: {
    color: colors.textMuted,
    ...typography.body2,
    fontSize: 14,
    marginBottom: layout.compact / 2,
  },
  city: {
    color: colors.textMuted,
    ...typography.caption, // Caption for subtlety
    marginBottom: layout.major,
  },
  statsRow: {
    flexDirection: "row",
    gap: layout.section,
    marginBottom: layout.major,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: layout.section,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  statLabel: {
    color: colors.textMuted,
    ...typography.micro,
    marginBottom: layout.compact,
  },
  statValue: {
    color: colors.textPrimary,
    ...typography.h3,
    fontWeight: "700",
  },
  connectButton: {
    backgroundColor: colors.primary,
    height: 56, // Production standard height
    borderRadius: 22, // Premium rounded corners
    alignItems: "center",
    justifyContent: "center",
    marginBottom: layout.major,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  connectButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "700",
    fontSize: 16,
  },
  mainCta: {
    marginBottom: layout.major,
    height: 56,
    borderRadius: 22,
  },
  hostCtaRow: {
    flexDirection: "row",
    gap: layout.section,
    marginBottom: layout.major,
  },
  hostCta: {
    flex: 1,
    height: 56,
    borderRadius: 22,
  },
  section: {
    marginBottom: layout.major,
  },
  sectionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.section,
    fontWeight: "700",
  },
  sectionText: {
    color: colors.textMuted,
    ...typography.body2,
    lineHeight: 22,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.compact,
  },
});

export default ProfileScreen;
