import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, tokens } from "../theme";
import { haptics } from "../utils/haptics";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const Pill: React.FC<Props> = ({ label, selected, onPress, icon, style }) => {
  const handlePress = () => {
    if (!onPress) return;
    haptics.light();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        style,
      ]}
      hitSlop={tokens.spacing.sm}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, selected ? styles.labelSelected : null]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.base, // Black bg
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  selected: {
    backgroundColor: tokens.colors.bg.base, // Black bg
    borderColor: tokens.colors.primary.solid, // Red stroke
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.8,
  },
  label: {
    color: tokens.colors.text.primary, // White text
    ...tokens.typography.micro,
  },
  labelSelected: {
    color: tokens.colors.text.primary, // White text
  },
  icon: {
    marginRight: tokens.spacing.sm,
  },
});

export default Pill;
