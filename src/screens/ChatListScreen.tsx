import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, ImageBackground } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs, doc, getDoc, onSnapshot, writeBatch, query, where } from "firebase/firestore";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import IconButton from "../components/IconButton";
import { Ionicons } from "@expo/vector-icons";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import InlineError from "../components/InlineError";
import { db } from "../firebaseApp";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";

type ActiveOuting = {
  outingId: string;
  title: string;
  coverImageUrl?: string;
  dateTime?: any;
  area?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  lastSenderName?: string;
};

type DirectChat = {
  chatId: string;
  otherUid: string;
  otherName: string;
  otherPhoto?: string;
  lastMessage?: string;
  lastMessageAt?: any;
};

type Nav = StackNavigationProp<RootStackParamList, "Home">;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<ActiveOuting[]>([]);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        
        // Load direct chats
        const directChatsQuery = query(
          collection(db, "directChats"),
          where("participants", "array-contains", user.id)
        );
        const directChatsSnap = await getDocs(directChatsQuery);
        
        const now = Date.now();
        const directChatsData = await Promise.all(
          directChatsSnap.docs
            .map((docItem) => {
              const data = docItem.data();
              const chatId = docItem.id;
              
              // Filter expired chats
              if (data.expiresAt?.toDate) {
                const expiresAt = data.expiresAt.toDate().getTime();
                if (now >= expiresAt) {
                  return null;
                }
              }
              
              // Only show active or saved chats
              if (data.state !== "active" && data.state !== "saved") {
                return null;
              }
              
              // Find other user
              const participants = data.participants || [];
              const otherUid = participants.find((uid: string) => uid !== user.id);
              
              if (!otherUid) {
                return null;
              }
              
              return {
                chatId,
                otherUid,
                lastMessage: data.lastMessage?.text || "Start the conversation...",
                lastMessageAt: data.lastMessage?.createdAt || null,
                state: data.state,
              };
            })
            .filter(Boolean) as Array<{
              chatId: string;
              otherUid: string;
              lastMessage: string;
              lastMessageAt: any;
              state: string;
            }>
        );
        
        // Load other user profiles for direct chats
        const directChatsWithProfiles = await Promise.all(
          directChatsData.map(async (chat) => {
            try {
              const otherProfileSnap = await getDoc(doc(db, "users", chat.otherUid));
              if (otherProfileSnap.exists()) {
                const otherProfile = otherProfileSnap.data();
                return {
                  chatId: chat.chatId,
                  otherUid: chat.otherUid,
                  otherName: otherProfile.name || "Unknown",
                  otherPhoto: otherProfile.profile_photo_url || otherProfile.primaryPhotoUrl || undefined,
                  lastMessage: chat.lastMessage,
                  lastMessageAt: chat.lastMessageAt,
                };
              }
              return {
                chatId: chat.chatId,
                otherUid: chat.otherUid,
                otherName: "Unknown",
                otherPhoto: undefined,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
              };
            } catch (error) {
              logger.error("chat.direct.profile.load.failed", { error, otherUid: chat.otherUid });
              return {
                chatId: chat.chatId,
                otherUid: chat.otherUid,
                otherName: "Unknown",
                otherPhoto: undefined,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
              };
            }
          })
        );
        
        // Sort direct chats by last message time
        directChatsWithProfiles.sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          const aTime = a.lastMessageAt.toDate?.()?.getTime() || 0;
          const bTime = b.lastMessageAt.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
        
        setDirectChats(directChatsWithProfiles);
        
        // Load outing chats (existing code)
        const activeSnap = await getDocs(
          collection(db, "users", user.id, "activeOutings")
        );

        const threadsData = await Promise.all(
          activeSnap.docs.map(async (docItem) => {
            const data = docItem.data();
            const outingId = data.outingId ?? docItem.id;

            try {
              const outingRef = doc(db, "outings", outingId);
              const outingSnap = await getDoc(outingRef);
              if (outingSnap.exists()) {
                const outingData = outingSnap.data() as any;
                const date: Date | null = outingData.dateTime?.toDate
                  ? outingData.dateTime.toDate()
                  : null;
                const durationMins: number = outingData.durationMins ?? 0;
                if (date && durationMins > 0) {
                  const endMs = date.getTime() + durationMins * 60 * 1000;
                  if (Date.now() >= endMs && outingData.status === "active") {
                    const batch = writeBatch(db);
                    batch.update(outingRef, { status: "ended" });
                    const pastRef = doc(db, "users", user.id, "pastOutings", outingId);
                    batch.set(pastRef, {
                      outingId,
                      title: outingData.title ?? data.title ?? "Outing",
                      coverImageUrl: outingData.coverImageUrl ?? data.coverImageUrl ?? null,
                      dateTime: outingData.dateTime ?? data.dateTime ?? null,
                      role: data.role ?? "member",
                      city: outingData.city ?? null,
                      area: outingData.area ?? data.area ?? null,
                      endedAt: new Date(endMs),
                    });
                    batch.delete(doc(db, "users", user.id, "activeOutings", docItem.id));
                    await batch.commit();
                    return null;
                  }
                }
              }
            } catch (cleanupError) {
              logger.error("chat.active.cleanup.failed", { outingId, error: cleanupError });
            }

            let lastMessage = "Start the conversation...";
            let lastMessageAt = null;
            let lastSenderName = null;

            try {
              const chatMetaSnap = await getDoc(
                doc(db, "outings", outingId, "chatMeta", "meta")
              );
              if (chatMetaSnap.exists()) {
                const meta = chatMetaSnap.data();
                lastMessage = meta.lastMessageText || lastMessage;
                lastMessageAt = meta.lastMessageAt;
                lastSenderName = meta.lastSenderName;
              }
            } catch (metaError) {
              logger.error("chat.meta.load.failed", { outingId, error: metaError });
            }

            return {
              outingId,
              title: data.title ?? "Outing",
              coverImageUrl: data.coverImageUrl ?? null,
              dateTime: data.dateTime ?? null,
              area: data.area ?? null,
              lastMessage,
              lastMessageAt,
              lastSenderName,
            };
          })
        );

        threadsData.sort((a, b) => {
          if (!a?.lastMessageAt && !b?.lastMessageAt) return 0;
          if (!a?.lastMessageAt) return 1;
          if (!b?.lastMessageAt) return -1;
          const aTime = a.lastMessageAt.toDate?.()?.getTime() || 0;
          const bTime = b.lastMessageAt.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });

        setThreads(threadsData.filter(Boolean) as ActiveOuting[]);
        setError(null);
      } catch (loadError) {
        logger.error("chat.list.load.failed", { error: loadError });
        setError("Failed to load chats.");
      } finally {
        setLoading(false);
      }
    };

    load();

    // Subscribe to both activeOutings and directChats changes
    const unsubscribeOutings = onSnapshot(
      collection(db, "users", user.id, "activeOutings"),
      () => {
        load();
      }
    );
    
    const unsubscribeDirectChats = onSnapshot(
      query(
        collection(db, "directChats"),
        where("participants", "array-contains", user.id)
      ),
      () => {
        load();
      }
    );

    return () => {
      unsubscribeOutings();
      unsubscribeDirectChats();
    };
  }, [user]);

  const formatTime = (value: any) => {
    if (!value?.toDate) return "";
    const date = value.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Chats"
        actions={
          <IconButton
            onPress={() => {}}
            icon={<Ionicons name="create-outline" size={18} color={colors.textPrimary} />}
          />
        }
      />
      {error ? <InlineError message={error} /> : null}

      {loading ? (
        <View style={styles.skeletonStack}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={`chat-skeleton-${index}`} style={styles.skeletonRow}>
              <Skeleton width={52} height={52} radius={26} />
              <View style={styles.skeletonBody}>
                <Skeleton height={14} width="60%" radius={8} />
                <Skeleton height={12} width="85%" radius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : threads.length === 0 && directChats.length === 0 ? (
        <EmptyState
          title="No chats yet"
          subtitle="Join an outing or connect with someone to start a conversation."
        />
      ) : (
        <>
          {/* Direct Chats Section */}
          {directChats.length > 0 && (
            <>
              {directChats.map((chat, index) => {
                const unread =
                  chat.lastMessage &&
                  chat.lastMessage !== "Start the conversation...";
                return (
                  <View key={chat.chatId}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.thread,
                        pressed ? styles.threadPressed : null,
                      ]}
                      onPress={() =>
                        navigation.navigate("DirectChat", {
                          chatId: chat.chatId,
                          otherUid: chat.otherUid,
                        })
                      }
                    >
                      <View style={styles.avatar}>
                        {chat.otherPhoto ? (
                          <ImageBackground
                            source={{ uri: chat.otherPhoto }}
                            style={styles.threadImage}
                            imageStyle={styles.threadImageStyle}
                          />
                        ) : (
                          <Text style={styles.avatarFallback}>
                            {chat.otherName[0]?.toUpperCase() || "?"}
                          </Text>
                        )}
                      </View>
                      <View style={styles.threadContent}>
                        <Text style={styles.threadTitle} numberOfLines={1}>
                          {chat.otherName}
                        </Text>
                        <Text style={styles.threadPreview} numberOfLines={1}>
                          {chat.lastMessage}
                        </Text>
                      </View>
                      <View style={styles.threadMeta}>
                        {chat.lastMessageAt ? (
                          <Text style={styles.threadTime}>
                            {formatTime(chat.lastMessageAt)}
                          </Text>
                        ) : null}
                        {unread ? <View style={styles.unreadBadge} /> : null}
                      </View>
                    </Pressable>
                    {index < directChats.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                );
              })}
              {threads.length > 0 && (
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>Outing Chats</Text>
                </View>
              )}
            </>
          )}
          
          {/* Outing Chats Section */}
          {threads.map((outing, index) => {
          const unread =
            outing.lastSenderName &&
            profile?.name &&
            outing.lastSenderName !== profile.name;
          return (
            <View key={outing.outingId}>
              <Pressable
                style={({ pressed }) => [
                  styles.thread,
                  pressed ? styles.threadPressed : null,
                ]}
                onPress={() => navigation.navigate("ChatThread", { outingId: outing.outingId })}
              >
                <View style={styles.avatar}>
                  {outing.coverImageUrl ? (
                    <ImageBackground
                      source={{ uri: outing.coverImageUrl }}
                      style={styles.threadImage}
                      imageStyle={styles.threadImageStyle}
                    />
                  ) : (
                    <Text style={styles.avatarFallback}>{outing.title[0]}</Text>
                  )}
                </View>
                <View style={styles.threadContent}>
                  <Text style={styles.threadTitle} numberOfLines={1}>
                    {outing.title}
                  </Text>
                  <Text style={styles.threadPreview} numberOfLines={1}>
                    {outing.lastSenderName && outing.lastMessage !== "Start the conversation..."
                      ? `${outing.lastSenderName}: ${outing.lastMessage}`
                      : outing.lastMessage}
                  </Text>
                </View>
                <View style={styles.threadMeta}>
                  {outing.lastMessageAt ? (
                    <Text style={styles.threadTime}>{formatTime(outing.lastMessageAt)}</Text>
                  ) : null}
                  {unread ? <View style={styles.unreadBadge} /> : null}
                </View>
              </Pressable>
              {index < threads.length - 1 && <View style={styles.divider} />}
            </View>
          );
          })}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
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
  thread: {
    backgroundColor: colors.bg,
    paddingHorizontal: layout.gutter,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
  },
  threadPressed: {
    backgroundColor: colors.surface1,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.divider,
    marginLeft: layout.gutter + 64,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallback: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  threadImage: {
    width: "100%",
    height: "100%",
  },
  threadImageStyle: {
    borderRadius: 26,
  },
  threadContent: {
    flex: 1,
    minWidth: 0,
  },
  threadTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  threadPreview: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  threadMeta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 50,
  },
  threadTime: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  sectionDivider: {
    paddingHorizontal: layout.gutter,
    paddingVertical: layout.section,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface1,
  },
  sectionDividerText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default ChatListScreen;
