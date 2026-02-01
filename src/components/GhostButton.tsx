import React from "react";
import {
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
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const GhostButton: React.FC<Props> = ({ label, onPress, iconLeft, style, disabled }) => {
  const handlePress = () => {
    if (disabled) return;
    haptics.light();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
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
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
    // No background
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  label: {
    color: tokens.colors.text.primary, // White text
    ...tokens.typography.body,
    fontWeight: "600",
  },
  icon: {
    marginRight: tokens.spacing.sm,
  },
});

export default GhostButton;



