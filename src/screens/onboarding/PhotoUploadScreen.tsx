import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Dimensions } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, radius, typography } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "PhotoUpload">;

const { width } = Dimensions.get("window");
const SLOT_GAP = layout.element;
const SLOT_SIZE = (width - layout.gutter * 2 - SLOT_GAP * 2) / 3;

const PhotoUploadScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();
  const [picking, setPicking] = useState(false);

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "PhotoUpload", stepId: 2 });
  }, []);

  const uploadToCloudinary = async (uri: string) => {
    const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloud || !preset) {
      const message = "Cloudinary configuration missing";
      logger.error("onboarding.photo.cloudinary.misconfigured", {
        cloud,
        presetPresent: Boolean(preset),
      });
      throw new Error(message);
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

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("onboarding.photo.upload.http_failed", {
        status: res.status,
        body: text,
      });
      throw new Error("Upload network error");
    }

    const data = await res.json();
    if (!data.secure_url) {
      logger.error("onboarding.photo.upload.missing_url", { data });
      throw new Error("Upload failed");
    }

    return data.secure_url as string;
  };

  const pickImage = async (slotIndex: number) => {
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to continue.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        // NOTE: MediaTypeOptions is deprecated; keep for now for compatibility
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          const uploaded = await uploadToCloudinary(uri);
          const current = draft.profilePhotoUrls && draft.profilePhotoUrls.length > 0
            ? [...draft.profilePhotoUrls]
            : draft.profile_photo_url
              ? [draft.profile_photo_url]
              : [];
          current[slotIndex] = uploaded;
          const primary = current[0] || uploaded;
          updateDraft({
            profile_photo_url: primary,
            profilePhotoUrls: current,
            primaryPhotoUrl: primary,
          });
        }
      }
    } catch (error: any) {
      logger.error("onboarding.photo.pick.failed", {
        message: error?.message || String(error),
        stack: error?.stack,
      });

      let errorMessage = "Upload failed. Please try again.";
      if (error?.message?.includes("Cloudinary configuration")) {
        errorMessage = "Upload configuration error. Please contact support.";
      } else if (
        error?.message?.toLowerCase?.().includes("network") ||
        error?.message?.toLowerCase?.().includes("fetch")
      ) {
        errorMessage = "Network error while uploading. Check your connection and retry.";
      }

      Alert.alert("Upload failed", errorMessage);
    } finally {
      setPicking(false);
    }
  };

  const photos =
    draft.profilePhotoUrls && draft.profilePhotoUrls.length > 0
      ? draft.profilePhotoUrls
      : draft.profile_photo_url
        ? [draft.profile_photo_url]
        : [];

  const hasRequired = Boolean(photos[0]);

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={2}
        total={8}
        title="Show us your best side"
        subtitle="Add at least one photo. You can add more later."
      />
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => {
          const uri = photos[index];
          return (
            <TouchableOpacity
              key={`slot-${index}`}
              style={[styles.slot, index === 0 ? styles.primarySlot : null]}
              onPress={() => pickImage(index)}
              disabled={picking}
              activeOpacity={0.85}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.slotImage} />
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
              {index === 0 ? (
                <View style={styles.requiredPill}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              ) : null}
      </TouchableOpacity>
          );
        })}
      </View>
      <PrimaryButton
        label={hasRequired ? "Continue" : "Upload Photo"}
        onPress={hasRequired ? () => navigation.navigate("Bio") : () => pickImage(0)}
        disabled={picking}
        style={styles.cta}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SLOT_GAP,
    marginBottom: layout.section,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primarySlot: {
    borderColor: colors.primary,
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  plus: {
    color: colors.textSecondary,
    fontSize: 24,
  },
  requiredPill: {
    position: "absolute",
    bottom: layout.compact,
    right: layout.compact,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: layout.compact,
    paddingVertical: 2,
  },
  requiredText: {
    color: colors.textPrimary,
    ...typography.micro,
  },
  cta: {
    marginTop: layout.section,
  },
});

export default PhotoUploadScreen;
