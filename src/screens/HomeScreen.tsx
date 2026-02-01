import React from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens } from "../theme";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { haptics } from "../utils/haptics";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const HomeScreen: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const quickActions = [
    {
      id: "discover",
      label: "Discover",
      icon: "compass",
      color: colors.primary,
      onPress: () => navigation.navigate("Outings"),
    },
    {
      id: "people",
      label: "People",
      icon: "people",
      color: colors.primary,
      onPress: () => navigation.navigate("People"),
    },
    {
      id: "create",
      label: "Create Outing",
      icon: "add-circle",
      color: colors.primary,
      onPress: () => navigation.navigate("CreateOuting"),
    },
    {
      id: "profile",
      label: "My Profile",
      icon: "person",
      color: colors.primary,
      onPress: () => navigation.navigate("MyProfile"),
    },
  ];

  return (
    <Screen contentContainerStyle={styles.container} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bold Hero Header */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroName}>{profile?.name || "Partizo"}</Text>
          <Text style={styles.heroSubtitle}>Ready to find your next vibe?</Text>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                haptics.medium();
                action.onPress();
              }}
            >
              <View style={[styles.actionIconContainer, { borderColor: action.color }]}>
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
  },
  heroSection: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.xxl,
    paddingBottom: tokens.spacing.xl,
  },
  heroTitle: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: tokens.spacing.sm,
  },
  heroName: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h1,
    fontWeight: "800",
    marginBottom: tokens.spacing.sm,
  },
  heroSubtitle: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    lineHeight: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: tokens.spacing.xl,
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing.xxl,
  },
  actionCard: {
    width: "47%",
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    position: "relative",
    overflow: "hidden",
    ...tokens.shadows.card.flat,
  },
  actionCardPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: tokens.colors.primary.solid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.lg,
    backgroundColor: tokens.colors.primary.soft,
    shadowColor: tokens.colors.primary.solid,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  actionLabel: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default HomeScreen;
