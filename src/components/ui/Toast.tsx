/**
 * Toast - Standardized toast/snackbar component
 * Visual styling only - no state management
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, tokens } from "../../theme";

type Props = {
  message: string;
  variant?: "default" | "success" | "error" | "warning";
};

export const Toast: React.FC<Props> = ({ message, variant = "default" }) => {
  const variantStyle =
    variant === "success"
      ? styles.success
      : variant === "error"
        ? styles.error
        : variant === "warning"
          ? styles.warning
          : styles.default;

  return (
    <View style={[styles.container, variantStyle]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.colors.bg.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadows.card.raised,
  },
  default: {
    borderColor: tokens.colors.border,
  },
  success: {
    borderColor: tokens.colors.primary.border,
    backgroundColor: tokens.colors.primary.soft,
  },
  error: {
    borderColor: tokens.colors.danger.border,
    backgroundColor: tokens.colors.danger.soft,
  },
  warning: {
    borderColor: tokens.colors.primary.border,
    backgroundColor: tokens.colors.primary.soft,
  },
  text: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body2,
    textAlign: "center",
  },
});
