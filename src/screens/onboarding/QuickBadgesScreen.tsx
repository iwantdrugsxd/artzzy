import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, typography } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import Pill from "../../components/Pill";
import OnboardingHeader from "../../components/OnboardingHeader";
import InlineError from "../../components/InlineError";
import { badgeGroups } from "../../data/badges";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "QuickBadges">;

const QuickBadgesScreen: React.FC<Props> = ({ navigation }) => {
  const { draft, updateDraft } = useAuth();

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "QuickBadges", stepId: 4 });
  }, []);

  const toggle = (badge: string) => {
    const exists = (draft.quick_badges || []).includes(badge);
    const current = draft.quick_badges || [];
    const next = exists
      ? current.filter((item) => item !== badge)
      : current.length >= 6
      ? current
      : [...current, badge];
    updateDraft({ quick_badges: next });
  };

  const selectedCount = (draft.quick_badges || []).length;
  const canContinue = useMemo(
    () => selectedCount >= 3 && selectedCount <= 6,
    [selectedCount]
  );

  const showError = selectedCount > 0 && selectedCount < 3;

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OnboardingHeader
        step={4}
        total={8}
        title="Quick facts about you"
        subtitle="Select 4-6 badges that describe you. These help others understand your vibe quickly."
      />
      {badgeGroups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupTitle}>{group.label}</Text>
          <View style={styles.chips}>
            {group.badges.map((badge) => {
              const isSelected = (draft.quick_badges || []).includes(badge);
              const isDisabled = !isSelected && selectedCount >= 6;
              return (
                <Pill
                  key={badge}
                  label={badge}
                  selected={isSelected}
                  onPress={() => !isDisabled && toggle(badge)}
                  style={isDisabled ? styles.disabledPill : undefined}
                />
              );
            })}
          </View>
        </View>
      ))}
      {showError && (
        <InlineError message="Please select at least 3 badges to continue." />
      )}
      <PrimaryButton
        label="Continue"
        onPress={() => navigation.navigate("Prompts")}
        disabled={!canContinue}
      />
      <Text style={styles.counter}>
        Selected {selectedCount}/6 {selectedCount < 3 && "(min 3 required)"}
      </Text>
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
  disabledPill: {
    opacity: 0.4,
  },
  counter: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: layout.section,
    ...typography.body2,
  },
});

export default QuickBadgesScreen;


