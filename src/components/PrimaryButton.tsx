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
import { colors, tokens } from "../theme";
import { haptics } from "../utils/haptics";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled,
  loading,
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
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={tokens.colors.primary.onPrimary} />
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
    height: 52,
    borderRadius: tokens.radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
    ...tokens.shadows.glow.medium, // Red glow
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
    gap: tokens.spacing.sm,
  },
  label: {
    color: tokens.colors.primary.onPrimary, // White text
    ...tokens.typography.body,
    fontWeight: "600",
  },
  icon: {
    marginRight: tokens.spacing.sm,
  },
});

export default PrimaryButton;
