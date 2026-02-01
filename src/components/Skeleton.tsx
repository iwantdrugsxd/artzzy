import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors, tokens } from "../theme";

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const Skeleton: React.FC<Props> = ({ width = "100%", height = 12, radius = 12, style }) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: tokens.animation.transition,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: tokens.animation.transition,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  // Convert width to number if it's a percentage string for Animated.View
  const widthValue = typeof width === "string" ? width : width;

  return (
    <Animated.View
      style={[
        styles.base,
        { width: widthValue, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: tokens.colors.bg.surface, // Black base
    // White shimmer via opacity animation
  },
});

export default Skeleton;
