import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { layout, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import ProfileCard from "../components/ProfileCard";
import { useAuth } from "../context/AuthContext";

type Nav = StackNavigationProp<RootStackParamList, "ProfilePreview">;

const ProfilePreviewScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (!profile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ScreenHeader title="Profile Preview" />
      </Screen>
    );
  }

  const photos =
    profile.profilePhotoUrls && profile.profilePhotoUrls.length > 0
      ? profile.profilePhotoUrls
      : profile.profile_photo_url
        ? [profile.profile_photo_url]
        : [];

  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = getAge(profile.birthdate);

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <ScreenHeader title="Profile Preview" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + layout.section * 6 },
        ]}
      >
        <View style={styles.cardWrap}>
          <ProfileCard
            name={profile.name}
            age={age}
            height={profile.height}
            city={profile.city}
            country={profile.country}
            bio={profile.bio}
            photo={profile.profile_photo_url}
            photos={photos}
            interests={profile.interests}
            score={0} // Preview doesn't need match score
            tags={[]} // Preview doesn't need tags
            showDetails
            quickBadges={profile.quick_badges}
            prompts={profile.prompts}
            work={profile.work}
            education={profile.education}
            isVerified={profile.isVerified}
            isActive={true}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: layout.section,
  },
  cardWrap: {
    alignItems: "center",
  },
});

export default ProfilePreviewScreen;



