import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { colors, layout, tokens } from "../theme";
import Screen from "../components/Screen";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const messages = [
  "Syncing your vibe...",
  "Loading nearby plans...",
  "Warming up the feed...",
];

const SplashScreen: React.FC = () => {
  const [index, setIndex] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    scaleLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      scaleLoop.stop();
      glowLoop.stop();
    };
  }, [scale, glowOpacity]);

  // Generate noise gradient circles
  const noiseCircles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 50,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    opacity: Math.random() * 0.1 + 0.02,
  }));

  return (
    <Screen
      contentContainerStyle={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* Noise gradient background */}
      <View style={styles.noiseLayer}>
        {noiseCircles.map((circle) => (
          <View
            key={circle.id}
            style={[
              styles.noiseCircle,
              {
                width: circle.size,
                height: circle.size,
                borderRadius: circle.size / 2,
                left: circle.x,
                top: circle.y,
                opacity: circle.opacity,
                backgroundColor: Math.random() > 0.5 ? tokens.colors.primary.solid : tokens.colors.bg.base,
              },
            ]}
          />
        ))}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: glowOpacity,
              },
            ]}
          />
          <View style={styles.logoDot} />
        </Animated.View>
        <Text style={styles.title}>PARTIZO</Text>
        <Text style={styles.tagline}>Find your vibe.{"\n"}Find your people.</Text>
      </View>

      <Text style={styles.footer}>{messages[index]}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.gutter,
  },
  noiseLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  noiseCircle: {
    position: "absolute",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: layout.major,
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: tokens.colors.primary.solid,
    shadowColor: tokens.colors.primary.solid,
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.primary.solid,
    zIndex: 1,
    ...tokens.shadows.card.hero,
  },
  title: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h1,
    marginBottom: tokens.spacing.sm,
    letterSpacing: 3,
    fontWeight: "800",
    textShadowColor: tokens.colors.primary.solid,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    textAlign: "center",
    color: tokens.colors.text.muted,
    ...tokens.typography.body,
    lineHeight: 24,
  },
  footer: {
    position: "absolute",
    bottom: tokens.spacing.xxl,
    color: tokens.colors.text.subtle,
    ...tokens.typography.micro,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    zIndex: 1,
  },
});

export default SplashScreen;
