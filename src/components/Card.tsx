import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, tokens } from "../theme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: "md" | "lg" | number;
  onPress?: () => void;
  variant?: "flat" | "raised" | "hero"; // Phase I: Card variants
};

const Card: React.FC<Props> = ({ children, style, padding = "md", onPress, variant = "flat" }) => {
  const paddingValue =
    typeof padding === "number" ? padding : padding === "lg" ? tokens.spacing.lg : tokens.spacing.md;

  const cardStyle = variant === "hero" ? styles.cardHero : variant === "raised" ? styles.cardRaised : styles.cardFlat;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { padding: paddingValue },
          pressed ? styles.pressed : null,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, { padding: paddingValue }, style]}>{children}</View>
  );
};

const styles = StyleSheet.create({
  cardFlat: {
    backgroundColor: tokens.colors.bg.surface, // Black surface
    borderRadius: tokens.radius.card,
    ...tokens.shadows.card.flat,
  },
  cardRaised: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    ...tokens.shadows.card.raised,
  },
  cardHero: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    ...tokens.shadows.card.hero, // Red edge glow
  },
  pressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
});

export default Card;
