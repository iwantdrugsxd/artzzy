/**
 * SecondaryButton - Standardized secondary action
 * Height: 56px, No glow, Consistent press feedback
 */
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, tokens } from "../../theme";
import { haptics } from "../../utils/haptics";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const SecondaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  iconLeft,
  style,
}) => {
  const handlePress = () => {
    if (disabled) return;
    haptics.light();
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <View style={styles.content}>
        {iconLeft ? <View style={styles.icon}>{iconLeft}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.xl,
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    backgroundColor: tokens.colors.bg.raised,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  label: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  icon: {
    marginRight: tokens.spacing.xs,
  },
});

