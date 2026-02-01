import React, { useMemo, useState } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { colors, layout, radius, typography } from "../../theme";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import IconButton from "../../components/IconButton";
import { vibeQuestions } from "../../data/vibeQuestions";
import { useAuth } from "../../context/AuthContext";
import { logger } from "../../utils/logger";

type Props = StackScreenProps<RootStackParamList, "VibeQuestion">;

const VibeQuestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { index } = route.params;
  const { draft, updateDraft } = useAuth();
  const question = vibeQuestions[index];
  const [selected, setSelected] = useState(
    draft.vibe_answers[question.key] ?? ""
  );

  React.useEffect(() => {
    logger.info("onboarding.step.viewed", { step: "VibeQuestion", stepId: 6, questionKey: question.key });
  }, [question.key]);

  const progress = useMemo(
    () => Math.round(((index + 1) / vibeQuestions.length) * 100),
    [index]
  );

  const handleContinue = () => {
    updateDraft({
      vibe_answers: {
        ...draft.vibe_answers,
        [question.key]: selected,
      },
    });
    if (index + 1 < vibeQuestions.length) {
      navigation.push("VibeQuestion", { index: index + 1 });
    } else {
      navigation.navigate("Interests");
    }
  };

  if (!question) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <Text style={styles.title}>No question found</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={18} color={colors.textSecondary} />}
          onPress={() => navigation.goBack()}
        />
      </View>
      <OnboardingHeader
        step={6}
        total={8}
        title="Vibe questions"
        subtitle={`Question ${index + 1} of ${vibeQuestions.length}`}
      />
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.questionTitle}>{question.title}</Text>
      {question.subtitle ? (
        <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
      ) : null}
      <View style={styles.options}>
        {question.options.map((option) => {
          const active = selected === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSelected(option.value)}
              style={({ pressed }) => [
                styles.option,
                active ? styles.optionActive : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label="Continue" onPress={handleContinue} disabled={!selected} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  headerRow: {
    alignItems: "flex-start",
    marginTop: layout.section,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h3,
  },
  progress: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    marginBottom: layout.section,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  questionTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.compact,
  },
  questionSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginBottom: layout.section,
  },
  options: {
    gap: layout.element,
    marginBottom: layout.section,
  },
  option: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: layout.section,
    paddingVertical: layout.section,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface2,
  },
  optionPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  optionTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

export default VibeQuestionScreen;
