/**
 * PrimaryButton - Standardized primary CTA
 * Height: 56px, Red glow, Consistent press feedback
 */
import React from "react";
import {
  ActivityIndicator,
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
  loading?: boolean;
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  iconLeft,
  style,
}) => {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    haptics.medium();
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={tokens.colors.primary.onPrimary} size="small" />
      ) : (
        <View style={styles.content}>
          {iconLeft ? <View style={styles.icon}>{iconLeft}</View> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.primary.solid,
    height: 56,
    borderRadius: tokens.radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.xl,
    ...tokens.shadows.buttonGlow,
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  label: {
    color: tokens.colors.primary.onPrimary,
    ...tokens.typography.body,
    fontWeight: "700",
    fontSize: 16,
  },
  icon: {
    marginRight: tokens.spacing.xs,
  },
});

