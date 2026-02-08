import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, spacing, radius, shadows } from "../theme";
import Screen from "../components/Screen";
import Skeleton from "../components/Skeleton";
import InlineError from "../components/InlineError";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { outingStorage } from "../utils/outingStorage";
import { logger } from "../utils/logger";
import { vibeScore } from "../utils/vibeScore";
import { VIBE_TAGS } from "../data/outingConstants";
import { vibeQuestions } from "../data/vibeQuestions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Route = RouteProp<RootStackParamList, "HostViewProfile">;
type Nav = StackNavigationProp<RootStackParamList, "HostViewProfile">;

type UserProfile = {
  id: string;
  name: string;
  profile_photo_url?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  vibe_answers?: Record<string, string>;
  birthdate?: string;
  gender?: string;
};

const HostViewProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vibeMatch, setVibeMatch] = useState<number | null>(null);
  const [mutualVibes, setMutualVibes] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const { userId, outingId } = route.params;

  useEffect(() => {
    const load = async () => {
      if (!user || !profile) return;
      
      try {
        // Load user profile
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) {
          setError("Profile not found.");
          setLoading(false);
          return;
        }
        
        const userData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
        setUserProfile(userData);
        
        // Compute vibe match
        if (profile.vibe_answers && userData.vibe_answers) {
          const matchResult = vibeScore(profile.vibe_answers, userData.vibe_answers);
          setVibeMatch(matchResult.score);
          
          // Find mutual vibes
          const mutual: string[] = [];
          Object.keys(profile.vibe_answers).forEach((key) => {
            if (
              profile.vibe_answers[key] &&
              userData.vibe_answers[key] &&
              profile.vibe_answers[key] === userData.vibe_answers[key]
            ) {
              mutual.push(key);
            }
          });
          setMutualVibes(mutual);
        }
      } catch (error) {
        logger.error("host.profile.load.failed", { error, userId });
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [userId, user, profile]);

  const handleApprove = async () => {
    if (!user || !outingId || processing) return;
    setProcessing(true);
    try {
      // Get outing details
      const outingSnap = await getDoc(doc(db, "outings", outingId));
      if (!outingSnap.exists()) return;
      
      const outingData = outingSnap.data();
      // Sanitize outing meta: convert undefined to null (Firestore-safe)
      const outingMeta = {
        outingId,
        title: outingData.title ?? null,
        coverImageUrl: outingData.coverImageUrl ?? null,
        dateTime: outingData.dateTime ?? null,
        area: outingData.area ?? null,
      };
      await outingStorage.approveRequest(outingId, userId, user.id, outingMeta);
      
      navigation.goBack();
    } catch (error) {
      logger.error("host.approve.failed", { error });
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!outingId || processing) return;
    setProcessing(true);
    try {
      await outingStorage.declineRequest(outingId, userId);
      navigation.goBack();
    } catch (error) {
      logger.error("host.decline.failed", { error });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.loadingContainer}>
        <Skeleton height={280} radius={radius.card} style={styles.loadingHero} />
        <Skeleton height={18} width="60%" radius={8} />
        <Skeleton height={14} width="80%" radius={8} />
      </Screen>
    );
  }

  if (error || !userProfile) {
    return (
      <Screen contentContainerStyle={styles.loadingContainer}>
        {error ? <InlineError message={error} /> : null}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const interests = userProfile.interests || [];
  const vibeAnswers = userProfile.vibe_answers || {};

  // Calculate age from birthdate
  const getAge = () => {
    if (!userProfile.birthdate) return null;
    const birthDate = new Date(userProfile.birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge();
  const locationText = [userProfile.city, age && `${age}`].filter(Boolean).join(" • ");

  return (
    <Screen contentContainerStyle={styles.screenContent} edges={["left", "right"]} glow={false}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Photo */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: userProfile.profile_photo_url || "" }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            {!userProfile.profile_photo_url && (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackText}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Gradient overlay */}
            <View style={styles.heroOverlay} />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing(1) }]}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerSpacer} />
            </View>

            {/* Name & Location Overlay */}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{userProfile.name}</Text>
              {locationText && <Text style={styles.heroLocation}>{locationText}</Text>}
            </View>
          </ImageBackground>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Vibe Match Badge */}
          {vibeMatch !== null && (
            <View style={styles.matchBadge}>
              <View style={styles.matchBadgeContent}>
                <Ionicons name="heart" size={20} color={colors.primarySoft} />
                <Text style={styles.matchBadgeText}>{vibeMatch}% Vibe Match</Text>
              </View>
            </View>
          )}

          {/* Bio */}
          {userProfile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{userProfile.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.chipContainer}>
                {interests.map((interest, index) => (
                  <View key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Vibe Answers */}
          {Object.keys(vibeAnswers).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vibe Identity</Text>
              {vibeQuestions.map((question) => {
                const answer = vibeAnswers[question.key];
                if (!answer) return null;
                
                const option = question.options.find((opt) => opt.value === answer);
                const isMutual = mutualVibes.includes(question.key);
                
                return (
                  <View key={question.key} style={styles.vibeCard}>
                    <View style={styles.vibeHeader}>
                      <Text style={styles.vibeQuestion}>{question.title}</Text>
                      {isMutual && (
                        <View style={styles.mutualBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primarySoft} />
                          <Text style={styles.mutualBadgeText}>Match</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vibeAnswer}>
                      {option?.label || answer}
                    </Text>
                    {option?.subtitle && (
                      <Text style={styles.vibeSubtitle}>{option.subtitle}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Mutual Vibes Summary */}
          {mutualVibes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.mutualSummaryCard}>
                <Ionicons name="sparkles" size={24} color={colors.primarySoft} />
                <Text style={styles.mutualSummaryTitle}>
                  You have {mutualVibes.length} mutual vibe{mutualVibes.length !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.mutualSummaryText}>
                  This person shares similar energy and preferences with you.
                </Text>
              </View>
            </View>
          )}

          {/* Bottom spacing for buttons */}
          <View style={{ height: spacing(10) }} />
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Bottom */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing(2) }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={handleDecline}
          disabled={processing}
        >
          <Ionicons name="close" size={28} color={colors.danger} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Ionicons name="checkmark" size={28} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing(2),
  },
  loadingHero: {
    width: "100%",
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(4),
    gap: spacing(2),
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.button,
  },
  backButtonText: {
    color: colors.primarySoft,
    fontWeight: "600",
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  heroImageStyle: {
    resizeMode: "cover",
  },
  heroFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  heroFallbackText: {
    fontSize: 120,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySoft,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    flex: 1,
  },
  heroInfo: {
    padding: spacing(3),
    paddingBottom: spacing(4),
  },
  heroName: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "700",
    marginBottom: spacing(0.5),
    textShadowColor: colors.shadowText,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroLocation: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "500",
    textShadowColor: colors.shadowText,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  content: {
    padding: spacing(3),
  },
  matchBadge: {
    marginTop: -spacing(4),
    marginBottom: spacing(3),
    alignItems: "center",
  },
  matchBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    ...shadows.floating,
  },
  matchBadgeText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginBottom: spacing(4),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(2),
  },
  bioText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.5),
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  vibeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(2.5),
    marginBottom: spacing(2),
    borderLeftWidth: 3,
    borderLeftColor: colors.primarySoft,
  },
  vibeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(1),
  },
  vibeQuestion: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  mutualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill,
  },
  mutualBadgeText: {
    color: colors.primarySoft,
    fontSize: 11,
    fontWeight: "600",
  },
  vibeAnswer: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing(0.5),
  },
  vibeSubtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: spacing(0.5),
    fontStyle: "italic",
  },
  mutualSummaryCard: {
    backgroundColor: colors.primary + "15",
    borderRadius: radius.card,
    padding: spacing(3),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  mutualSummaryTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing(1),
    textAlign: "center",
  },
  mutualSummaryText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing(0.5),
    textAlign: "center",
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.floating,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.floating,
  },
  declineButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger + "40",
  },
  approveButton: {
    backgroundColor: colors.primarySoft,
  },
});

export default HostViewProfileScreen;
