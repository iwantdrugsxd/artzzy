import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StackScreenProps } from "@react-navigation/stack";
import * as Location from "expo-location";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, radius, typography } from "../../theme";
import Screen from "../../components/Screen";
import TextField from "../../components/TextField";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import SegmentedControl from "../../components/SegmentedControl";
import Pill from "../../components/Pill";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "BasicInfo">;

const BasicInfoScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();
  const [showDate, setShowDate] = useState(false);
  const [detecting, setDetecting] = useState(false);

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "BasicInfo", stepId: 1 });
  }, []);

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDate(false);
    if (date) {
      updateDraft({ birthdate: date.toISOString().split("T")[0] });
    }
  };

  const detectLocation = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Enable location to auto-detect.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      updateDraft({
        city: place?.city ?? "",
        country: place?.country ?? "",
      });
    } catch (error) {
      logger.error("location.detect.failed", { error });
      Alert.alert("Location failed", "Please enter manually.");
    } finally {
      setDetecting(false);
    }
  };

  const canContinue = draft.name.trim() && draft.birthdate && draft.city;

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={1}
        total={8}
        title="Start with the basics"
        subtitle="Let's set up your identity on Partizo."
      />
      <TextField
        label="Full Name"
        value={draft.name}
        onChangeText={(name) => updateDraft({ name })}
        placeholder="e.g., Alex Rivera"
        autoCapitalize="words"
      />
      <Text style={styles.label}>Gender</Text>
      <SegmentedControl
        value={draft.gender}
        onChange={(value) => updateDraft({ gender: value as any })}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "prefer_not_to_say", label: "Prefer not" },
        ]}
      />
      <Text style={styles.label}>Birthdate</Text>
      <Pressable style={styles.dateBox} onPress={() => setShowDate(true)}>
        <Text style={styles.dateText}>
          {draft.birthdate ? draft.birthdate : "Select date"}
        </Text>
      </Pressable>
      {showDate && (
        <DateTimePicker
          value={draft.birthdate ? new Date(draft.birthdate) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}
      <TextField
        label="Location"
        value={draft.city}
        onChangeText={(city) => updateDraft({ city })}
        placeholder="Search city"
      />
      <View style={styles.detectRow}>
        <Pill
          label={detecting ? "Detecting…" : "Detect location"}
          onPress={detecting ? undefined : detectLocation}
          selected
        />
      </View>
      <PrimaryButton
        label="Continue"
        onPress={() => navigation.navigate("PhotoUpload")}
        disabled={!canContinue}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  label: {
    color: colors.textSecondary,
    ...typography.caption,
    marginBottom: layout.compact,
  },
  dateBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    minHeight: 52,
    justifyContent: "center",
    marginBottom: layout.section,
  },
  dateText: {
    color: colors.textPrimary,
    ...typography.body,
  },
  detectRow: {
    marginBottom: layout.section,
    alignItems: "flex-start",
  },
});

export default BasicInfoScreen;
