import React from "react";
import { Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors, tokens } from "../theme";

type Props = {
  onPress?: () => void;
  icon: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const IconButton: React.FC<Props> = ({
  onPress,
  icon,
  style,
  pressedStyle,
  disabled,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        pressed && !disabled ? styles.pressed : null,
        pressed && !disabled ? pressedStyle : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      hitSlop={tokens.spacing.sm}
    >
      {icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: 48, // Minimum touch target
    height: 48,
    borderRadius: 999, // Circular
    backgroundColor: tokens.colors.overlay.glass, // Glass bg
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
