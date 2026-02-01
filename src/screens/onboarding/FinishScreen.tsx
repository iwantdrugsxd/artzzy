import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, typography, shadows } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "Finish">;

const FinishScreen: React.FC<Props> = ({ navigation }) => {
  const { completeOnboarding } = useAuth();
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "Finish", stepId: 8 });
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      // onboarding.completed is logged in AuthContext.completeOnboarding()
      navigation.replace("Home");
    } catch (error) {
      logger.error("onboarding.complete.failed", { error });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={8}
        total={8}
        title="You're all set"
        subtitle="Welcome to the circle. Let's find your vibe and start the night."
      />
      <View style={styles.circle}>
        <Text style={styles.check}>OK</Text>
      </View>
      <PrimaryButton label="Go to Home" onPress={handleFinish} loading={saving} />
      <TouchableOpacity onPress={() => navigation.navigate("Home")}>
        <Text style={styles.link}>Explore settings first</Text>
      </TouchableOpacity>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: layout.major,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: layout.major,
    ...shadows.floating,
  },
  check: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "700",
  },
  link: {
    color: colors.textSubtle,
    marginTop: layout.section,
    ...typography.body2,
  },
});

export default FinishScreen;
