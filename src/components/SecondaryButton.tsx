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

type Props = {
  label: string;
  onPress: () => void;
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const SecondaryButton: React.FC<Props> = ({ label, onPress, iconLeft, style, disabled }) => {
  return (
    <Pressable
      onPress={onPress}
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
    backgroundColor: tokens.colors.bg.surface, // Black surface
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid, // Red outline
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
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

export default SecondaryButton;
