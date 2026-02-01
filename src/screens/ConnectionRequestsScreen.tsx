import React, { useEffect, useMemo, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import InlineError from "../components/InlineError";
import { colors, layout, radius, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { ConnectionRequest } from "../types/connection";
import { connectionStorage } from "../utils/connectionStorage";
import { RootStackParamList } from "../types/navigation";

const TABS = ["Incoming", "Sent", "History"] as const;

type TabKey = (typeof TABS)[number];

type RequestWithProfile = ConnectionRequest & {
  id: string;
  otherProfile?: any;
};

type Nav = StackNavigationProp<RootStackParamList, "ConnectionRequests">;

const ConnectionRequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [incoming, setIncoming] = useState<RequestWithProfile[]>([]);
  const [sent, setSent] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("Incoming");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const incomingQ = query(
      collection(db, "connectionRequests"),
      where("toUid", "==", user.id),
      orderBy("createdAt", "desc")
    );
    const sentQ = query(
      collection(db, "connectionRequests"),
      where("fromUid", "==", user.id),
      orderBy("createdAt", "desc")
    );

    const enrich = async (items: RequestWithProfile[], otherKey: "fromUid" | "toUid") => {
      const withProfiles = await Promise.all(
        items.map(async (item) => {
          const otherUid = item[otherKey];
          try {
            const snap = await getDoc(doc(db, "users", otherUid));
            return { ...item, otherProfile: snap.exists() ? snap.data() : null };
          } catch {
            return item;
          }
        })
      );
      return withProfiles;
    };

    const incomingUnsub = onSnapshot(
      incomingQ,
      async (snap) => {
        try {
          const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ConnectionRequest) }));
          const enriched = await enrich(data as RequestWithProfile[], "fromUid");
          setIncoming(enriched);
          setLoading(false);
          setError(null);
          enriched
            .filter((item) => item.status === "pending")
            .forEach((item) => {
              connectionStorage.expireIfNeeded(item.id, user.id);
            });
        } catch (loadError) {
          setError("Failed to load requests.");
          setLoading(false);
        }
      },
      () => {
        setError("Failed to load requests.");
        setLoading(false);
      }
    );

    const sentUnsub = onSnapshot(
      sentQ,
      async (snap) => {
        try {
          const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ConnectionRequest) }));
          const enriched = await enrich(data as RequestWithProfile[], "toUid");
          setSent(enriched);
          setLoading(false);
          setError(null);
        } catch {
          setError("Failed to load requests.");
          setLoading(false);
        }
      },
      () => {
        setError("Failed to load requests.");
        setLoading(false);
      }
    );

    return () => {
      incomingUnsub();
      sentUnsub();
    };
  }, [user]);

  const requests = useMemo(() => {
    if (tab === "Incoming") {
      return incoming.filter((item) => item.status === "pending");
    }
    if (tab === "Sent") {
      return sent.filter((item) => item.status === "pending");
    }
    return [...incoming, ...sent].filter((item) => item.status !== "pending");
  }, [tab, incoming, sent]);

  const getExpiryLabel = (item: RequestWithProfile) => {
    if (item.status !== "pending") return null;
    if (!item.expiresAt?.toDate) return null;
    const expires = item.expiresAt.toDate();
    const diffMs = expires.getTime() - Date.now();
    const hours = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 0);
    return `Expires in ${hours}h`;
  };

  const getStatusLabel = (item: RequestWithProfile) => {
    switch (item.status) {
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Passed";
      case "expired":
        return "Expired";
      case "cancelled":
        return "Cancelled";
      default:
        return "";
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Vibe Requests" />
      <View style={styles.tabsRow}>
        {TABS.map((label) => {
          const active = tab === label;
          return (
            <Pressable
              key={label}
              onPress={() => setTab(label)}
              style={[styles.tab, active ? styles.tabActive : null]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <InlineError message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonStack}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={`req-skeleton-${index}`} style={styles.skeletonRow}>
              <Skeleton width={52} height={52} radius={26} />
              <View style={styles.skeletonBody}>
                <Skeleton height={14} width="60%" radius={8} />
                <Skeleton height={12} width="85%" radius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : requests.length === 0 ? (
        <EmptyState
          title={
            tab === "Incoming"
              ? "No vibes yet"
              : tab === "Sent"
                ? "No vibes sent"
                : "No history"
          }
          subtitle={
            tab === "Incoming"
              ? "You’ll see requests here."
              : tab === "Sent"
                ? "Send a vibe to start something."
                : "Past decisions show up here."
          }
          icon={<Ionicons name="sparkles" size={48} color={colors.textSubtle} />}
        />
      ) : (
        <View style={styles.list}>
          {requests.map((item) => {
            const profile = item.otherProfile;
            const name = profile?.name || "Unknown";
            const city = profile?.city || "";
            const avatar = profile?.profile_photo_url || null;
            const isIncoming = tab === "Incoming" && item.status === "pending";
            const isSent = tab === "Sent" && item.status === "pending";
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed ? styles.cardPressed : null,
                ]}
                onPress={() => {
                  if (isIncoming) {
                    navigation.navigate("ConnectionReview", { requestId: item.id });
                  }
                }}
              >
                <View style={styles.avatarWrap}>
                  {avatar ? (
                    <ImageBackground
                      source={{ uri: avatar }}
                      style={styles.avatar}
                      imageStyle={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{name[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{name}</Text>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchText}>{item.vibeScore}%</Text>
                    </View>
                  </View>
                  {city ? <Text style={styles.meta}>{city}</Text> : null}
                  {item.status === "pending" ? (
                    <Text style={styles.meta}>{getExpiryLabel(item)}</Text>
                  ) : (
                    <Text style={styles.meta}>{getStatusLabel(item)}</Text>
                  )}
                </View>
                {isIncoming ? (
                  <View style={styles.actionChip}>
                    <Text style={styles.actionText}>Review</Text>
                  </View>
                ) : null}
                {isSent ? (
                  <View style={styles.actionChipMuted}>
                    <Text style={styles.actionTextMuted}>Pending</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  tabsRow: {
    flexDirection: "row",
    gap: layout.compact,
    marginBottom: layout.section,
  },
  tab: {
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    gap: layout.section,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.section,
    padding: layout.section,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface1,
  },
  cardPressed: {
    backgroundColor: colors.surface2,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarImage: {
    borderRadius: 26,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  cardContent: {
    flex: 1,
    gap: layout.compact,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  matchBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: layout.element,
    paddingVertical: layout.compact,
  },
  matchText: {
    color: colors.textPrimary,
    ...typography.micro,
  },
  meta: {
    color: colors.textMuted,
    ...typography.micro,
  },
  actionChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: layout.element,
    paddingVertical: layout.compact,
  },
  actionChipMuted: {
    backgroundColor: colors.surface2,
    borderRadius: radius.button,
    paddingHorizontal: layout.element,
    paddingVertical: layout.compact,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.onPrimary,
    ...typography.micro,
  },
  actionTextMuted: {
    color: colors.textSecondary,
    ...typography.micro,
  },
});

export default ConnectionRequestsScreen;
