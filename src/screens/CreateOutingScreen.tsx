import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { RouteProp, useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, layout } from "../theme";
import Screen from "../components/Screen";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { logger } from "../utils/logger";
import { storage } from "../utils/storage";
import { RootStackParamList } from "../types/navigation";
import {
  OUTING_TYPES,
  POPULAR_OUTING_TYPES,
  VIBE_TAGS,
  QUICK_PICK_TAGS,
  getTagsByGroup,
  getTypesByCategory,
  OutingTypeId,
  VibeTagId,
} from "../data/outingConstants";
import LocationField, { LocationValue } from "../components/LocationField";

const areaOptions = [
  "Bandra West",
  "Andheri West",
  "Juhu",
  "Lower Parel",
  "Powai",
  "Versova",
  "Worli",
  "South Mumbai",
];

const durationOptions = [90, 120, 180, 240];

type Route = RouteProp<RootStackParamList, "CreateOuting">;

const stepMeta = [
  {
    label: "Identity & Vibe",
    title: "Define the move",
    subtitle: "Let's set the aesthetic for your verified outing.",
    cta: "Next: Location & Time",
  },
  {
    label: "Logistics & Rules",
    title: "Where & When",
    subtitle: "Lock the time, place, and guest flow.",
    cta: "Next: Finalize Vibe",
  },
  {
    label: "Visuals & Finalize",
    title: "Visuals & Finalize",
    subtitle: "Set the vibe for your Partizo moment.",
    cta: "Publish Outing 🚀",
  },
];

const CreateOutingScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const errorFieldRefs = useRef<Record<string, View | null>>({});
  const hasHydratedDraftRef = useRef(false);
  
  // Diagnostic: Log mount and route key to detect remounts
  useEffect(() => {
    logger.info("createOuting.mounted", { routeKey: route.key, timestamp: Date.now() });
  }, [route.key]);
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  
  // Diagnostic: Log title state changes to track state loss
  useEffect(() => {
    logger.info("createOuting.title.changed", { step, titleLength: title.length, titlePreview: title.substring(0, 20) });
  }, [step, title]);
  const [eventMode, setEventMode] = useState<"curated" | "fast">("curated"); // Default to curated (safer)
  const [typeId, setTypeId] = useState<OutingTypeId | null>(null);
  const [energy, setEnergy] = useState(50);
  const [vibeTagIds, setVibeTagIds] = useState<VibeTagId[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [durationMins, setDurationMins] = useState<number | null>(null);
  const [maxGuests, setMaxGuests] = useState(12);
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [activeOutingsCount, setActiveOutingsCount] = useState<number | null>(null);
  const [activeOutingsError, setActiveOutingsError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public"); // Phase 2: Invite-only toggle
  
  // Modal states
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [selectedTagGroup, setSelectedTagGroup] = useState<"energy" | "music" | "rules" | "crowd" | "aesthetic" | "all">("all");

  // Removed host-only restriction and active-outings limit - all users can create outings

  useEffect(() => {
    const loadActiveOutings = async () => {
      if (!user) return;
      try {
        const snap = await getDocs(
          query(
            collection(db, "outings"),
            where("hostId", "==", user.id),
            where("status", "==", "active")
          )
        );
        setActiveOutingsCount(snap.size);
      } catch (error) {
        logger.error("outing.active.count.failed", { error });
        setActiveOutingsError("Unable to verify active outings.");
      }
    };
    loadActiveOutings();
  }, [user]);

  // Handle location result passed back from LocationPicker
  // Use both useEffect and useFocusEffect to catch the result whether screen remounts or not
  useEffect(() => {
    const result = route.params?.locationResult;
    if (result) {
      logger.info("createOuting.locationResult.received.useEffect", { 
        hasName: !!result.name,
        hasAddress: !!result.address,
        step,
        titleLength: title.length
      });
      setLocation(result);
      // Derive area from selected location name
      setArea(result.name || null);
      // If we somehow returned to step 1, jump the user back to logistics
      setStep((prev) => (prev < 2 ? 2 : prev));
      // Clear the param to prevent re-processing
      navigation.setParams({ locationResult: undefined });
    }
  }, [route.params?.locationResult, navigation, step, title.length]);
  
  // Also listen for focus events to catch location result if screen was remounted
  useFocusEffect(
    React.useCallback(() => {
      const result = route.params?.locationResult;
      if (result) {
        logger.info("createOuting.locationResult.received.focus", { 
          hasName: !!result.name,
          hasAddress: !!result.address,
          step,
          titleLength: title.length
        });
        setLocation(result);
        setArea(result.name || null);
        setStep((prev) => (prev < 2 ? 2 : prev));
        navigation.setParams({ locationResult: undefined });
      }
    }, [route.params?.locationResult, navigation, step, title.length])
  );

  useEffect(() => {
    setShowErrors(false);
    setPublishError(null);
  }, [step]);

  // Draft hydration: restore title if screen remounts (e.g., after LocationPicker)
  useEffect(() => {
    if (!user || hasHydratedDraftRef.current) return;
    hasHydratedDraftRef.current = true;
    const draftKey = `outingDraft:${user.id}`;
    (async () => {
      const draft = await storage.get<{ title?: string }>(draftKey);
      if (draft?.title && !title.trim()) {
        setTitle(draft.title);
        logger.info("createOuting.draft.restored", { titleLength: draft.title.length });
      }
    })();
  }, [user, title]);

  // Persist title draft to survive remounts
  useEffect(() => {
    if (!user || !hasHydratedDraftRef.current) return;
    const draftKey = `outingDraft:${user.id}`;
    storage.set(draftKey, { title });
  }, [user, title]);

  const vibeMode = useMemo(() => {
    if (energy <= 30) return "CALM";
    if (energy <= 60) return "CHILL";
    if (energy <= 85) return "HIGH_ENERGY";
    return "CHAOS";
  }, [energy]);

  const vibeColor = useMemo(() => {
    if (energy <= 30) return colors.info;
    if (energy <= 60) return colors.success;
    if (energy <= 85) return colors.warning;
    return colors.danger;
  }, [energy]);

  const vibeModeLabel = useMemo(() => {
    if (energy <= 30) return "Calm & Relaxed";
    if (energy <= 60) return "Chill & Social";
    if (energy <= 85) return "High Energy";
    return "Chaos & Intense";
  }, [energy]);

  const softTagWarning = vibeTagIds.length > 0 && vibeTagIds.length < 2;
  const softRulesWarning = rules.length === 0;
  const softDescriptionWarning = !description.trim();
  
  // Generate search tokens for discovery
  const searchTokens = useMemo(() => {
    const tokens: string[] = [];
    const titleText = title.trim();
    if (titleText) {
      tokens.push(...titleText.toLowerCase().split(/\s+/).filter(Boolean));
    }
    if (area) {
      tokens.push(area.toLowerCase().replace(/\s+/g, "_"));
    }
    if (typeId) {
      tokens.push(typeId);
      const type = OUTING_TYPES[typeId];
      if (type) {
        tokens.push(...type.label.toLowerCase().split(/\s+/));
      }
    }
    vibeTagIds.forEach((tagId) => {
      const tag = VIBE_TAGS[tagId];
      if (tag) {
        tokens.push(tagId);
        tokens.push(...tag.label.toLowerCase().split(/\s+/));
      }
    });
    return [...new Set(tokens)]; // Remove duplicates
  }, [title, area, typeId, vibeTagIds]);

  const validation = useMemo(() => {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 30 * 60 * 1000); // now + 30 minutes
    const errors: Record<string, string> = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = "Title is required.";
    } else if (trimmedTitle.length < 6) {
      errors.title = "Title must be at least 6 characters.";
    } else if (trimmedTitle.length > 60) {
      errors.title = "Title must be 60 characters or less.";
    }
    if (!typeId) errors.typeId = "Select an outing type.";
    if (!dateTime) {
      errors.dateTime = "Pick a date and time.";
    } else if (dateTime.getTime() < minDateTime.getTime()) {
      errors.dateTime = "Date and time must be at least 30 minutes from now.";
    }
    if (!durationMins) errors.durationMins = "Select a duration.";
    if (!location) errors.location = "Add a location.";
    if (maxGuests < 5 || maxGuests > 15) {
      errors.maxGuests = "Guest limit must be between 5 and 15.";
    }
    if (!coverImageUrl) errors.coverImageUrl = "Cover image is required.";
    if (vibeTagIds.length > 5) errors.vibeTagIds = "Max 5 vibe tags.";
    return errors;
  }, [
    activeOutingsCount,
    title,
    typeId,
    dateTime,
    durationMins,
    area,
    maxGuests,
    coverImageUrl,
    vibeTagIds.length,
  ]);

  const stepErrors = useMemo(() => {
    if (step === 1) {
      return {
        title: validation.title,
        typeId: validation.typeId,
        vibeTagIds: validation.vibeTagIds,
      };
    }
    if (step === 2) {
      return {
        dateTime: validation.dateTime,
        durationMins: validation.durationMins,
        location: validation.location,
        maxGuests: validation.maxGuests,
      };
    }
    return {
      coverImageUrl: validation.coverImageUrl,
    };
  }, [step, validation]);
  
  // Human-readable date summary
  const dateTimeSummary = useMemo(() => {
    if (!dateTime) return null;
    const dateLabel = dateTime.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeLabel = dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}${area ? ` • ${area}` : ""}`;
  }, [dateTime, area]);

  const stepHasErrors = Object.values(stepErrors).some(Boolean);
  // Allow publish as long as we're not currently saving/uploading
  const isPublishDisabled = saving || uploading;

  const toggleVibeTag = (tagId: VibeTagId) => {
    if (vibeTagIds.includes(tagId)) {
      setVibeTagIds(vibeTagIds.filter((id) => id !== tagId));
    } else {
      if (vibeTagIds.length >= 5) return;
      setVibeTagIds([...vibeTagIds, tagId]);
    }
  };
  
  const addRule = () => {
    if (newRule.trim() && rules.length < 5) {
      setRules([...rules, newRule.trim()]);
      setNewRule("");
    }
  };
  
  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };
  
  // Auto-scroll to first error
  const scrollToFirstError = () => {
    const firstErrorKey = Object.keys(stepErrors).find((key) => stepErrors[key as keyof typeof stepErrors]);
    if (firstErrorKey && errorFieldRefs.current[firstErrorKey]) {
      errorFieldRefs.current[firstErrorKey]?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - spacing(4), animated: true });
        },
        () => {}
      );
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloud || !preset) {
      const missing = !cloud ? "CLOUDINARY_CLOUD_NAME" : "CLOUDINARY_UPLOAD_PRESET";
      logger.error("cloudinary.config.missing", { missing });
      throw new Error(`Cloudinary ${missing} is not configured. Please check your .env file.`);
    }
    
    const form = new FormData();
    form.append("file", {
      uri,
      name: "outing.jpg",
      type: "image/jpeg",
    } as any);
    form.append("upload_preset", preset);
    
    // Optional: Add transformation for optimization (can also be set in preset)
    // form.append("transformation", "w_1080,q_auto,f_auto");
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    
    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: form,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        logger.error("cloudinary.upload.response.error", { 
          status: res.status, 
          statusText: res.statusText,
          error: errorData 
        });
        
        throw new Error(errorData.message || `Upload failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        logger.error("cloudinary.upload.api.error", { error: data.error });
        throw new Error(data.error.message || "Upload failed");
      }
      
      if (!data.secure_url) {
        logger.error("cloudinary.upload.no.url", { data });
        throw new Error("Upload succeeded but no URL returned");
      }
      
      return data.secure_url as string;
    } catch (error: any) {
      // Re-throw if it's already our formatted error
      if (error.message && error.message.includes("Cloudinary")) {
        throw error;
      }
      
      // Format network/fetch errors
      logger.error("cloudinary.upload.failed", { 
        error: error.message || error,
        cloud,
        hasPreset: !!preset 
      });
      
      if (error.message?.includes("Network") || error.message?.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
      
      throw new Error(error.message || "Upload failed. Please try again.");
    }
  };

  const pickImage = async () => {
    setImageError(null);
    setPublishError(null);
    setUploading(true);
    try {
      // Request permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setImageError("Photo access is required. Please enable it in settings.");
        setUploading(false);
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [16, 9],
      });
      
      if (result.canceled) {
        setUploading(false);
        return;
      }
      
      const uri = result.assets[0]?.uri;
      if (!uri) {
        setImageError("No image selected. Please try again.");
        setUploading(false);
        return;
      }
      
      // Set local image immediately for preview
      setLocalImage(uri);
      
      // Upload to Cloudinary
      try {
        const uploaded = await uploadToCloudinary(uri);
        setCoverImageUrl(uploaded);
        setImageError(null);
        logger.info("outing.cover.upload.success", { url: uploaded });
      } catch (uploadError: any) {
        logger.error("outing.cover.upload.failed", { 
          error: uploadError.message || uploadError,
          stack: uploadError.stack 
        });
        
        // Provide more specific error messages
        let errorMessage = "Upload failed. Tap to retry.";
        if (uploadError.message?.includes("Cloudinary configuration")) {
          errorMessage = "Upload configuration error. Please check settings.";
        } else if (uploadError.message?.includes("network") || uploadError.message?.includes("fetch")) {
          errorMessage = "Network error. Check your connection and retry.";
        }
        
        setImageError(errorMessage);
        setCoverImageUrl(null);
      }
    } catch (error: any) {
      logger.error("outing.cover.pick.failed", { 
        error: error.message || error,
        stack: error.stack 
      });
      setImageError("Failed to pick image. Please try again.");
      setCoverImageUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    setShowErrors(true);
    if (stepHasErrors) {
      scrollToFirstError();
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => Math.max(prev - 1, 1));
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handlePublish = async () => {
    setShowErrors(true);
    setPublishError(null);
    if (!user || !profile) return;
    
    // Validate title with same rules as step 1 validation
    const trimmedTitle = title.trim();
    logger.info("outing.publish.attempt", { 
      titleLength: title.length, 
      trimmedLength: trimmedTitle.length,
      step 
    });
    
    if (!trimmedTitle) {
      logger.warn("outing.publish.title.empty", { title, trimmedTitle });
      setPublishError("Outing title is required.");
      setStep(1);
      return;
    }
    
    if (trimmedTitle.length < 6) {
      logger.warn("outing.publish.title.too.short", { trimmedLength: trimmedTitle.length });
      setPublishError("Title must be at least 6 characters.");
      setStep(1);
      return;
    }
    
    if (trimmedTitle.length > 60) {
      logger.warn("outing.publish.title.too.long", { trimmedLength: trimmedTitle.length });
      setPublishError("Title must be 60 characters or less.");
      setStep(1);
      return;
    }
    // Let Firestore enforce correctness; just make sure we at least have a cover
    if (!coverImageUrl) {
      setPublishError("Upload a cover image before publishing.");
      setStep(3);
      return;
    }

    setSaving(true);
    try {
      const outingRef = doc(collection(db, "outings"));
      const batch = writeBatch(db);
      const dateTimeTimestamp = Timestamp.fromDate(dateTime);
      const typeData = OUTING_TYPES[typeId];
      
      // Calculate chat expiration: event end + 24 hours
      const eventEndMs = dateTime.getTime() + (durationMins * 60 * 1000);
      const chatExpiresAtMs = eventEndMs + (24 * 60 * 60 * 1000); // +24h
      const chatExpiresAtTimestamp = Timestamp.fromDate(new Date(chatExpiresAtMs));
      
      // Calculate location reveal time: 60 minutes before event (default for timelock)
      const revealAtMs = dateTime.getTime() - (60 * 60 * 1000); // 60 min before
      const revealAtTimestamp = Timestamp.fromDate(new Date(revealAtMs));
      
      const safeLocation = location
        ? {
            name: location.name || "",
            address: location.address || "",
            lat: Number(location.lat),
            lng: Number(location.lng),
            placeId: location.placeId || "",
            addressLine2: location.addressLine2 || "",
            landmark: location.landmark || "",
            instructions: location.instructions || "",
            placeId: location.placeId || "",
          }
        : null;

      batch.set(outingRef, {
        hostId: user.id,
        hostName: profile.name,
        hostPhotoUrl: profile.profile_photo_url || "",
        city: profile.city || "Mumbai",
        title: trimmedTitle, // Required: title must be saved for display and search
        // Normalized fields
        typeId,
        // Always provide a concrete string; Firestore rejects undefined
        type: typeData?.label || typeId, // Legacy support
        vibeTagIds,
        vibeTags: vibeTagIds.map((id) => VIBE_TAGS[id]?.label).filter(Boolean), // Legacy support
        // Vibe & energy
        vibeMode,
        energy,
        // Location
        area,
        location: safeLocation,
        // Event mode (dual-mode system)
        eventMode,
        locationRevealMode: eventMode === "curated" ? "timelock" : "timelock", // Both use timelock by default
        revealAt: revealAtTimestamp,
        // Timing
        dateTime: dateTimeTimestamp,
        durationMins,
        // Capacity
        maxGuests,
        approvedCount: 0,
        pendingCount: 0,
        waitlistCount: 0, // Phase 2: Initialize waitlist count
        // Status
        status: "active",
        visibility, // Phase 2: Use state value
        // Media
        coverImageUrl,
        // Content
        rules,
        description: description.trim(),
        // Search & discovery
        searchTokens,
        // Chat expiration
        chatExpiresAt: chatExpiresAtTimestamp,
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, "outings", outingRef.id, "members", user.id), {
        role: "host",
        joinedAt: serverTimestamp(),
      });
      batch.set(doc(db, "users", user.id, "activeOutings", outingRef.id), {
        outingId: outingRef.id,
        title: trimmedTitle,
        dateTime: dateTimeTimestamp,
        role: "host",
        coverImageUrl,
        status: "active",
      });
      // Index for "Your Parties" / hosted list
      try {
        batch.set(doc(db, "users", user.id, "hostedOutings", outingRef.id), {
          outingId: outingRef.id,
          title: trimmedTitle,
          dateTime: dateTimeTimestamp,
          coverImageUrl,
          status: "active",
          createdAt: serverTimestamp(),
        });
      } catch (indexError) {
        logger.error("outing.hostedOutings.index.failed", { error: indexError });
      }
      await batch.commit();
      if (user) {
        storage.remove(`outingDraft:${user.id}`);
      }
      logger.info("outing.created", { 
        outingId: outingRef.id, 
        title: trimmedTitle,
        hostId: user.id 
      });
      setPublished(true);
    } catch (error) {
      logger.error("outing.create.failed", { error });
      setPublishError("Publish failed. Check your connection and retry.");
      setSaving(false);
    }
  };

  // Removed host-only blocking - all users can create outings

  return (
    <Screen contentContainerStyle={styles.screenContent} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + spacing(1) }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Outing</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.stepHeader}>
            <Text style={styles.stepLabel}>{stepMeta[step - 1].label}</Text>
            <Text style={styles.stepCount}>Step {step} of 3</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]}
            />
          </View>
          <Text style={styles.stepTitle}>{stepMeta[step - 1].title}</Text>
          <Text style={styles.stepSubtitle}>{stepMeta[step - 1].subtitle}</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing(14) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {activeOutingsError ? (
            <Text style={styles.warningText}>{activeOutingsError}</Text>
          ) : showErrors && validation.activeOutings ? (
            <Text style={styles.errorText}>{validation.activeOutings}</Text>
          ) : null}

          {step === 1 ? (
            <>
              {/* Show publish error at top of step 1 if we jumped back from publish */}
              {publishError && publishError.includes("title") ? (
                <View style={styles.card}>
                  <Text style={styles.errorText}>{publishError}</Text>
                </View>
              ) : null}
              <View style={styles.card}>
                <Text style={styles.inputLabel}>Outing Title</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="House party at Bandra"
                  placeholderTextColor={colors.textSubtle}
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    // Clear publish error when user starts typing
                    if (publishError && publishError.includes("title")) {
                      setPublishError(null);
                    }
                  }}
                  maxLength={60}
                  autoCapitalize="words"
                />
                {title.length > 50 && (
                  <Text style={styles.counter}>{title.length}/60</Text>
                )}
                {showErrors && stepErrors.title ? (
                  <Text style={styles.errorText}>{stepErrors.title}</Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Event Mode</Text>
                <View style={styles.modeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      eventMode === "curated" && styles.modeOptionActive,
                    ]}
                    onPress={() => setEventMode("curated")}
                  >
                    <View style={styles.modeOptionTopRow}>
                      <Text
                        style={[
                          styles.modeOptionText,
                          eventMode === "curated" && styles.modeOptionTextActive,
                        ]}
                      >
                        Curated
                      </Text>
                      {eventMode === "curated" && (
                        <Text style={styles.modeSelectedIcon}>✓</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.modeOptionSubtext,
                        eventMode === "curated" && styles.modeOptionSubtextActive,
                      ]}
                    >
                      Host approves requests
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      eventMode === "fast" && styles.modeOptionActive,
                    ]}
                    onPress={() => setEventMode("fast")}
                  >
                    <View style={styles.modeOptionTopRow}>
                      <Text
                        style={[
                          styles.modeOptionText,
                          eventMode === "fast" && styles.modeOptionTextActive,
                        ]}
                      >
                        Fast
                      </Text>
                      {eventMode === "fast" && (
                        <Text style={styles.modeSelectedIcon}>⚡</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.modeOptionSubtext,
                        eventMode === "fast" && styles.modeOptionSubtextActive,
                      ]}
                    >
                      Auto-approve until full
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modeHint}>
                  {eventMode === "curated"
                    ? "Guests must request to join. You'll review each request."
                    : "Guests can join instantly. Event closes when full."}
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Outing Type</Text>
                </View>
                <View style={styles.pillRow}>
                  {POPULAR_OUTING_TYPES.map((typeIdOption) => {
                    const typeData = OUTING_TYPES[typeIdOption];
                    const selected = typeIdOption === typeId;
                    return (
                      <TouchableOpacity
                        key={typeIdOption}
                        style={[styles.pill, selected && styles.pillActive]}
                        onPress={() => setTypeId(typeIdOption)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selected && styles.pillTextActive,
                          ]}
                        >
                          {typeData.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.pill, styles.pillMore]}
                    onPress={() => setShowTypeModal(true)}
                  >
                    <Text style={styles.pillText}>More…</Text>
                  </TouchableOpacity>
                </View>
                {typeId && (
                  <View style={styles.selectedTypeBadge}>
                    <Text style={styles.selectedTypeText}>
                      {OUTING_TYPES[typeId]?.emoji} {OUTING_TYPES[typeId]?.label}
                    </Text>
                  </View>
                )}
                {showErrors && stepErrors.typeId ? (
                  <Text style={styles.errorText}>{stepErrors.typeId}</Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Energy</Text>
                </View>
                <View style={styles.energyCardInner}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Chill</Text>
                    <Text style={[styles.vibeMode, { color: vibeColor }]}>
                      {vibeMode}
                    </Text>
                    <Text style={styles.sliderLabel}>Intense</Text>
                  </View>
                  <View style={styles.sliderTrackBackground}>
                    <Slider
                      style={styles.slider}
                      value={energy}
                      onValueChange={setEnergy}
                      minimumValue={0}
                      maximumValue={100}
                      minimumTrackTintColor={vibeColor}
                      maximumTrackTintColor={colors.surface}
                      thumbTintColor={colors.primarySoft}
                    />
                  </View>
                  <Text style={styles.energyFeedback}>
                    Guests will be matched to this energy level.
                  </Text>
                  <View style={styles.energyBadge}>
                    <Text
                      style={[styles.energyBadgeText, { color: vibeColor }]}
                    >
                      Recommended for: {vibeModeLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Vibe Tags</Text>
                  <Text style={styles.sectionMeta}>
                    Selected {vibeTagIds.length}/5
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.tagPickerButton}
                  onPress={() => setShowTagModal(true)}
                >
                  <Text style={styles.tagPickerText}>
                    {vibeTagIds.length > 0
                      ? `${vibeTagIds.length} tag${
                          vibeTagIds.length > 1 ? "s" : ""
                        } selected`
                      : "Tap to select vibe tags"}
                  </Text>
                  <Text style={styles.tagPickerArrow}>↓</Text>
                </TouchableOpacity>
                {vibeTagIds.length > 0 && (
                  <View style={styles.selectedTagsRow}>
                    {vibeTagIds.map((tagId) => {
                      const tag = VIBE_TAGS[tagId];
                      return (
                        <View key={tagId} style={styles.selectedTagChip}>
                          <Text style={styles.selectedTagText}>
                            {tag?.label}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleVibeTag(tagId)}
                            style={styles.tagRemoveButton}
                          >
                            <Text style={styles.tagRemoveText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
                {showErrors && stepErrors.vibeTagIds ? (
                  <Text style={styles.errorText}>{stepErrors.vibeTagIds}</Text>
                ) : softTagWarning ? (
                  <Text style={styles.warningText}>
                    Add at least 2 tags for better matching.
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Where & When</Text>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDate(true)}
                >
                  <Text style={styles.inputValue}>
                    {dateTime ? dateTime.toDateString() : "Select date"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTime(true)}
                >
                  <Text style={styles.inputValue}>
                    {dateTime
                      ? dateTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Select time"}
                  </Text>
                </TouchableOpacity>
                {dateTimeSummary && (
                  <View style={styles.dateSummary}>
                    <Text style={styles.dateSummaryText}>
                      {dateTimeSummary}
                    </Text>
                  </View>
                )}
                {showErrors && stepErrors.dateTime ? (
                  <Text style={styles.errorText}>{stepErrors.dateTime}</Text>
                ) : null}

                {showDate ? (
                  <DateTimePicker
                    value={dateTime ?? new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(_, selected) => {
                      setShowDate(false);
                      if (selected) {
                        const existing = dateTime ?? new Date();
                        const next = new Date(selected);
                        next.setHours(
                          existing.getHours(),
                          existing.getMinutes(),
                          0,
                          0
                        );
                        setDateTime(next);
                      }
                    }}
                  />
                ) : null}

                {showTime ? (
                  <DateTimePicker
                    value={dateTime ?? new Date()}
                    mode="time"
                    onChange={(_, selected) => {
                      setShowTime(false);
                      if (selected) {
                        const existing = dateTime ?? new Date();
                        const next = new Date(existing);
                        next.setHours(
                          selected.getHours(),
                          selected.getMinutes(),
                          0,
                          0
                        );
                        setDateTime(next);
                      }
                    }}
                  />
                ) : null}

                <Text style={styles.inputLabel}>Duration</Text>
                <View style={styles.pillRow}>
                  {durationOptions.map((option) => {
                    const selected = option === durationMins;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.pill, selected && styles.pillActive]}
                        onPress={() => setDurationMins(option)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selected && styles.pillTextActive,
                          ]}
                        >
                          {option} mins
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {showErrors && stepErrors.durationMins ? (
                  <Text style={styles.errorText}>
                    {stepErrors.durationMins}
                  </Text>
                ) : null}

                <LocationField
                  value={location}
                  onChange={(loc) => {
                    setLocation(loc);
                    setArea(loc.name || null);
                  }}
                  onOpenMap={() =>
                    navigation.navigate("LocationPicker", {
                      initialLocation: location ?? undefined,
                    })
                  }
                />
                {showErrors && stepErrors.location ? (
                  <Text style={styles.errorText}>{stepErrors.location}</Text>
                ) : null}

                <Text style={styles.inputLabel}>Guest Limit</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() =>
                      setMaxGuests((prev) => Math.max(prev - 1, 5))
                    }
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{maxGuests}</Text>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() =>
                      setMaxGuests((prev) => Math.min(prev + 1, 15))
                    }
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </TouchableOpacity>
                </View>
                {showErrors && stepErrors.maxGuests ? (
                  <Text style={styles.errorText}>{stepErrors.maxGuests}</Text>
                ) : null}

                {/* Phase 2: Invite-only toggle */}
                <View style={styles.card}>
                  <Text style={styles.inputLabel}>Visibility</Text>
                  <View style={styles.modeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.modeOption,
                        visibility === "public" && styles.modeOptionActive,
                      ]}
                      onPress={() => setVisibility("public")}
                    >
                      <View style={styles.modeOptionTopRow}>
                        <Text
                          style={[
                            styles.modeOptionText,
                            visibility === "public" && styles.modeOptionTextActive,
                          ]}
                        >
                          Public
                        </Text>
                        {visibility === "public" && (
                          <Text style={styles.modeSelectedIcon}>✓</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.modeOptionSubtext,
                          visibility === "public" && styles.modeOptionSubtextActive,
                        ]}
                      >
                        Visible in Discover
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeOption,
                        visibility === "invite_only" && styles.modeOptionActive,
                      ]}
                      onPress={() => setVisibility("invite_only")}
                    >
                      <View style={styles.modeOptionTopRow}>
                        <Text
                          style={[
                            styles.modeOptionText,
                            visibility === "invite_only" && styles.modeOptionTextActive,
                          ]}
                        >
                          Invite Only
                        </Text>
                        {visibility === "invite_only" && (
                          <Text style={styles.modeSelectedIcon}>🔒</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.modeOptionSubtext,
                          visibility === "invite_only" && styles.modeOptionSubtextActive,
                        ]}
                      >
                        Hidden from Discover
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Rules (up to 5)</Text>
                {rules.map((rule, index) => (
                  <View key={index} style={styles.ruleChip}>
                    <Text style={styles.ruleChipText}>{rule}</Text>
                    <TouchableOpacity
                      onPress={() => removeRule(index)}
                      style={styles.ruleRemoveButton}
                    >
                      <Text style={styles.ruleRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {rules.length < 5 && (
                  <View style={styles.addRuleRow}>
                    <TextInput
                      style={styles.addRuleInput}
                      placeholder="Add a rule..."
                      placeholderTextColor={colors.textSubtle}
                      value={newRule}
                      onChangeText={setNewRule}
                      onSubmitEditing={addRule}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.addRuleButton}
                      onPress={addRule}
                      disabled={!newRule.trim()}
                    >
                      <Text style={styles.addRuleButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {softRulesWarning ? (
                  <Text style={styles.warningText}>
                    Consider adding rules for guest trust.
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Cover Image</Text>
                <View style={styles.coverBox}>
                  {localImage ? (
                    <>
                      <Image
                        source={{ uri: localImage }}
                        style={styles.coverImage}
                      />
                      {coverImageUrl && !uploading && (
                        <View style={styles.coverSuccessBadge}>
                          <Text style={styles.coverSuccessText}>✓ Uploaded</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Text style={styles.coverText}>Tap to upload cover</Text>
                    </View>
                  )}
                  {uploading ? (
                    <View style={styles.coverOverlay}>
                      <ActivityIndicator color={colors.textPrimary} />
                      <Text style={styles.coverOverlayText}>Uploading...</Text>
                    </View>
                  ) : null}
                  {imageError && !uploading ? (
                    <View style={styles.coverOverlay}>
                      <Text style={styles.coverOverlayText}>{imageError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={pickImage}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {!uploading && (
                    <TouchableOpacity
                      style={styles.coverActionButton}
                      onPress={pickImage}
                    >
                      <Text style={styles.coverActionText}>
                        {coverImageUrl ? "Change Cover" : "Upload Cover"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {showErrors && stepErrors.coverImageUrl ? (
                  <Text style={styles.errorText}>
                    {stepErrors.coverImageUrl}
                  </Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.inputLabel}>Description / Story</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell the vibe… What makes this outing special?"
                  placeholderTextColor={colors.textSubtle}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={300}
                  multiline
                />
                <Text style={styles.counter}>{description.length}/300</Text>
                {softDescriptionWarning ? (
                  <Text style={styles.warningText}>
                    A short story helps set expectations.
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View
          style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing(2) }]}
        >
          {step < 3 ? (
            <PrimaryButton
              label={stepMeta[step - 1].cta}
              onPress={handleNext}
              disabled={stepHasErrors}
            />
          ) : (
            <PrimaryButton
              label={saving ? "Publishing..." : "Publish Outing 🚀"}
              onPress={handlePublish}
              disabled={isPublishDisabled}
            />
          )}
          {step === 3 && isPublishDisabled && !coverImageUrl ? (
            <Text style={styles.warningText}>
              Please upload a cover image to publish.
            </Text>
          ) : null}
          {showErrors && stepHasErrors ? (
            <Text style={styles.errorText}>
              Fix the highlighted fields to continue.
            </Text>
          ) : null}
          {publishError ? (
            <Text style={styles.errorText}>{publishError}</Text>
          ) : null}
        </View>
      {/* Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing(2) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Outing Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search types..."
              placeholderTextColor={colors.textSubtle}
              value={typeSearchQuery}
              onChangeText={setTypeSearchQuery}
            />
            <ScrollView style={styles.modalScroll}>
              {Object.values(OUTING_TYPES)
                .filter((type) =>
                  typeSearchQuery
                    ? type.label.toLowerCase().includes(typeSearchQuery.toLowerCase())
                    : true
                )
                .map((type) => {
                  const selected = type.id === typeId;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.modalOption, selected && styles.modalOptionSelected]}
                      onPress={() => {
                        setTypeId(type.id);
                        setShowTypeModal(false);
                        setTypeSearchQuery("");
                      }}
                    >
                      {type.emoji && <Text style={styles.modalOptionEmoji}>{type.emoji}</Text>}
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>
                        {type.label}
                      </Text>
                      {selected && <Text style={styles.modalOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tag Selection Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing(2) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vibe Tags ({vibeTagIds.length}/5)</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search tags..."
              placeholderTextColor={colors.textSubtle}
              value={tagSearchQuery}
              onChangeText={setTagSearchQuery}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagGroupScroll}
            >
              {["all", "energy", "music", "rules", "crowd", "aesthetic"].map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.tagGroupChip,
                    selectedTagGroup === group && styles.tagGroupChipActive,
                  ]}
                  onPress={() => setSelectedTagGroup(group as any)}
                >
                  <Text
                    style={[
                      styles.tagGroupText,
                      selectedTagGroup === group && styles.tagGroupTextActive,
                    ]}
                  >
                    {group === "all" ? "All" : group.charAt(0).toUpperCase() + group.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.modalScroll}>
              {Object.values(VIBE_TAGS)
                .filter((tag) => {
                  if (tagSearchQuery) {
                    return tag.label.toLowerCase().includes(tagSearchQuery.toLowerCase());
                  }
                  return selectedTagGroup === "all" || tag.group === selectedTagGroup;
                })
                .map((tag) => {
                  const selected = vibeTagIds.includes(tag.id);
                  const disabled = !selected && vibeTagIds.length >= 5;
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.modalOption,
                        selected && styles.modalOptionSelected,
                        disabled && styles.modalOptionDisabled,
                      ]}
                      onPress={() => {
                        if (!disabled) toggleVibeTag(tag.id);
                      }}
                      disabled={disabled}
                    >
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>
                        {tag.label}
                      </Text>
                      {selected && <Text style={styles.modalOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Screen */}
      {published && (
        <Modal visible={published} animationType="fade" transparent={true}>
          <View style={styles.successOverlay}>
            <View style={styles.successContent}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>Your outing request has been created</Text>
              <Text style={styles.successSubtitle}>
                It&apos;s now live and discoverable.
              </Text>
              <PrimaryButton
                label="Go to Discover →"
                onPress={() => {
                  setPublished(false);
                  navigation.navigate("MyProfile");
                }}
              />
              <TouchableOpacity
                style={styles.successSecondaryButton}
                onPress={() => {
                  setPublished(false);
                  navigation.navigate("MyProfile");
                }}
              >
                <Text style={styles.successSecondaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(1.5),
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(2),
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18,
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing(1),
  },
  stepLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 11,
  },
  stepCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginTop: spacing(1.5),
    marginBottom: spacing(2),
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing(1),
  },
  stepSubtitle: {
    color: colors.textMuted,
    marginBottom: spacing(3),
  },
  sectionLabel: {
    color: colors.primarySoft,
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: spacing(1),
  },
  inputLabel: {
    color: colors.textMuted,
    marginBottom: spacing(1),
    marginTop: spacing(1.5),
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.4),
    color: colors.textPrimary,
  },
  inputValue: {
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
  },
  pill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(1.6),
    paddingVertical: spacing(0.8),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  energyCardInner: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(2),
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1),
  },
  sliderLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  vibeMode: {
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 36,
  },
  sliderTrackBackground: {
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    marginTop: spacing(1),
  },
  tagChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(1.6),
    paddingVertical: spacing(0.7),
    borderRadius: radius.pill,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  tagTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  tagHint: {
    color: colors.textSubtle,
    marginTop: spacing(1),
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  coverBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    minHeight: 180,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing(1),
  },
  coverImage: {
    width: "100%",
    height: 200,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    width: "100%",
  },
  coverText: {
    color: colors.textMuted,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
  },
  coverOverlayText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  counter: {
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing(1),
  },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    backgroundColor: colors.bgGlass,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing(0.75),
  },
  warningText: {
    color: colors.warning,
    marginTop: spacing(0.75),
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3),
  },
  blockedTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing(1),
  },
  blockedSubtitle: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing(3),
  },
  blockedButton: {
    alignSelf: "stretch",
  },
  // New styles for improved UI
  pillEmoji: {
    marginRight: spacing(0.5),
    fontSize: 16,
  },
  pillMore: {
    borderStyle: "dashed",
    borderColor: colors.textMuted,
  },
  selectedTypeBadge: {
    backgroundColor: colors.surfaceLight,
    padding: spacing(1.5),
    borderRadius: radius.card,
    marginTop: spacing(1),
  },
  selectedTypeText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  energyFeedback: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(1),
    textAlign: "center",
  },
  energyBadge: {
    marginTop: spacing(1),
    padding: spacing(1),
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  energyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagPickerButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.4),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagPickerText: {
    color: colors.textPrimary,
    flex: 1,
  },
  tagPickerArrow: {
    color: colors.textMuted,
    fontSize: 18,
  },
  selectedTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    marginTop: spacing(1),
  },
  selectedTagChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.7),
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
  },
  selectedTagText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  tagRemoveButton: {
    marginLeft: spacing(0.5),
  },
  tagRemoveText: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 18,
  },
  dateSummary: {
    backgroundColor: colors.surfaceLight,
    padding: spacing(1.5),
    borderRadius: radius.card,
    marginTop: spacing(1),
  },
  dateSummaryText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  ruleChip: {
    backgroundColor: colors.surface,
    padding: spacing(1.5),
    borderRadius: radius.card,
    marginBottom: spacing(1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ruleChipText: {
    color: colors.textPrimary,
    flex: 1,
  },
  ruleRemoveButton: {
    marginLeft: spacing(1),
  },
  ruleRemoveText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: "700",
  },
  addRuleRow: {
    flexDirection: "row",
    gap: spacing(1),
    marginTop: spacing(1),
  },
  addRuleInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.4),
    color: colors.textPrimary,
  },
  addRuleButton: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addRuleButtonText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  coverSuccessBadge: {
    position: "absolute",
    top: spacing(2),
    right: spacing(2),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill,
  },
  coverSuccessText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 11,
  },
  coverActionButton: {
    position: "absolute",
    bottom: spacing(2),
    right: spacing(2),
    backgroundColor: colors.overlayStrong,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.button,
  },
  coverActionText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 12,
  },
  retryButton: {
    marginTop: spacing(1),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.button,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: "80%",
    paddingTop: spacing(2),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  modalClose: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: "300",
  },
  modalSearch: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.4),
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
    color: colors.textPrimary,
  },
  modalScroll: {
    maxHeight: 400,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing(1.5),
    borderRadius: radius.card,
    marginBottom: spacing(1),
    backgroundColor: colors.surface,
  },
  modalOptionSelected: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  modalOptionEmoji: {
    marginRight: spacing(1),
    fontSize: 20,
  },
  modalOptionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  modalOptionTextSelected: {
    fontWeight: "600",
  },
  modalOptionCheck: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  tagGroupScroll: {
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  tagGroupChip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.8),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing(1),
  },
  tagGroupChipActive: {
    backgroundColor: colors.primary,
  },
  tagGroupText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  tagGroupTextActive: {
    color: colors.textPrimary,
  },
  // Event mode selector
  modeSelector: {
    flexDirection: "row",
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  modeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(1.5),
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeOptionActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
  },
  modeOptionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(0.25),
  },
  modeOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(0.5),
  },
  modeOptionTextActive: {
    color: colors.primarySoft,
  },
  modeOptionSubtext: {
    color: colors.textMuted,
    fontSize: 12,
  },
  modeOptionSubtextActive: {
    color: colors.textMuted,
  },
  modeHint: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: spacing(0.5),
    marginBottom: spacing(1.5),
    fontStyle: "italic",
  },
  modeSelectedIcon: {
    color: colors.primarySoft,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionMeta: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  // Success screen
  successOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(3),
  },
  successContent: {
    backgroundColor: colors.background,
    borderRadius: radius.sheet,
    padding: spacing(4),
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing(1),
    textAlign: "center",
  },
  successSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing(3),
  },
  successSecondaryButton: {
    marginTop: spacing(2),
    paddingVertical: spacing(1),
  },
  successSecondaryText: {
    color: colors.textMuted,
    fontSize: 15,
  },
});

export default CreateOutingScreen;
