import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, layout, typography, radius } from "../theme";

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
};

const OnboardingHeader: React.FC<Props> = ({ step, total, title, subtitle }) => {
  const progress = Math.min(step / total, 1);

  return (
    <View style={styles.container}>
      <Text style={styles.step}>STEP {step} OF {total}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: layout.section,
  },
  step: {
    color: colors.textSecondary,
    ...typography.micro,
    marginBottom: layout.compact,
    letterSpacing: 1.6,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h2,
    marginBottom: layout.compact,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body2,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    marginTop: layout.section,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});

export default OnboardingHeader;
