import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { colors, layout } from "../theme";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  glow?: boolean;
};

const Screen: React.FC<Props> = ({
  children,
  scroll = false,
  style,
  contentContainerStyle,
  edges = ["top", "left", "right"],
  glow = false,
}) => {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      {glow ? (
        <View pointerEvents="none" style={styles.glowLayer}>
          <View style={styles.glowPrimary} />
          <View style={styles.glowAccent} />
          <View style={styles.glowSoft} />
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    position: "relative",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingBottom: layout.major,
    zIndex: 1,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowPrimary: {
    position: "absolute",
    top: -140,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  glowAccent: {
    position: "absolute",
    bottom: -180,
    left: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.accent,
    opacity: 0.12,
  },
  glowSoft: {
    position: "absolute",
    top: "35%",
    left: "45%",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
});

export default Screen;
