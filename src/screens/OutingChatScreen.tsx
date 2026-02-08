import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, layout, radius, spacing, tokens } from "../theme";
import { ChatMessage } from "../types/chat";
import { db } from "../firebaseApp";
import { useAuth } from "../context/AuthContext";
import { Outing } from "../types/outing";
import { logger } from "../utils/logger";
import { outingStorage } from "../utils/outingStorage";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import Screen from "../components/Screen";
import Skeleton from "../components/Skeleton";
import IconButton from "../components/IconButton";
import EmptyState from "../components/EmptyState";

type Route = RouteProp<RootStackParamList, "ChatThread">;

const OutingChatScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [outing, setOuting] = useState<Outing | null>(null);
  const [chatExpired, setChatExpired] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [memberDoc, setMemberDoc] = useState<any>(null);
  const [rsvp, setRsvp] = useState<"going" | "maybe" | "no" | null>(null);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [showHostTools, setShowHostTools] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastReadBy, setLastReadBy] = useState<Record<string, any>>({});
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatMetaRef = useRef(doc(db, "outings", route.params.outingId, "chatMeta", "meta"));

  const isHost = user && outing && outing.hostId === user.id;
  const isCurated = outing?.eventMode === "curated";
  const requiresRSVP = isCurated && !rsvp;

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Load outing details
        const outingSnap = await getDoc(doc(db, "outings", route.params.outingId));
        if (!outingSnap.exists()) {
          setBlocked(true);
          setLoading(false);
          return;
        }

        const outingData = { id: outingSnap.id, ...(outingSnap.data() as Outing) };
        setOuting(outingData);
        setIsCancelled(outingData.status === "cancelled");

        // Check chat expiration
        if (outingData.chatExpiresAt) {
          const expiresAt = outingData.chatExpiresAt.toDate?.()?.getTime() || 0;
          const now = Date.now();
          setChatExpired(now > expiresAt);
        } else if (outingData.dateTime) {
          // Fallback calculation
          const eventEnd = outingData.dateTime.toDate?.()?.getTime() || 0;
          const expirationTime = eventEnd + (outingData.durationMins || 0) * 60000 + 24 * 60 * 60 * 1000;
          const now = Date.now();
          setChatExpired(now > expirationTime);
        }

        // Check membership
        const memberRef = doc(db, "outings", route.params.outingId, "members", user.id);
        const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) {
        setBlocked(true);
          setLoading(false);
        return;
      }

        const memberData = memberSnap.data();
        setMemberDoc(memberData);
        setRsvp(memberData.rsvp || null);

        // Check if RSVP is required (curated events, first time)
        if (isCurated && !memberData.rsvp) {
          setShowRSVPModal(true);
        }

        // Subscribe to outing updates
        const outingUnsubscribe = onSnapshot(
          doc(db, "outings", route.params.outingId),
          (snap) => {
            if (snap.exists()) {
              const updated = snap.data() as Outing;
              setOuting({ id: snap.id, ...updated });
              setIsCancelled(updated.status === "cancelled");
              
              // Re-check expiration
              if (updated.chatExpiresAt) {
                const expiresAt = updated.chatExpiresAt.toDate?.()?.getTime() || 0;
                setChatExpired(Date.now() > expiresAt);
              }
            } else {
              // Outing deleted
              setBlocked(true);
            }
          },
          (error) => logger.error("chat.outing.subscribe.failed", { error })
        );

        // Subscribe to member doc to detect removal
        const memberUnsubscribe = onSnapshot(
          memberRef,
          (snap) => {
            if (!snap.exists()) {
              // Member removed while chat is open
              setBlocked(true);
              Alert.alert(
                "Access Removed",
                "You no longer have access to this chat.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            } else {
              // Update member data
              const updatedMember = snap.data();
              setMemberDoc(updatedMember);
              setRsvp(updatedMember?.rsvp || null);
            }
          },
          (error) => logger.error("chat.member.subscribe.failed", { error })
        );

        // Subscribe to messages
        const messagesQuery = query(
        collection(db, "outings", route.params.outingId, "messages"),
        orderBy("createdAt", "asc")
      );
        const messagesUnsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...(docItem.data() as ChatMessage),
        }));
        setMessages(data);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
          (error) => logger.error("chat.messages.subscribe.failed", { error })
        );

        // Subscribe to members (for host tools)
        if (isHost) {
          const membersQuery = query(
            collection(db, "outings", route.params.outingId, "members")
          );
          const membersUnsubscribe = onSnapshot(
            membersQuery,
            (snapshot) => {
              const membersData = snapshot.docs.map((docItem) => ({
                id: docItem.id,
                ...docItem.data(),
              }));
              setMembers(membersData);
            },
            (error) => logger.error("chat.members.subscribe.failed", { error })
          );

          return () => {
            outingUnsubscribe();
            messagesUnsubscribe();
            membersUnsubscribe();
            memberUnsubscribe();
          };
        }

        return () => {
          outingUnsubscribe();
          messagesUnsubscribe();
          memberUnsubscribe();
        };
      } catch (error) {
        logger.error("chat.load.failed", { error });
        setBlocked(true);
      } finally {
        setLoading(false);
      }
    };

    let cleanup: (() => void) | undefined;
    load().then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
      // Phase 3: Clear typing state on unmount
      if (user) {
        updateTypingState(false);
      }
    };
  }, [route.params.outingId, user]);

  // Phase 3: Update typing state
  const updateTypingState = async (typing: boolean) => {
    if (!user) return;
    try {
      await setDoc(
        chatMetaRef.current,
        {
          [`typing.${user.id}`]: typing,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("chat.typing.update.failed", { error });
    }
  };

  // Phase 3: Update last read timestamp
  const updateLastRead = async () => {
    if (!user) return;
    try {
      await setDoc(
        chatMetaRef.current,
        {
          [`lastReadAt.${user.id}`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("chat.lastRead.update.failed", { error });
    }
  };

  // Phase 3: Subscribe to chat meta for typing indicators
  useEffect(() => {
    if (!user || blocked) return;
    const metaUnsub = onSnapshot(
      chatMetaRef.current,
      (snap) => {
        if (snap.exists() && user) {
          const data = snap.data();
          const typingData = data.typing || {};
          const typingUserIds = Object.keys(typingData).filter(
            (uid) => uid !== user.id && typingData[uid] === true
          );
          setTypingUsers(typingUserIds);
          const lastReadData = data.lastReadAt || {};
          setLastReadBy(lastReadData);
        }
      },
      (error) => {
        logger.error("chat.meta.subscribe.failed", { error });
      }
    );
    return () => metaUnsub();
  }, [user, blocked]);

  // Update canWrite based on state
  useEffect(() => {
    const canWriteNow =
      !blocked &&
      !chatExpired &&
      !isCancelled &&
      !requiresRSVP &&
      user !== null;
    setCanWrite(canWriteNow);
  }, [blocked, chatExpired, isCancelled, requiresRSVP, user]);

  const send = async () => {
    if (!text.trim() || !user || !canWrite) return;

    const messageText = text.trim();
    setText("");
    // Phase 3: Clear typing state when sending
    updateTypingState(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
    await addDoc(collection(db, "outings", route.params.outingId, "messages"), {
        type: "user",
        senderId: user.id,
      senderName: profile?.name ?? "Guest",
      senderPhotoUrl: profile?.profile_photo_url ?? "",
        text: messageText,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, "outings", route.params.outingId, "chatMeta", "meta"),
      {
        lastMessageAt: serverTimestamp(),
          lastMessageText: messageText,
        lastSenderName: profile?.name ?? "Guest",
      },
      { merge: true }
    );
    updateLastRead();
    } catch (error) {
      logger.error("chat.send.failed", { error });
      setText(messageText);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Phase 3: Handle input focus/blur for typing indicators
  const handleInputFocus = () => {
    if (canWrite) {
      updateTypingState(true);
    }
  };

  const handleInputBlur = () => {
    updateTypingState(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (canWrite) {
      updateTypingState(true);
    }
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Set typing to false after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingState(false);
    }, 3000);
  };

  const handleRSVP = async (value: "going" | "maybe" | "no") => {
    if (!user || !outing) return;

    try {
      await outingStorage.setRSVP(route.params.outingId, user.id, value);
      setRsvp(value);
      setShowRSVPModal(false);
    } catch (error) {
      logger.error("rsvp.set.failed", { error });
      Alert.alert("Error", "Failed to set RSVP. Please try again.");
    }
  };

  const handleLeaveOuting = () => {
    Alert.alert(
      "Leave Outing",
      "Are you sure you want to leave this outing? You'll lose access to the chat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!user || !outing) return;
            try {
              await outingStorage.leaveOuting(route.params.outingId, user.id);
              navigation.goBack();
            } catch (error) {
              logger.error("leave.outing.failed", { error });
              Alert.alert("Error", "Failed to leave outing. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (targetUserId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!user || !outing) return;
            try {
              await outingStorage.removeMember(route.params.outingId, targetUserId, user.id);
            } catch (error) {
              logger.error("remove.member.failed", { error });
              Alert.alert("Error", "Failed to remove member. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleRevealLocation = async () => {
    if (!user || !outing) return;
    try {
      await outingStorage.revealLocation(route.params.outingId, user.id);
    } catch (error) {
      logger.error("reveal.location.failed", { error });
      Alert.alert("Error", "Failed to reveal location. Please try again.");
    }
  };

  const handleCancelOuting = () => {
    Alert.alert(
      "Cancel Outing",
      "Are you sure you want to cancel this outing? All members will be notified.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Outing",
          style: "destructive",
          onPress: async () => {
            if (!user || !outing) return;
            try {
              await outingStorage.cancelOuting(route.params.outingId, user.id);
            } catch (error) {
              logger.error("cancel.outing.failed", { error });
              Alert.alert("Error", "Failed to cancel outing. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatTime = (value: any) => {
    if (!value?.toDate) return "";
    const date = value.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatEventTime = (dateTime: any) => {
    if (!dateTime?.toDate) return "";
    const date = dateTime.toDate();
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isMyMessage = (message: ChatMessage) => message.senderId === user?.id;

  const canSeeAddress = () => {
    if (!outing) return false;
    if (!memberDoc) return false;
    const now = Date.now();
    const revealAt = outing.revealAt?.toDate?.()?.getTime() || 0;
    return outing.manualReveal === true || (revealAt > 0 && now >= revealAt);
  };

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.loadingContainer}>
        <Skeleton height={24} width="60%" radius={10} />
        <Skeleton height={14} width="40%" radius={8} />
        <View style={styles.loadingMessages}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`chat-skel-${index}`} height={56} radius={14} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screenContent} edges={["left", "right"]} glow={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + tokens.spacing.sm }]}>
        <IconButton
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="arrow-back" size={18} color={tokens.colors.text.secondary} />}
        />
        <View style={styles.headerContent}>
          <Text style={styles.headerName}>{outing?.title || "Group Chat"}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {typingUsers.length > 0
              ? `${typingUsers.length === 1 ? "Someone is" : `${typingUsers.length} people are`} typing...`
              : isCancelled
              ? "Cancelled"
              : chatExpired
              ? "Chat closed"
              : `${messages.length} messages`}
          </Text>
        </View>
        <IconButton
          onPress={() => setShowSafetySheet(true)}
          icon={<Ionicons name="ellipsis-vertical" size={18} color={tokens.colors.text.secondary} />}
        />
      </View>

      {/* Pinned Event Header */}
      {outing && (
        <View style={styles.pinnedHeader}>
          <View style={styles.pinnedContent}>
            <View style={styles.pinnedRow}>
              <View style={styles.pinnedLeft}>
                <Text style={styles.pinnedTitle}>{outing.title}</Text>
                <View style={styles.pinnedBadges}>
                  <View style={[styles.badge, isCurated ? styles.badgeCurated : styles.badgeFast]}>
                    <Text style={styles.badgeText}>
                      {isCurated ? "Curated" : "Fast"}
                    </Text>
                  </View>
                  {isCancelled && (
                    <View style={[styles.badge, styles.badgeCancelled]}>
                      <Text style={styles.badgeText}>Cancelled</Text>
                    </View>
                  )}
                </View>
              </View>
              {isHost && isCurated && (
                <TouchableOpacity
                  style={styles.hostToolsButton}
                  onPress={() => setShowHostTools(true)}
                >
                  <Ionicons name="settings-outline" size={20} color={tokens.colors.primary.solid} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.pinnedMeta}>
              <Ionicons name="time-outline" size={14} color={tokens.colors.text.muted} />
              <Text style={styles.pinnedMetaText}>
                {formatEventTime(outing.dateTime)} • {outing.area}
              </Text>
            </View>
            {canSeeAddress() && outing.exactAddress && (
              <View style={styles.pinnedMeta}>
                <Ionicons name="location-outline" size={14} color={tokens.colors.primary.solid} />
                <Text style={styles.pinnedAddress}>{outing.exactAddress}</Text>
              </View>
            )}
            {isHost && !canSeeAddress() && outing.exactAddress && (
              <TouchableOpacity
                style={styles.revealButton}
                onPress={handleRevealLocation}
              >
                <Text style={styles.revealButtonText}>Reveal Location</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => navigation.navigate("OutingDetails", { outingId: route.params.outingId })}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {blocked ? (
        <View style={styles.blockedContainer}>
          <Ionicons name="lock-closed" size={48} color={tokens.colors.text.muted} />
          <Text style={styles.blockedTitle}>Chat Locked</Text>
          <Text style={styles.blockedText}>
            You need to be approved to access this chat.
          </Text>
        </View>
      ) : (
        <>
      <FlatList
            ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            renderItem={({ item }) => {
              // System message
              if (item.type === "system") {
                return (
                  <View style={styles.systemMessageRow}>
                    <View style={styles.systemMessage}>
                      <Text style={styles.systemMessageText}>{item.text}</Text>
                    </View>
                  </View>
                );
              }

              // User message
              const isMine = isMyMessage(item);
              const isHostMessage = item.senderId === outing?.hostId;
              return (
                <View style={[styles.messageRow, isMine && styles.messageRowRight]}>
                  {!isMine && (
                    <ImageBackground
                      source={{ uri: item.senderPhotoUrl || "" }}
                      style={styles.avatar}
                      imageStyle={styles.avatarStyle}
                    >
                      {!item.senderPhotoUrl && (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>
                            {item.senderName?.charAt(0).toUpperCase() || "?"}
                          </Text>
          </View>
        )}
                    </ImageBackground>
                  )}
                  <View style={[styles.bubble, isMine && styles.bubbleMine, isHostMessage && styles.bubbleHost]}>
                    {!isMine && item.senderName && (
                      <Text style={styles.senderName}>
                        {item.senderName}
                        {isHostMessage && (
                          <Text style={styles.hostBadge}> • Host</Text>
                        )}
                      </Text>
                    )}
                    <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
        ListEmptyComponent={
              messages.length === 0 && !loading ? (
                <EmptyState
                  title="Say hello 👋"
                  subtitle="Start the conversation with the group"
                />
              ) : null
            }
          />

          {(chatExpired || isCancelled) && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredText}>
                {isCancelled
                  ? "This event has been cancelled."
                  : "This chat is closed. Hope you had a great time ✨"}
              </Text>
            </View>
          )}

          {requiresRSVP && (
            <View style={styles.rsvpBanner}>
              <Text style={styles.rsvpBannerText}>
                Please set your RSVP to continue chatting
              </Text>
            </View>
          )}

          <View style={[styles.inputRow, { paddingBottom: insets.bottom + tokens.spacing.sm }]}>
        <TextInput
              style={[styles.input, !canWrite && styles.inputDisabled]}
          value={text}
          onChangeText={handleTextChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
              placeholder={
                isCancelled
                  ? "Event cancelled"
                  : chatExpired
                  ? "Chat closed"
                  : requiresRSVP
                  ? "Set RSVP to chat..."
                  : "Message the group..."
              }
          placeholderTextColor={tokens.colors.text.subtle}
              multiline
              maxLength={1000}
              onSubmitEditing={send}
              returnKeyType="send"
              editable={canWrite}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!text.trim() || !canWrite) && styles.sendButtonDisabled]}
              onPress={send}
              disabled={!text.trim() || !canWrite}
            >
              <Text style={[styles.sendText, (!text.trim() || !canWrite) && styles.sendTextDisabled]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* RSVP Modal */}
      <Modal
        visible={showRSVPModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing(3) }]}>
            <Text style={styles.modalTitle}>Set Your RSVP</Text>
            <Text style={styles.modalSubtitle}>
              Let the host know if you're coming to this curated event.
            </Text>
            <View style={styles.rsvpOptions}>
              <TouchableOpacity
                style={[styles.rsvpOption, rsvp === "going" && styles.rsvpOptionSelected]}
                onPress={() => handleRSVP("going")}
              >
                <Text style={[styles.rsvpOptionText, rsvp === "going" && styles.rsvpOptionTextSelected]}>
                  Going
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpOption, rsvp === "maybe" && styles.rsvpOptionSelected]}
                onPress={() => handleRSVP("maybe")}
              >
                <Text style={[styles.rsvpOptionText, rsvp === "maybe" && styles.rsvpOptionTextSelected]}>
                  Maybe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpOption, rsvp === "no" && styles.rsvpOptionSelected]}
                onPress={() => handleRSVP("no")}
              >
                <Text style={[styles.rsvpOptionText, rsvp === "no" && styles.rsvpOptionTextSelected]}>
                  Can't Make It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Safety Bottom Sheet */}
      <Modal
        visible={showSafetySheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSafetySheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSafetySheet(false)}
        >
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + spacing(2) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Options</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowSafetySheet(false);
                handleLeaveOuting();
              }}
            >
              <Ionicons name="exit-outline" size={20} color={tokens.colors.text.primary} />
              <Text style={styles.sheetOptionText}>Leave Outing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowSafetySheet(false);
                navigation.navigate("OutingDetails", { outingId: route.params.outingId });
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color={tokens.colors.text.primary} />
              <Text style={styles.sheetOptionText}>View Details</Text>
            </TouchableOpacity>
            {isHost && (
              <>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => {
                    setShowSafetySheet(false);
                    setShowHostTools(true);
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color={tokens.colors.text.primary} />
                  <Text style={styles.sheetOptionText}>Host Tools</Text>
                </TouchableOpacity>
                {!isCancelled && (
                  <TouchableOpacity
                    style={[styles.sheetOption, styles.sheetOptionDanger]}
                    onPress={() => {
                      setShowSafetySheet(false);
                      handleCancelOuting();
                    }}
                  >
                  <Ionicons name="close-circle-outline" size={20} color={tokens.colors.primary.solid} />
                    <Text style={[styles.sheetOptionText, styles.sheetOptionTextDanger]}>
                      Cancel Outing
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Host Tools Modal */}
      {isHost && isCurated && (
        <Modal
          visible={showHostTools}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowHostTools(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing(3) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Host Tools</Text>
                <TouchableOpacity onPress={() => setShowHostTools(false)}>
                  <Ionicons name="close" size={24} color={tokens.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Manage members and outing settings</Text>
              <ScrollView style={styles.membersList}>
                {members
                  .filter((m) => m.role === "member")
                  .map((member) => {
                    // In a real app, you'd load user profile here
                    return (
                      <View key={member.id} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {member.id.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.memberName}>Member {member.id.slice(0, 8)}</Text>
                            <Text style={styles.memberRSVP}>
                              RSVP: {member.rsvp || "Not set"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveMember(member.id)}
                        >
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
              </ScrollView>
      </View>
    </View>
        </Modal>
      )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.bg,
  },
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.bg.surface,
    backgroundColor: tokens.colors.bg.background,
  },
  headerContent: {
    flex: 1,
  },
  headerName: {
    color: tokens.colors.primary.solid,
    fontSize: 16,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pinnedHeader: {
    backgroundColor: tokens.colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.bg.surface,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  pinnedContent: {
    gap: tokens.spacing.sm,
  },
  pinnedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pinnedLeft: {
    flex: 1,
  },
  pinnedTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(0.5),
  },
  pinnedBadges: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    marginBottom: spacing(0.5),
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: spacing(0.3),
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeCurated: {
    backgroundColor: tokens.colors.primary.soft,
  },
  badgeFast: {
    backgroundColor: tokens.colors.primary.soft,
  },
  badgeCancelled: {
    backgroundColor: tokens.colors.primary.soft,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
  hostToolsButton: {
    padding: spacing(0.5),
  },
  pinnedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
    marginTop: spacing(0.3),
  },
  pinnedMetaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pinnedAddress: {
    color: tokens.colors.primary.solid,
    fontSize: 12,
    fontWeight: "500",
  },
  revealButton: {
    marginTop: tokens.spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.8),
    backgroundColor: tokens.colors.primary.soft,
    borderRadius: radius.button,
  },
  revealButtonText: {
    color: tokens.colors.primary.solid,
    fontSize: 12,
    fontWeight: "600",
  },
  viewDetailsButton: {
    marginTop: tokens.spacing.sm,
    alignSelf: "flex-start",
  },
  viewDetailsText: {
    color: tokens.colors.primary.solid,
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing(2),
  },
  loadingMessages: {
    width: "100%",
    paddingHorizontal: spacing(2),
    gap: tokens.spacing.sm,
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: tokens.colors.bg.raised,
    overflow: "hidden",
  },
  avatarStyle: {
    borderRadius: 14,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bg.primary,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "75%",
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: tokens.colors.bg.primary,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 4,
  },
  bubbleHost: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primarySoft,
  },
  senderName: {
    color: tokens.colors.primary.solid,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  hostBadge: {
    color: tokens.colors.primary.solid,
    fontSize: 10,
    fontWeight: "400",
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  messageTextMine: {
    color: colors.onPrimary,
  },
  timeText: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextMine: {
    color: "rgba(11, 11, 11, 0.6)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing(8),
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(4),
  },
  blockedTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing(2),
    marginBottom: tokens.spacing.sm,
  },
  blockedText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  expiredBanner: {
    backgroundColor: tokens.colors.bg.surface,
    padding: spacing(2),
    marginHorizontal: spacing(2),
    marginBottom: tokens.spacing.sm,
    borderRadius: radius.card,
    alignItems: "center",
  },
  expiredText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  rsvpBanner: {
    backgroundColor: tokens.colors.primary.soft,
    padding: spacing(1.5),
    marginHorizontal: spacing(2),
    marginBottom: tokens.spacing.sm,
    borderRadius: radius.card,
    alignItems: "center",
  },
  rsvpBannerText: {
    color: tokens.colors.primary.solid,
    fontSize: 12,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: tokens.colors.bg.bg,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: 20,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.2),
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    marginLeft: spacing(1.5),
    backgroundColor: tokens.colors.bg.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.2),
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.bg.surface3,
    opacity: 0.5,
  },
  sendText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  sendTextDisabled: {
    color: colors.textMuted,
  },
  systemMessageRow: {
    alignItems: "center",
    marginVertical: tokens.spacing.sm,
  },
  systemMessage: {
    backgroundColor: tokens.colors.bg.raised,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.8),
    borderRadius: radius.pill,
    maxWidth: "80%",
  },
  systemMessageText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.colors.bg.overlayStrong,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: tokens.colors.bg.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing(3),
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(2),
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing(3),
  },
  rsvpOptions: {
    gap: spacing(2),
  },
  rsvpOption: {
    backgroundColor: tokens.colors.bg.surface,
    padding: spacing(2),
    borderRadius: radius.card,
    alignItems: "center",
  },
  rsvpOptionSelected: {
    backgroundColor: tokens.colors.primary.soft,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rsvpOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  rsvpOptionTextSelected: {
    color: tokens.colors.primary.solid,
    fontWeight: "700",
  },
  // Bottom sheet
  sheetContent: {
    backgroundColor: tokens.colors.bg.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing(3),
    paddingTop: spacing(2),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: tokens.colors.bg.textMuted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing(2),
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing(2),
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing(2),
    borderRadius: radius.card,
    marginBottom: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.surface,
    gap: spacing(1.5),
  },
  sheetOptionDanger: {
    backgroundColor: tokens.colors.primary.soft,
  },
  sheetOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  sheetOptionTextDanger: {
    color: colors.danger,
  },
  // Host tools
  membersList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing(2),
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: radius.card,
    marginBottom: tokens.spacing.sm,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  memberRSVP: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(0.2),
  },
  removeButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.primary.soft,
    borderRadius: radius.button,
  },
  removeButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default OutingChatScreen;
