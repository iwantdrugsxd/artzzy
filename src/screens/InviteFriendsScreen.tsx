import React, { useEffect, useState } from "react";
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
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { logger } from "../utils/logger";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import Card from "../components/Card";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";

type Nav = StackNavigationProp<RootStackParamList, "InviteFriends">;

// Phase 4: Generate unique referral code
const generateReferralCode = (userId: string): string => {
  // Use first 6 chars of userId + random 4 chars
  const prefix = userId.substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

const InviteFriendsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrCreateReferralCode = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.referralCode) {
            setReferralCode(userData.referralCode);
          } else {
            // Generate and save referral code
            const code = generateReferralCode(user.id);
            await setDoc(userRef, { referralCode: code }, { merge: true });
            setReferralCode(code);
            logger.info("referral.code.generated", { userId: user.id, code });
          }
        }
      } catch (error) {
        logger.error("referral.code.load.failed", { error });
      } finally {
        setLoading(false);
      }
    };
    loadOrCreateReferralCode();
  }, [user]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    Clipboard.setString(referralCode);
    Alert.alert("Copied!", "Referral code copied to clipboard");
    logger.info("referral.code.copied", { code: referralCode });
  };

  const handleShareCode = async () => {
    if (!referralCode) return;
    try {
      const shareText = `Join me on Partizo! Use my referral code: ${referralCode}\npartizo://referral/${referralCode}`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync({
          message: shareText,
        });
        logger.info("referral.code.shared", { code: referralCode });
      } else {
        Clipboard.setString(shareText);
        Alert.alert("Link copied", "Referral link copied to clipboard");
        logger.info("referral.code.share.fallback", { code: referralCode });
      }
    } catch (error) {
      logger.error("referral.code.share.failed", { error });
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <ScreenHeader title="Invite Friends" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + tokens.spacing.xl },
        ]}
      >
        <Card padding="lg" style={styles.codeCard}>
          <Text style={styles.label}>Your Referral Code</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : referralCode ? (
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{referralCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                <Ionicons name="copy-outline" size={20} color={tokens.colors.text.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <Text style={styles.description}>
            Share your code with friends. When they sign up using your code, you both get rewards!
          </Text>
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label="Share Code"
            onPress={handleShareCode}
            disabled={!referralCode || loading}
            iconLeft={<Ionicons name="share-outline" size={18} color={tokens.colors.primary.onPrimary} />}
          />
          <SecondaryButton
            label="Copy Code"
            onPress={handleCopyCode}
            disabled={!referralCode || loading}
            iconLeft={<Ionicons name="copy-outline" size={18} color={tokens.colors.text.primary} />}
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
  codeCard: {
    marginBottom: tokens.spacing.xl,
  },
  label: {
    color: tokens.colors.text.secondary,
    ...tokens.typography.caption,
    marginBottom: tokens.spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: tokens.radius.button,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
    ...tokens.shadows.glow.soft,
  },
  codeText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h2,
    fontWeight: "700",
    letterSpacing: 2,
  },
  copyButton: {
    padding: tokens.spacing.sm,
  },
  description: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    lineHeight: 20,
  },
  loadingText: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body,
    marginBottom: tokens.spacing.lg,
  },
  actions: {
    gap: tokens.spacing.md,
  },
});

export default InviteFriendsScreen;


