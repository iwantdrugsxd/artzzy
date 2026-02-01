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
import { colors, tokens } from "../theme";

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

const TextField: React.FC<Props> = ({
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
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          editable={rest.editable !== false}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={tokens.colors.text.subtle}
          style={[styles.input, multiline ? styles.inputMultiline : null, style]}
          autoCorrect={false}
          autoComplete="off"
          textContentType={rest.textContentType || "none"}
          importantForAutofill="no"
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
    backgroundColor: tokens.colors.overlay.glass, // Glass background
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    minHeight: 52,
    zIndex: 1,
  },
  inputFocused: {
    borderColor: tokens.colors.primary.solid, // Red border
    ...tokens.shadows.glow.medium, // Red focus glow
  },
  inputError: {
    borderColor: tokens.colors.primary.solid, // Red for errors too
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    padding: 0,
    margin: 0,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helperText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.text.muted,
    ...tokens.typography.micro,
  },
  errorText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.primary.solid, // Red for errors
    ...tokens.typography.micro,
  },
});

export default TextField;
