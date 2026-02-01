import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import PhotoCarousel from "../components/PhotoCarousel";
import Pill from "../components/Pill";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import EmptyState from "../components/EmptyState";
import { db } from "../firebaseApp";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";

type Route = RouteProp<RootStackParamList, "UserProfile">;
type Nav = StackNavigationProp<RootStackParamList, "UserProfile">;

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
  connectionsCount?: number;
  vibe_answers?: Record<string, string>;
};

const UserProfileScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"connect" | "requested" | "connected">("connect");

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "users", route.params.userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPublicProfile({ ...(snap.data() as PublicProfile) });
        }
      } catch (error) {
        logger.error("user.profile.load.failed", { error });
      }
    };
    load();
  }, [route.params.userId]);

  useEffect(() => {
    const checkConnection = async () => {
      if (!user || !publicProfile) return;
      try {
        const direct = await getDoc(doc(db, "connections", `${user.id}_${publicProfile.user_id}`));
        const reverse = await getDoc(doc(db, "connections", `${publicProfile.user_id}_${user.id}`));
        if (direct.exists() || reverse.exists()) {
          setStatus("connected");
        }
      } catch {
        // ignore
      }
    };
    checkConnection();
  }, [user, publicProfile]);

  if (!publicProfile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState title="Profile unavailable" />
      </Screen>
    );
  }

  const photos =
    publicProfile.profilePhotoUrls && publicProfile.profilePhotoUrls.length > 0
      ? publicProfile.profilePhotoUrls
      : publicProfile.primaryPhotoUrl
        ? [publicProfile.primaryPhotoUrl]
        : publicProfile.profile_photo_url
          ? [publicProfile.profile_photo_url]
          : [];

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = getAge(publicProfile.birthdate);
  const location = [publicProfile.city].filter(Boolean).join(" • ");

  const interests = publicProfile.interests || [];
  const vibeAnswers = publicProfile.vibe_answers || {};

  const topVibes = Object.entries(vibeAnswers)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`);

  const isSelf = user?.id === publicProfile.user_id;

  const handleConnect = async () => {
    if (!user || isSelf) return;
    try {
      setStatus("requested");
      await setDoc(doc(db, "connections", `${user.id}_${publicProfile.user_id}`), {
        fromUserId: user.id,
        toUserId: publicProfile.user_id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.id), {
        connectionsCount: increment(1),
        updatedAt: serverTimestamp(),
      }).catch(() => null);
      setStatus("connected");
    } catch (error) {
      logger.error("user.connect.failed", { error });
      setStatus("connect");
    }
  };

  const handleOpenChat = () => {
    navigation.navigate("Home" as any, { screen: "Chat" });
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" />
      <PhotoCarousel photos={photos} fullBleed containerStyle={styles.carousel} />
      <View style={styles.header}>
        <Text style={styles.name}>
          {publicProfile.name}
          {age ? `, ${age}` : ""}
        </Text>
        {!!location && <Text style={styles.location}>{location}</Text>}
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Connections</Text>
          <Text style={styles.statValue}>{publicProfile.connectionsCount ?? 0}</Text>
        </Card>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Events</Text>
          <Text style={styles.statValue}>0</Text>
        </Card>
      </View>

      {!isSelf ? (
        status === "connected" ? (
          <SecondaryButton label="Connected" onPress={handleOpenChat} style={styles.cta} />
        ) : (
          <PrimaryButton
            label={status === "requested" ? "Requested" : "Connect"}
            onPress={handleConnect}
            disabled={status === "requested"}
            style={styles.cta}
          />
        )
      ) : (
        <Text style={styles.selfNote}>You’re viewing your public profile preview.</Text>
      )}

      {publicProfile.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.sectionText}>{publicProfile.bio}</Text>
        </View>
      ) : null}

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

      {topVibes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vibe Highlights</Text>
          {topVibes.map((vibe) => (
            <Text key={vibe} style={styles.sectionText}>
              • {vibe}
            </Text>
          ))}
        </View>
      ) : null}
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
  carousel: {
    marginHorizontal: -layout.gutter,
    marginBottom: layout.section,
  },
  header: {
    paddingHorizontal: layout.gutter,
    marginBottom: layout.section,
  },
  name: {
    color: colors.textPrimary,
    ...typography.h2,
  },
  location: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
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
    ...typography.h3,
    marginTop: layout.compact,
  },
  section: {
    paddingHorizontal: layout.gutter,
    marginTop: layout.section,
  },
  sectionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.compact,
  },
  sectionText: {
    color: colors.textMuted,
    ...typography.body2,
    lineHeight: 20,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.compact,
  },
  cta: {
    marginHorizontal: layout.gutter,
    marginBottom: layout.section,
  },
  selfNote: {
    color: colors.textSubtle,
    ...typography.micro,
    textAlign: "center",
    marginBottom: layout.section,
  },
});

export default UserProfileScreen;
