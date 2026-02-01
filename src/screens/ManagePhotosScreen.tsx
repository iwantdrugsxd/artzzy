import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Image, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import IconButton from "../components/IconButton";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { logger } from "../utils/logger";


type Nav = StackNavigationProp<RootStackParamList, "ManagePhotos">;

const ManagePhotosScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>(
    profile?.profilePhotoUrls && profile.profilePhotoUrls.length > 0
      ? profile.profilePhotoUrls
      : profile?.profile_photo_url
        ? [profile.profile_photo_url]
        : []
  );
  const [uploading, setUploading] = useState(false);

  if (!user || !profile) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Profile unavailable</Text>
      </Screen>
    );
  }

  const handleAddPhoto = async () => {
    try {
      setUploading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to continue.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 5],
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
          const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
          if (!cloud || !preset) {
            throw new Error("Cloudinary env vars missing");
          }
          const form = new FormData();
          form.append("file", {
            uri,
            name: "profile.jpg",
            type: "image/jpeg",
          } as any);
          form.append("upload_preset", preset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (!data.secure_url) throw new Error("Upload failed");
          setPhotos((prev) => [...prev, data.secure_url as string]);
        }
      }
    } catch (error) {
      logger.error("profile.photo.add.failed", { error });
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (uri: string) => {
    if (photos.length === 1) {
      Alert.alert("Keep at least one photo", "You need at least one photo on Partizo.");
      return;
    }
    setPhotos(photos.filter((p) => p !== uri));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setPhotos(next);
  };

  const handleSave = async () => {
    if (photos.length === 0 || saving) return;
    setSaving(true);
    try {
      const primary = photos[0];
      const ref = doc(db, "users", user.id);
      await updateDoc(ref, {
        profilePhotoUrls: photos,
        primaryPhotoUrl: primary,
        profile_photo_url: primary,
        updatedAt: serverTimestamp(),
      });
      // Refresh profile from Firestore to ensure consistency
      await refreshProfile();
      logger.info("profile.updated", { fields: ["photos"] });
      navigation.goBack();
    } catch (error) {
      logger.error("profile.photos.save.failed", { error });
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Manage Photos" />
      <Text style={styles.subtitle}>Drag to reorder. First photo is your primary vibe.</Text>

      <View style={styles.grid}>
        {photos.map((uri, index) => (
          <Card key={uri} style={styles.card} padding="md">
            <Image source={{ uri }} style={styles.image} />
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
            )}
            <View style={styles.cardActions}>
              <View style={styles.moveRow}>
                <Pressable onPress={() => move(index, -1)} disabled={index === 0}>
                  <Text style={[styles.moveText, index === 0 && styles.moveDisabled]}>↑</Text>
                </Pressable>
                <Pressable
                  onPress={() => move(index, 1)}
                  disabled={index === photos.length - 1}
                >
                  <Text
                    style={[
                      styles.moveText,
                      index === photos.length - 1 && styles.moveDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={() => handleRemove(uri)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        {photos.length < 6 && (
          <Pressable style={styles.addCard} onPress={handleAddPhoto} disabled={uploading}>
            <IconButton
              icon={<Ionicons name="add" size={18} color={colors.textSecondary} />}
              onPress={handleAddPhoto}
            />
            <Text style={styles.addLabel}>Add photo</Text>
          </Pressable>
        )}
      </View>

      <PrimaryButton
        label="Save"
        onPress={handleSave}
        disabled={saving || photos.length === 0}
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
  subtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginBottom: layout.section,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.section,
  },
  card: {
    width: "46%",
  },
  image: {
    width: "100%",
    height: 160,
    borderRadius: radius.card,
    marginBottom: layout.compact,
  },
  primaryBadge: {
    position: "absolute",
    top: layout.compact,
    left: layout.compact,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: layout.compact,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: colors.textPrimary,
    ...typography.micro,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moveRow: {
    flexDirection: "row",
    gap: layout.compact,
  },
  moveText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  moveDisabled: {
    opacity: 0.3,
  },
  removeText: {
    color: colors.danger,
    ...typography.micro,
    fontWeight: "600",
  },
  addCard: {
    width: "46%",
    height: 210,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    gap: layout.compact,
  },
  addLabel: {
    color: colors.textMuted,
    ...typography.body2,
  },
  saveButton: {
    marginTop: layout.section,
  },
});

export default ManagePhotosScreen;
