import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ImageBackground,
} from "react-native";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import InlineError from "../components/InlineError";
import IconButton from "../components/IconButton";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { logger } from "../utils/logger";
import { haptics } from "../utils/haptics";

type Nav = StackNavigationProp<RootStackParamList, "Home">;

type TabKey = "all" | "alerts" | "invites" | "activity";

type NotificationItem = {
  id: string;
  type:
    | "join_request"
    | "request_approved"
    | "request_declined"
    | "system"
    | "connection_request"
    | "connection_accepted"
    | "connection_rejected"
    | "connection_expired"
    | "saved_connection_confirmed";
  title: string;
  body: string;
  outingId?: string;
  requesterId?: string;
  requestId?: string;
  fromUid?: string;
  chatId?: string;
  read: boolean;
  createdAt?: any;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "alerts", label: "ALERTS" },
  { key: "invites", label: "INVITES" },
  { key: "activity", label: "ACTIVITY" },
];

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.id, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as NotificationItem),
        }));
        setItems(data);
        setLoading(false);
        setError(null);
      },
      (snapError) => {
        logger.error("notifications.load.failed", { error: snapError });
        setError("Failed to load notifications.");
        setLoading(false);
      }
    );

    const unreadQ = query(
      collection(db, "users", user.id, "notifications"),
      where("read", "==", false)
    );
    const unsubscribeUnread = onSnapshot(unreadQ, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => {
      unsubscribe();
      unsubscribeUnread();
    };
  }, [user]);

  const handleNotificationPress = async (notification: NotificationItem) => {
    if (!user) return;

    if (!notification.read) {
      try {
        await updateDoc(doc(db, "users", user.id, "notifications", notification.id), {
          read: true,
        });
      } catch (error) {
        logger.error("notification.mark.read.failed", { error });
      }
    }

    if (notification.type === "join_request" && notification.requesterId && notification.outingId) {
      navigation.navigate("Profile", {
        userId: notification.requesterId,
        outingId: notification.outingId,
        context: "host_request",
      });
    } else if (notification.type === "connection_request" && notification.requestId) {
      navigation.navigate("ConnectionReview", { requestId: notification.requestId });
    } else if (
      notification.type === "connection_accepted" &&
      notification.chatId &&
      notification.fromUid
    ) {
      navigation.navigate("DirectChat", {
        chatId: notification.chatId,
        otherUid: notification.fromUid,
      });
    } else if (notification.outingId) {
      navigation.navigate("OutingDetails", { outingId: notification.outingId });
    }
  };

  const handleDecline = async (notification: NotificationItem) => {
    if (!user) return;
    haptics.heavy();
    if (!notification.read) {
      try {
        await updateDoc(doc(db, "users", user.id, "notifications", notification.id), {
          read: true,
        });
      } catch (error) {
        logger.error("notification.mark.read.failed", { error });
      }
    }
  };

  const formatTime = (value: any) => {
    if (!value?.toDate) return "";
    const date = value.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "join_request":
        return "person-add";
      case "request_approved":
        return "checkmark-circle";
      case "request_declined":
      case "connection_rejected":
      case "connection_expired":
        return "close-circle";
      case "connection_request":
        return "heart";
      case "connection_accepted":
        return "chatbubbles";
      default:
        return "notifications";
    }
  };

  const getNotificationTone = (type: NotificationItem["type"]) => {
    switch (type) {
      case "join_request":
        return colors.primary;
      case "request_approved":
        return colors.primary;
      case "request_declined":
      case "connection_rejected":
      case "connection_expired":
        return colors.danger;
      case "connection_request":
      case "connection_accepted":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getNotificationSoft = (type: NotificationItem["type"]) => {
    switch (type) {
      case "join_request":
        return colors.primarySoft;
      case "request_approved":
        return colors.primarySoft;
      case "request_declined":
      case "connection_rejected":
      case "connection_expired":
        return colors.dangerSoft;
      case "connection_request":
      case "connection_accepted":
        return colors.primarySoft;
      default:
        return colors.surface2;
    }
  };

  const getTabKeyForType = (type: NotificationItem["type"]): TabKey => {
    switch (type) {
      case "join_request":
        return "invites";
      case "request_approved":
      case "request_declined":
      case "connection_accepted":
      case "connection_rejected":
      case "connection_expired":
        return "alerts";
      case "connection_request":
        return "invites";
      default:
        return "activity";
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => getTabKeyForType(item.type) === activeTab);
  }, [activeTab, items]);

  const sections = useMemo(() => {
    const today: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    filteredItems.forEach((item) => {
      const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
      if (createdAt && isSameDay(createdAt, now)) {
        today.push(item);
      } else if (createdAt && createdAt.getTime() > weekAgo.getTime()) {
        thisWeek.push(item);
      } else {
        earlier.push(item);
      }
    });

    const output: { title: string; data: NotificationItem[] }[] = [];
    if (today.length) output.push({ title: "TODAY", data: today });
    if (thisWeek.length) output.push({ title: "THIS WEEK", data: thisWeek });
    if (earlier.length) output.push({ title: "EARLIER", data: earlier });
    return output;
  }, [filteredItems]);

  if (!user) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <EmptyState title="Sign in to see updates" />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <View style={styles.iconWrap}>
            <IconButton
              icon={<Ionicons name="notifications" size={18} color={colors.textSecondary} />}
            />
            {unreadCount > 0 ? <View style={styles.dot} /> : null}
          </View>
          <IconButton
            onPress={() => navigation.navigate("MyProfile")}
            icon={
              profile?.profile_photo_url ? (
                <ImageBackground
                  source={{ uri: profile.profile_photo_url }}
                  style={styles.avatar}
                  imageStyle={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={18} color={colors.textSecondary} />
              )
            }
          />
        </View>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                haptics.light();
                setActiveTab(tab.key);
              }}
              style={({ pressed }) => [
                styles.tab,
                isActive ? styles.tabActive : null,
                pressed ? styles.tabPressed : null,
              ]}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <InlineError message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonStack}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={`notif-skeleton-${index}`} style={styles.skeletonRow}>
              <Skeleton width={52} height={52} radius={26} />
              <View style={styles.skeletonBody}>
                <Skeleton height={14} width="70%" radius={8} />
                <Skeleton height={12} width="90%" radius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No updates yet"
          subtitle="Join an outing to get started."
          icon={<Ionicons name="notifications-outline" size={48} color={colors.textSubtle} />}
        />
      ) : (
        <View style={styles.list}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      !item.read ? styles.rowUnread : null,
                      pressed ? styles.rowPressed : null,
                    ]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getNotificationSoft(item.type) },
                      ]}
                    >
                      <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={18}
                        color={getNotificationTone(item.type)}
                      />
                    </View>
                    <View style={styles.rowContent}>
                      <Text
                        style={[
                          styles.rowTitle,
                          !item.read ? styles.rowTitleUnread : null,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.rowBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>
                    <View style={styles.rowMeta}>
                      <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
                      {!item.read ? <View style={styles.unreadDot} /> : null}
                    </View>
                  </Pressable>
                  {index < section.data.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: layout.major,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: layout.section,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.element,
  },
  iconWrap: {
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.bg,
  },
  avatar: {
    width: 32,
    height: 32,
  },
  avatarImage: {
    borderRadius: 16,
  },
  tabsRow: {
    flexDirection: "row",
    gap: layout.compact,
    marginBottom: layout.section,
  },
  tab: {
    borderRadius: radius.pill,
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPressed: {
    transform: [{ scale: 0.98 }],
  },
  tabText: {
    color: colors.textSecondary,
    ...typography.micro,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  skeletonStack: {
    gap: layout.section,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.section,
  },
  skeletonBody: {
    flex: 1,
    gap: layout.compact,
  },
  list: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: layout.gutter,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    backgroundColor: colors.bg,
    flexDirection: "row",
    paddingHorizontal: layout.gutter,
    paddingVertical: 12,
    alignItems: "center",
    gap: 12,
    minHeight: 60,
  },
  rowUnread: {
    backgroundColor: colors.surface1,
  },
  rowPressed: {
    backgroundColor: colors.surface1,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.divider,
    marginLeft: layout.gutter + 44,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  rowTitleUnread: {
    fontWeight: "700",
  },
  rowBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 60,
  },
  rowTime: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});

export default NotificationsScreen;
