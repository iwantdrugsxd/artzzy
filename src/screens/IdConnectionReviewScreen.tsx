import React, { useEffect, useState } from "react";
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
import { IdConnectionRequest } from "../utils/idConnectionStorage";
import { idConnectionStorage } from "../utils/idConnectionStorage";
import { haptics } from "../utils/haptics";

const routeKey: keyof RootStackParamList = "IdConnectionReview";

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
  quick_badges?: string[];
  prompts?: any[];
};

const IdConnectionReviewScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [request, setRequest] = useState<IdConnectionRequest | null>(null);
  const [otherProfile, setOtherProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const requestRef = doc(db, "idConnectionRequests", route.params.requestId);
        const snap = await getDoc(requestRef);
        if (!snap.exists()) {
          setError("Request not found.");
          setLoading(false);
          return;
        }
        const data = { ...(snap.data() as IdConnectionRequest), id: snap.id };
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

  const age = otherProfile ? getAge(otherProfile.birthdate) : null;
  const photos = otherProfile?.profilePhotoUrls || (otherProfile?.profile_photo_url ? [otherProfile.profile_photo_url] : []);
  const photo = otherProfile?.profile_photo_url || "";
  const bio = otherProfile?.bio || "";

  const handleAccept = async () => {
    if (!user || !request) return;
    if (processing) return;
    setProcessing(true);
    try {
      haptics.medium();
      const result = await idConnectionStorage.acceptIdConnectionRequest({
        requestId: request.id || route.params.requestId,
        toUid: user.id,
      });
      if (result.success) {
        navigation.navigate("Connections");
      } else {
        Alert.alert("Couldn't accept", result.error || "Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Couldn't accept", err?.message || "Please try again.");
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
      const result = await idConnectionStorage.rejectIdConnectionRequest({
        requestId: request.id || route.params.requestId,
        toUid: user.id,
      });
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert("Couldn't update", result.error || "Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Couldn't update", err?.message || "Please try again.");
    } finally {
      setProcessing(false);
    }
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
      <ScreenHeader title="Connection Request" />
      {error ? <InlineError message={error} /> : null}

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
            score={0}
            tags={[]}
            showDetails={false}
            vibeHighlights={[]}
            memberSince={undefined}
            quickBadges={otherProfile.quick_badges}
            prompts={otherProfile.prompts}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + layout.section }]}>
        <View style={styles.actions}>
          <SecondaryButton
            label="Decline"
            onPress={handleReject}
            disabled={processing || request.status !== "pending"}
            style={styles.actionButton}
          />
          <PrimaryButton
            label="Accept"
            onPress={handleAccept}
            loading={processing}
            disabled={processing || request.status !== "pending"}
            style={styles.actionButton}
          />
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
});

export default IdConnectionReviewScreen;
