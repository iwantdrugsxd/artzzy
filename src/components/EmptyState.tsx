import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, layout, typography } from "../theme";
import PrimaryButton from "./PrimaryButton";

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

const EmptyState: React.FC<Props> = ({ title, subtitle, icon, actionLabel, onAction }) => {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: layout.major,
    gap: layout.element,
  },
  icon: {
    marginBottom: layout.compact,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h3,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body2,
    textAlign: "center",
  },
  button: {
    marginTop: layout.section,
    alignSelf: "stretch",
  },
});

export default EmptyState;
