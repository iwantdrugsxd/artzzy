import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, typography } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import TextField from "../../components/TextField";
import OnboardingHeader from "../../components/OnboardingHeader";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "Bio">;

const BioScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();
  const [bio, setBio] = useState(draft.bio);

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "Bio", stepId: 3 });
  }, []);

  const handleContinue = () => {
    updateDraft({ bio });
    navigation.navigate("QuickBadges");
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={3}
        total={8}
        title="Describe your vibe"
        subtitle="I'm here for chill hangouts, deep talks, and spontaneous plans."
      />
      <TextField
        label="Your vibe"
        value={bio}
        onChangeText={setBio}
        placeholder="Write 2-3 lines about your vibe..."
        multiline
        maxLength={250}
        helperText={`${bio.length}/250`}
      />
      <PrimaryButton label="Continue" onPress={handleContinue} />
      <Text style={styles.tip}>Keep it short, fun, and real.</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  tip: {
    marginTop: layout.section,
    color: colors.textSubtle,
    ...typography.micro,
    textAlign: "center",
  },
});

export default BioScreen;
