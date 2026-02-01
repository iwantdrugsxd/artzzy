import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, typography } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import Pill from "../../components/Pill";
import OnboardingHeader from "../../components/OnboardingHeader";
import { interestGroups } from "../../data/interests";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "Interests">;

const InterestsScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "Interests", stepId: 7 });
  }, []);

  const toggle = (label: string) => {
    const exists = draft.interests.includes(label);
    const next = exists
      ? draft.interests.filter((item) => item !== label)
      : [...draft.interests, label];
    updateDraft({ interests: next });
  };

  const canContinue = useMemo(
    () => draft.interests.length >= 5,
    [draft.interests.length]
  );

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={7}
        total={8}
        title="What are you into?"
        subtitle="Select interests to help us find your vibe. Choose at least 5."
      />
      {interestGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.chips}>
            {group.items.map((item) => (
              <Pill
                key={item}
                label={item}
                selected={draft.interests.includes(item)}
                onPress={() => toggle(item)}
              />
            ))}
          </View>
        </View>
      ))}
      <PrimaryButton
        label="Continue"
        onPress={() => navigation.navigate("Finish")}
        disabled={!canContinue}
      />
      <Text style={styles.counter}>Selected {draft.interests.length}/10</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  group: {
    marginBottom: layout.section,
  },
  groupTitle: {
    color: colors.textSecondary,
    ...typography.micro,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: layout.compact,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.compact,
  },
  counter: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: layout.section,
    ...typography.body2,
  },
});

export default InterestsScreen;
