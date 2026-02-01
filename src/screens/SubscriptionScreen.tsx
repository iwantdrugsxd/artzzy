import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";

type Nav = StackNavigationProp<RootStackParamList, "Subscription">;

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Phase 4: Restore purchases
  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      // Stub: In production, this would call the payment provider's restore API
      logger.info("subscription.restore.started", { userId: user?.id });
      // TODO: Implement actual restore logic with payment provider
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert("Restore Purchases", "No purchases found to restore.");
      logger.info("subscription.restore.completed", { userId: user?.id });
    } catch (error) {
      logger.error("subscription.restore.failed", { error });
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 4: Manage subscription
  const handleManageSubscription = async () => {
    try {
      // Stub: In production, this would open the payment provider's management page
      logger.info("subscription.manage.started", { userId: user?.id });
      Alert.alert(
        "Manage Subscription",
        "In production, this would open your subscription management page."
      );
      // TODO: Implement actual subscription management redirect
    } catch (error) {
      logger.error("subscription.manage.failed", { error });
      Alert.alert("Error", "Failed to open subscription management.");
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <ScreenHeader title="Subscription" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + tokens.spacing.xl },
        ]}
      >
        <Card padding="lg" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name="star-outline"
              size={24}
              color={tokens.colors.primary.solid}
            />
            <Text style={styles.statusTitle}>Current Plan</Text>
          </View>
          <Text style={styles.statusText}>Free Plan</Text>
          <Text style={styles.statusSubtext}>
            Upgrade to Premium for advanced filters, spotlight visibility, and more.
          </Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={tokens.colors.primary.solid}
              />
              <Text style={styles.featureText}>Advanced radius filters</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={tokens.colors.primary.solid}
              />
              <Text style={styles.featureText}>Priority visibility (Spotlight)</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={tokens.colors.primary.solid}
              />
              <Text style={styles.featureText}>Unlimited daily vibes</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={tokens.colors.primary.solid}
              />
              <Text style={styles.featureText}>See who viewed your profile</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Upgrade to Premium"
            onPress={() => {
              logger.info("subscription.upgrade.started", { userId: user?.id });
              Alert.alert(
                "Upgrade to Premium",
                "Premium subscription coming soon!"
              );
            }}
            iconLeft={
              <Ionicons
                name="star"
                size={18}
                color={tokens.colors.primary.onPrimary}
              />
            }
          />
          <SecondaryButton
            label="Restore Purchases"
            onPress={handleRestorePurchases}
            disabled={loading}
            iconLeft={
              <Ionicons
                name="refresh"
                size={18}
                color={tokens.colors.text.primary}
              />
            }
          />
          <SecondaryButton
            label="Manage Subscription"
            onPress={handleManageSubscription}
            iconLeft={
              <Ionicons
                name="settings-outline"
                size={18}
                color={tokens.colors.text.primary}
              />
            }
          />
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
  scrollContent: {
    padding: tokens.spacing.xl,
  },
  statusCard: {
    marginBottom: tokens.spacing.xl,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  statusTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h3,
    fontWeight: "700",
  },
  statusText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h2,
    fontWeight: "700",
    marginBottom: tokens.spacing.sm,
  },
  statusSubtext: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    lineHeight: 20,
  },
  section: {
    marginBottom: tokens.spacing.xl,
  },
  sectionTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h3,
    fontWeight: "700",
    marginBottom: tokens.spacing.lg,
  },
  featureList: {
    gap: tokens.spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  featureText: {
    color: tokens.colors.text.secondary,
    ...tokens.typography.body,
  },
  actions: {
    gap: tokens.spacing.md,
  },
});

export default SubscriptionScreen;



