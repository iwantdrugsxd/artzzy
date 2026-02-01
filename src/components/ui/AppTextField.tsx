/**
 * AppTextField - Standardized text input with glass effect and red focus glow
 * Inline error styling only - no validation logic changes
 */
import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, tokens } from "../../theme";

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string; // Visual error state only
  leftIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export const AppTextField: React.FC<Props> = ({
  label,
  helperText,
  error,
  leftIcon,
  containerStyle,
  multiline,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={tokens.colors.text.subtle}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  label: {
    color: tokens.colors.text.secondary,
    ...tokens.typography.caption,
    marginBottom: tokens.spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.overlay.glass,
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: tokens.colors.primary.solid,
    backgroundColor: tokens.colors.bg.surface,
    ...tokens.shadows.inputFocus,
  },
  inputError: {
    borderColor: tokens.colors.danger.solid,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helperText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.text.muted,
    ...tokens.typography.micro,
    lineHeight: 15,
  },
  errorText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.danger.solid,
    ...tokens.typography.micro,
    lineHeight: 15,
  },
});

