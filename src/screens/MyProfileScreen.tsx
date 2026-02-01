import React from "react";
import { StyleSheet, Text, View, Image, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import SecondaryButton from "../components/SecondaryButton";
import DestructiveButton from "../components/DestructiveButton";
import Card from "../components/Card";
import Pill from "../components/Pill";
import PhotoCarousel from "../components/PhotoCarousel";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../types/navigation";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseApp";

type Nav = StackNavigationProp<RootStackParamList, "MyProfile">;

const MyProfileScreen: React.FC = () => {
  const { profile, signOut, user, refreshProfile } = useAuth();
  const navigation = useNavigation<Nav>();

  const [pastOutings, setPastOutings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hostedOutings, setHostedOutings] = React.useState<any[]>([]);
  const [hostedLoading, setHostedLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"vibe" | "parties">("vibe");

  // Refresh profile when screen is focused (e.g., after returning from edit/onboarding)
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (user) {
        refreshProfile();
      }
    });
    return unsubscribe;
  }, [navigation, user, refreshProfile]);

  React.useEffect(() => {
    const loadPastOutings = async () => {
      try {
        if (!user) return;
        const snap = await getDocs(
          collection(db, "users", user.id, "pastOutings")
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setPastOutings(items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadPastOutings();
  }, [user]);

  // Subscribe to hosted outings index for "Your Parties"
  React.useEffect(() => {
    if (!user) return;
    const ref = query(
      collection(db, "users", user.id, "hostedOutings"),
      orderBy("dateTime", "desc")
    );
    const unsub = onSnapshot(ref, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setHostedOutings(items);
      setHostedLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!profile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <EmptyState title="Profile unavailable" />
      </Screen>
    );
  }

  const photos =
    profile.profilePhotoUrls && profile.profilePhotoUrls.length > 0
      ? profile.profilePhotoUrls
      : profile.profile_photo_url
        ? [profile.profile_photo_url]
        : [];
  const hostedCount = hostedOutings.length;

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="My Profile" />
      <PhotoCarousel
        photos={photos}
        fullBleed
        containerStyle={styles.carousel}
      />
      <View style={styles.manageRow}>
        <SecondaryButton
          label="Manage photos"
          onPress={() => navigation.navigate("ManagePhotos")}
          style={styles.manageButton}
        />
      </View>
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.subtitle}>
        {profile.city}, {profile.country || "India"}
      </Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Hosted</Text>
          <Text style={styles.statValue}>{hostedCount}</Text>
        </Card>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Connections</Text>
          <Text style={styles.statValue}>{profile.connectionsCount ?? 0}</Text>
        </Card>
        <Card style={styles.statCard} padding="lg">
          <Text style={styles.statLabel}>Events attended</Text>
          <Text style={styles.statValue}>{pastOutings.length}</Text>
        </Card>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Text
          style={[
            styles.tab,
            activeTab === "vibe" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("vibe")}
        >
          My Vibe
        </Text>
        <Text
          style={[
            styles.tab,
            activeTab === "parties" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("parties")}
        >
          Your Parties
        </Text>
      </View>

      {activeTab === "parties" ? (
        <View style={styles.section}>
          {hostedLoading ? (
            <Text style={styles.sectionText}>Loading outings…</Text>
          ) : hostedOutings.length === 0 ? (
            <Text style={styles.sectionText}>
              You haven&apos;t hosted any outings yet.
            </Text>
          ) : (
            hostedOutings.map((outing) => (
              <Card key={outing.id} style={styles.hostedHeroCard} padding="lg">
                {outing.coverImageUrl ? (
                  <Image
                    source={{ uri: outing.coverImageUrl }}
                    style={styles.hostedHeroImage}
                  />
                ) : (
                  <View style={styles.pastImagePlaceholder} />
                )}
                <View style={styles.hostedHeroBody}>
                  <View style={styles.hostedHeroHeader}>
                    <Text style={styles.hostedBadge}>ACTIVE</Text>
                  </View>
                  <Text style={styles.hostedHeroTitle} numberOfLines={1}>
                    {outing.title}
                  </Text>
                  <Text style={styles.hostedHeroMeta} numberOfLines={1}>
                    {/* fallback to area if no formatted date */}
                    {outing.area ?? "Mumbai"}
                  </Text>
                  <SecondaryButton
                    label="Manage"
                    onPress={() => navigation.navigate("HostDashboard")}
                    style={styles.hostedHeroManage}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chips}>
              {profile.interests.map((interest: string) => (
                <Pill key={interest} label={interest} />
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vibe Summary</Text>
            <Text style={styles.sectionText}>
              {Object.keys(profile.vibe_answers).length} vibe answers saved.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Events</Text>
            {loading ? (
              <Text style={styles.sectionText}>Loading past events…</Text>
            ) : pastOutings.length === 0 ? (
              <Text style={styles.sectionText}>No past events yet.</Text>
            ) : (
          <View style={styles.pastGrid}>
            {pastOutings.slice(0, 4).map((event) => (
              <Card key={event.id} style={styles.pastCard} padding="none">
                {event.coverImageUrl ? (
                  <Image
                    source={{ uri: event.coverImageUrl }}
                    style={styles.pastImage}
                  />
                ) : (
                  <View style={styles.pastImagePlaceholder} />
                )}
                <View style={styles.pastTitleOverlay}>
                  <Text style={styles.pastTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
            )}
          </View>
          {/* Phase 1: Profile Preview button */}
          <SecondaryButton
            label="Preview Profile"
            onPress={() => navigation.navigate("ProfilePreview")}
            style={styles.fullButton}
          />
          <SecondaryButton
            label="Edit Profile"
            onPress={() => navigation.navigate("EditProfile")}
            style={styles.fullButton}
          />
          {/* Phase 4: Invite Friends */}
          <SecondaryButton
            label="Invite Friends"
            onPress={() => navigation.navigate("InviteFriends")}
            style={styles.fullButton}
          />
          {/* Phase 4: Subscription */}
          <SecondaryButton
            label="Subscription"
            onPress={() => navigation.navigate("Subscription")}
            style={styles.fullButton}
          />
          {/* Phase 3: Safety Settings */}
          <SecondaryButton
            label="Safety & Privacy"
            onPress={() => navigation.navigate("SafetySettings")}
            style={styles.fullButton}
          />
          {profile.isHost ? (
            <SecondaryButton
              label="Open Host Dashboard"
              onPress={() => navigation.navigate("HostDashboard")}
              style={styles.fullButton}
            />
          ) : null}
          <DestructiveButton
            label="Sign out"
            onPress={signOut}
            style={styles.fullButton}
          />
        </>
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
  carousel: {
    marginHorizontal: -layout.gutter,
    marginBottom: layout.section,
  },
  manageRow: {
    alignItems: "center",
    marginBottom: layout.section,
  },
  manageButton: {
    height: 44,
    paddingHorizontal: layout.section,
  },
  name: {
    color: colors.textPrimary,
    ...typography.h2,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    ...typography.body2,
    marginBottom: layout.section,
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
    marginBottom: layout.section,
  },
  sectionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.compact,
  },
  sectionText: {
    color: colors.textMuted,
    ...typography.body2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.compact,
  },
  pastGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.section,
  },
  pastCard: {
    width: "47%",
  },
  pastImage: {
    width: "100%",
    height: 120,
    borderRadius: radius.card,
  },
  pastImagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
  },
  pastTitle: {
    color: colors.textPrimary,
    ...typography.body2,
    fontWeight: "600",
  },
  pastTitleOverlay: {
    position: "absolute",
    left: layout.compact * 1.5,
    right: layout.compact * 1.5,
    bottom: layout.compact * 1.5,
  },
  fullButton: {
    marginBottom: layout.section,
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    padding: 2,
    marginBottom: layout.section,
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
  hostedHeroCard: {
    marginBottom: layout.section,
  },
  hostedHeroImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.card,
    marginBottom: layout.section,
  },
  hostedHeroBody: {
    gap: layout.compact,
  },
  hostedHeroHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  hostedBadge: {
    paddingHorizontal: layout.compact,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    color: colors.bg,
    ...typography.micro,
  },
  hostedHeroTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginTop: layout.compact / 2,
  },
  hostedHeroMeta: {
    color: colors.textMuted,
    ...typography.body2,
  },
  hostedHeroManage: {
    marginTop: layout.section,
  },
});

export default MyProfileScreen;
