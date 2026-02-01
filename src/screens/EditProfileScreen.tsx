import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";
import Pill from "../components/Pill";
import IconButton from "../components/IconButton";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { logger } from "../utils/logger";


type Nav = StackNavigationProp<RootStackParamList, "EditProfile">;

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile, refreshProfile } = useAuth();

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [interestsInput, setInterestsInput] = useState("");
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  // Phase 1: Profile upgrades
  const [height, setHeight] = useState(profile?.height ?? "");
  const [work, setWork] = useState(profile?.work ?? "");
  const [education, setEducation] = useState(profile?.education ?? "");
  const [saving, setSaving] = useState(false);

  if (!user || !profile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Profile unavailable</Text>
      </Screen>
    );
  }

  const addInterest = () => {
    const trimmed = interestsInput.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      setInterestsInput("");
      return;
    }
    setInterests([...interests, trimmed]);
    setInterestsInput("");
  };

  const removeInterest = (value: string) => {
    setInterests(interests.filter((i) => i !== value));
  };

  const canSave = bio.trim().length > 0 && interests.length >= 3 && city.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.id);
      await updateDoc(ref, {
        bio: bio.trim(),
        city: city.trim(),
        interests,
        // Phase 1: Profile upgrades
        height: height.trim() || null,
        work: work.trim() || null,
        education: education.trim() || null,
        updatedAt: serverTimestamp(),
      });
      // Refresh profile from Firestore to ensure consistency
      await refreshProfile();
      logger.info("profile.updated", { fields: ["bio", "city", "interests", "height", "work", "education"] });
      navigation.goBack();
    } catch (error) {
      logger.error("profile.update.failed", { error });
      // swallow for now; could show toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Edit Profile" />

      <Card style={styles.photosRow} padding="lg" onPress={() => navigation.navigate("ManagePhotos")}>
        <View>
          <Text style={styles.photosTitle}>Photos</Text>
          <Text style={styles.photosSubtitle}>Add, reorder or remove up to 6 photos</Text>
        </View>
        <Text style={styles.photosLink}>Manage</Text>
      </Card>

      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people about your vibe..."
        multiline
        maxLength={250}
        helperText={`${bio.length}/250`}
      />

      <TextField
        label="Current City"
        value={city}
        onChangeText={setCity}
        placeholder="Mumbai"
      />

      {/* Phase 1: Profile upgrades */}
      <TextField
        label="Height (optional)"
        value={height}
        onChangeText={setHeight}
        placeholder={`e.g., 175 cm or 5'9"`}
      />

      <TextField
        label="Work (optional)"
        value={work}
        onChangeText={setWork}
        placeholder="e.g., Software Engineer at Google"
      />

      <TextField
        label="Education (optional)"
        value={education}
        onChangeText={setEducation}
        placeholder="e.g., MIT, Computer Science"
      />

      <TextField
        label="Interests (min 3)"
        value={interestsInput}
        onChangeText={setInterestsInput}
        placeholder="Add interest"
        onSubmitEditing={addInterest}
      />
      <View style={styles.interestsRow}>
        <IconButton
          icon={<Ionicons name="add" size={18} color={colors.textSecondary} />}
          onPress={addInterest}
        />
        <View style={styles.chips}>
          {interests.map((interest) => (
            <Pill
              key={interest}
              label={interest}
              onPress={() => removeInterest(interest)}
              selected
            />
          ))}
        </View>
      </View>

      <PrimaryButton
        label={canSave ? "Save" : "Add a bit more"}
        onPress={handleSave}
        disabled={!canSave || saving}
        style={styles.saveButton}
      />
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
  title: {
    color: colors.textPrimary,
    ...typography.h3,
    textAlign: "center",
  },
  photosRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: layout.section,
  },
  photosTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  photosSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
  },
  photosLink: {
    color: colors.textSecondary,
    ...typography.body2,
    fontWeight: "600",
  },
  interestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.section,
    flexWrap: "wrap",
    marginBottom: layout.section,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.compact,
    flex: 1,
  },
  saveButton: {
    marginTop: layout.section,
  },
});

export default EditProfileScreen;
