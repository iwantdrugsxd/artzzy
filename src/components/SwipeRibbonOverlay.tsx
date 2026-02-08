import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  tx: Animated.SharedValue<number>;
  threshold: number;
  height?: number;
};

export function SwipeRibbonOverlay({ tx, threshold, height = 44 }: Props) {
  const likeRibbonStyle = useAnimatedStyle(() => {
    const p = interpolate(tx.value, [0, threshold], [0, 1], Extrapolate.CLAMP);
    const width = interpolate(p, [0, 1], [18, 120], Extrapolate.CLAMP);
    const opacity = interpolate(p, [0, 0.12, 1], [0, 1, 1], Extrapolate.CLAMP);
    const scale = interpolate(p, [0, 1], [0.96, 1], Extrapolate.CLAMP);
    const bg = interpolateColor(p, [0, 1], ["rgba(255,255,255,0.0)", "rgba(0,200,120,0.92)"]);

    return {
      opacity,
      transform: [{ scale }],
      width,
      backgroundColor: bg,
    };
  });

  const passRibbonStyle = useAnimatedStyle(() => {
    const p = interpolate(tx.value, [0, -threshold], [0, 1], Extrapolate.CLAMP);
    const width = interpolate(p, [0, 1], [18, 120], Extrapolate.CLAMP);
    const opacity = interpolate(p, [0, 0.12, 1], [0, 1, 1], Extrapolate.CLAMP);
    const scale = interpolate(p, [0, 1], [0.96, 1], Extrapolate.CLAMP);
    const bg = interpolateColor(p, [0, 1], ["rgba(255,255,255,0.0)", "rgba(255,70,70,0.92)"]);

    return {
      opacity,
      transform: [{ scale }],
      width,
      backgroundColor: bg,
    };
  });

  return (
    <>
      <Animated.View style={[styles.ribbon, styles.right, { height }, likeRibbonStyle]}>
        <Text style={styles.text}>VIBE</Text>
      </Animated.View>

      <Animated.View style={[styles.ribbon, styles.left, { height }, passRibbonStyle]}>
        <Text style={styles.text}>PASS</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    position: "absolute",
    top: 18,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    shadowOpacity: 0,
    elevation: 0,
  },
  right: { right: 14 },
  left: { left: 14 },
  text: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 12,
  },
});

