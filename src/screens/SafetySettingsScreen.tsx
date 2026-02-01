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
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { logger } from "../utils/logger";
import EmptyState from "../components/EmptyState";

type Nav = StackNavigationProp<RootStackParamList, "SafetySettings">;

const SafetySettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Load blocked users
        const blocksSnap = await getDocs(
          query(collection(db, "blocks"), where("blockerUid", "==", user.id))
        );
        const blockedUserIds = blocksSnap.docs.map((d) => d.data().blockedUid);
        
        // Load user profiles for blocked users
        const blockedProfiles = await Promise.all(
          blockedUserIds.map(async (blockedUid) => {
            const blockDoc = blocksSnap.docs.find(
              (d) => d.data().blockedUid === blockedUid
            );
            try {
              const userSnap = await getDoc(doc(db, "users", blockedUid));
              if (userSnap.exists()) {
                return {
                  id: blockDoc?.id || "",
                  blockedUid,
                  ...userSnap.data(),
                };
              }
            } catch (error) {
              logger.error("safety.blocked.user.load.failed", { error, blockedUid });
            }
            return {
              id: blockDoc?.id || "",
              blockedUid,
              name: "Unknown User",
            };
          })
        );
        setBlockedUsers(blockedProfiles);

        // Load reports (read-only)
        // Note: Reports collection doesn't allow reads per rules, so we'll show a message
        setReports([]);
      } catch (error) {
        logger.error("safety.settings.load.failed", { error });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleUnblock = (blockedUid: string, blockId: string, userName: string) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${userName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "blocks", blockId));
              setBlockedUsers((prev) => prev.filter((u) => u.blockedUid !== blockedUid));
              logger.info("user.unblocked", { blockedUid });
            } catch (error) {
              logger.error("user.unblock.failed", { error });
              Alert.alert("Error", "Failed to unblock user. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <ScreenHeader title="Safety & Privacy" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + tokens.spacing.lg },
        ]}
      >
        {/* Blocked Users Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          <Text style={styles.sectionSubtitle}>
            Users you've blocked won't be able to message you or see you in their feed.
          </Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : blockedUsers.length === 0 ? (
            <EmptyState
              title="No blocked users"
              subtitle="Users you block will appear here."
              icon={<Ionicons name="shield-checkmark" size={48} color={tokens.colors.text.subtle} />}
            />
          ) : (
            <View style={styles.list}>
              {blockedUsers.map((blockedUser) => (
                <View key={blockedUser.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {blockedUser.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.listItemText}>
                      <Text style={styles.listItemName}>
                        {blockedUser.name || "Unknown User"}
                      </Text>
                      {blockedUser.city && (
                        <Text style={styles.listItemSubtext}>{blockedUser.city}</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() =>
                      handleUnblock(
                        blockedUser.blockedUid,
                        blockedUser.id,
                        blockedUser.name || "User"
                      )
                    }
                  >
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Reports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>
          <Text style={styles.sectionSubtitle}>
            Your reports are reviewed by our team. Reports are private and cannot be viewed here.
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={tokens.colors.primary.solid} />
            <Text style={styles.infoText}>
              Reports are handled confidentially. If you need to report someone, use the report option in their profile or chat.
            </Text>
          </View>
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
  section: {
    marginBottom: tokens.spacing.xl * 2,
  },
  sectionTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h2,
    fontWeight: "700",
    marginBottom: tokens.spacing.sm,
  },
  sectionSubtitle: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    marginBottom: tokens.spacing.lg,
  },
  loadingText: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    textAlign: "center",
    padding: tokens.spacing.lg,
  },
  list: {
    gap: tokens.spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.primary.solid,
    alignItems: "center",
    justifyContent: "center",
    marginRight: tokens.spacing.lg,
  },
  avatarText: {
    color: tokens.colors.primary.onPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  listItemText: {
    flex: 1,
  },
  listItemName: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body,
    fontWeight: "600",
  },
  listItemSubtext: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    fontSize: 12,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  unblockButtonText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.body2,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: tokens.colors.primary.soft,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
  },
  infoText: {
    flex: 1,
    color: tokens.colors.text.primary,
    ...tokens.typography.body2,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default SafetySettingsScreen;

