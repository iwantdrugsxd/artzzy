import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import ProfileCard from "../components/ProfileCard";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import EmptyState from "../components/EmptyState";
import InlineError from "../components/InlineError";
import { db } from "../firebaseApp";
import { useAuth } from "../context/AuthContext";
import { ConnectionRequest } from "../types/connection";
import { connectionStorage } from "../utils/connectionStorage";
import { vibeScore } from "../utils/vibeScore";
import { vibeQuestions } from "../data/vibeQuestions";
import { haptics } from "../utils/haptics";

const routeKey: keyof RootStackParamList = "ConnectionReview";

type Route = RouteProp<RootStackParamList, typeof routeKey>;

type Nav = StackNavigationProp<RootStackParamList, typeof routeKey>;

type PublicProfile = {
  user_id: string;
  name: string;
  birthdate?: string;
  city?: string;
  bio?: string;
  interests?: string[];
  profile_photo_url?: string;
  profilePhotoUrls?: string[];
  primaryPhotoUrl?: string;
  vibe_answers?: Record<string, string>;
};

const ConnectionReviewScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [request, setRequest] = useState<ConnectionRequest | null>(null);
  const [otherProfile, setOtherProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const requestRef = doc(db, "connectionRequests", route.params.requestId);
        const snap = await getDoc(requestRef);
        if (!snap.exists()) {
          setError("Request not found.");
          setLoading(false);
          return;
        }
        const data = { ...(snap.data() as ConnectionRequest), id: snap.id };
        setRequest(data);

        const otherUid = data.fromUid;
        const profileSnap = await getDoc(doc(db, "users", otherUid));
        if (profileSnap.exists()) {
          setOtherProfile(profileSnap.data() as PublicProfile);
        }
      } catch (loadError) {
        setError("Failed to load request.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params.requestId]);

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const match = useMemo(() => {
    if (!profile || !otherProfile) {
      return { score: request?.vibeScore || 0, tags: [] };
    }
    return vibeScore(profile.vibe_answers || {}, otherProfile.vibe_answers || {});
  }, [profile, otherProfile, request]);

  const vibeHighlights = useMemo(() => {
    if (!otherProfile?.vibe_answers) return [];
    const entries = Object.entries(otherProfile.vibe_answers);
    if (!entries.length) return [];

    const byKey: Record<string, string> = {};
    vibeQuestions.forEach((q) => {
      const answer = otherProfile.vibe_answers[q.key];
      if (!answer) return;
      const opt = q.options.find((o) => o.value === answer);
      if (opt) {
        byKey[q.key] = `${q.title}: ${opt.label}`;
      } else {
        byKey[q.key] = `${q.title}: ${answer}`;
      }
    });

    return Object.values(byKey).slice(0, 3);
  }, [otherProfile]);

  const age = otherProfile ? getAge(otherProfile.birthdate) : null;
  const photos = otherProfile?.profilePhotoUrls || (otherProfile?.profile_photo_url ? [otherProfile.profile_photo_url] : []);
  const photo = otherProfile?.profile_photo_url || "";
  const bio = otherProfile?.bio || "";

  const isExpired = request?.expiresAt?.toDate
    ? request.expiresAt.toDate().getTime() < Date.now()
    : false;

  const handleAccept = async () => {
    if (!user || !profile || !request) return;
    if (processing) return;
    setProcessing(true);
    try {
      const canOpen = await connectionStorage.canOpenChat(user.id, profile);
      if (!canOpen) {
        Alert.alert("Chat limit reached", "Upgrade to open more chats.");
        setProcessing(false);
        return;
      }
      haptics.medium();
      const result = await connectionStorage.acceptVibe({
        requestId: request.id || route.params.requestId,
        toUid: user.id,
        profile,
      });
      navigation.replace("DirectChat", {
        chatId: result.chatId,
        otherUid: request.fromUid,
      });
    } catch {
      Alert.alert("Couldn’t accept", "Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !request) return;
    if (processing) return;
    setProcessing(true);
    try {
      haptics.light();
      await connectionStorage.rejectVibe({
        requestId: request.id || route.params.requestId,
        toUid: user.id,
      });
      navigation.goBack();
    } catch {
      Alert.alert("Couldn’t update", "Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleBlock = async () => {
    if (!user || !request) return;
    Alert.alert("Block user?", "They won’t be able to send you vibes.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          await connectionStorage.blockUser({
            blockerUid: user.id,
            blockedUid: request.fromUid,
            reason: "unsafe",
          });
          navigation.goBack();
        },
      },
    ]);
  };

  const handleReport = async () => {
    if (!user || !request) return;
    Alert.alert("Report user", "Tell us what happened.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await connectionStorage.reportUser({
            reporterUid: user.id,
            reportedUid: request.fromUid,
            reason: "inappropriate",
            context: "connection_review",
          });
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.loadingText}>Loading…</Text>
      </Screen>
    );
  }

  if (!request || !otherProfile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState title="Request unavailable" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentContainerStyle={styles.container}>
      <ScreenHeader title="Review Vibe" />
      {error ? <InlineError message={error} /> : null}

      {isExpired ? (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>This request has expired.</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + layout.section * 8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrap}>
          <ProfileCard
            name={otherProfile.name}
            age={age}
            city={otherProfile.city}
            country={undefined}
            bio={bio}
            photo={photo}
            photos={photos}
            interests={otherProfile.interests || []}
            score={match.score}
            tags={match.tags}
            showDetails
            vibeHighlights={vibeHighlights}
            memberSince={undefined}
            quickBadges={otherProfile.quick_badges}
            prompts={otherProfile.prompts}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + layout.section }]}>
        <View style={styles.actions}>
          <SecondaryButton
            label="Pass"
            onPress={handleReject}
            disabled={processing || isExpired}
            style={styles.actionButton}
          />
          <PrimaryButton
            label="Accept Vibe"
            onPress={handleAccept}
            loading={processing}
            disabled={processing || isExpired}
            style={styles.actionButton}
          />
        </View>
        <View style={styles.safetyRow}>
          <Pressable onPress={handleReport} style={styles.safetyButton}>
            <Text style={styles.safetyText}>Report</Text>
          </Pressable>
          <Pressable onPress={handleBlock} style={styles.safetyButton}>
            <Text style={styles.safetyText}>Block</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    color: colors.textSecondary,
    ...typography.body2,
  },
  scrollContent: {
    paddingBottom: layout.section,
  },
  cardWrap: {
    alignItems: "center",
    paddingTop: layout.section,
  },
  expiredBanner: {
    marginHorizontal: layout.gutter,
    marginTop: layout.section,
    padding: layout.section,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    marginBottom: layout.section,
  },
  expiredText: {
    color: colors.textSecondary,
    ...typography.body2,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: layout.section,
    backgroundColor: colors.bg,
  },
  actions: {
    flexDirection: "row",
    gap: layout.section,
    paddingHorizontal: layout.gutter,
    marginBottom: layout.compact,
  },
  actionButton: {
    flex: 1,
  },
  safetyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: layout.section,
    paddingBottom: layout.section,
  },
  safetyButton: {
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
  },
  safetyText: {
    color: colors.textSubtle,
    ...typography.micro,
  },
});

export default ConnectionReviewScreen;
