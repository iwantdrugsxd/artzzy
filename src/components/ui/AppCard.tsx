/**
 * AppCard - Standardized card component with elevation variants
 * Variants: flat, raised, hero
 */
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { tokens } from "../../theme";

type Props = {
  children: React.ReactNode;
  variant?: "flat" | "raised" | "hero";
  padding?: "sm" | "md" | "lg" | number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export const AppCard: React.FC<Props> = ({
  children,
  variant = "flat",
  padding = "md",
  style,
  onPress,
}) => {
  const paddingValue =
    typeof padding === "number"
      ? padding
      : padding === "lg"
        ? tokens.spacing.xl
        : padding === "sm"
          ? tokens.spacing.sm
          : tokens.spacing.lg;

  const cardStyle = [
    styles.card,
    variant === "flat" && styles.flat,
    variant === "raised" && styles.raised,
    variant === "hero" && styles.hero,
    { padding: paddingValue },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  flat: {
    ...tokens.shadows.card.flat,
  },
  raised: {
    ...tokens.shadows.card.raised,
  },
  hero: {
    ...tokens.shadows.card.hero,
  },
  pressed: {
    backgroundColor: tokens.colors.bg.raised,
  },
});

