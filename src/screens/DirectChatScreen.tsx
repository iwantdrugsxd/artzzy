import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { colors, tokens, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { connectionStorage } from "../utils/connectionStorage";
import { DirectChatMessage } from "../types/directChat";
import { logger } from "../utils/logger";

type Route = RouteProp<RootStackParamList, "DirectChat">;
type Nav = StackNavigationProp<RootStackParamList, "DirectChat">;

const DirectChatScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [otherName, setOtherName] = useState<string>("Guest");
  const [otherUid, setOtherUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [text, setText] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<any>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<DirectChatMessage>>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const metaRef = useRef(doc(db, "directChats", route.params.chatId, "meta", "meta"));

  // Phase 3: Update typing state
  const updateTypingState = async (typing: boolean) => {
    if (!user) return;
    try {
      await setDoc(
        metaRef.current,
        {
          [`typing.${user.id}`]: typing,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setIsTyping(typing);
    } catch (error) {
      logger.error("directChat.typing.update.failed", { error });
    }
  };

  // Phase 3: Update last read timestamp
  const updateLastRead = async () => {
    if (!user) return;
    try {
      await setDoc(
        metaRef.current,
        {
          [`lastReadAt.${user.id}`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("directChat.lastRead.update.failed", { error });
    }
  };

  useEffect(() => {
    if (!user) return;

    const chatRef = doc(db, "directChats", route.params.chatId);

    const load = async () => {
      try {
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          const chat = chatSnap.data() as any;
          const foundOtherUid =
            chat.participants?.find((p: string) => p !== user.id) ||
            route.params.otherUid;
          setOtherUid(foundOtherUid || null);
          if (foundOtherUid) {
            const otherSnap = await getDoc(doc(db, "users", foundOtherUid));
            if (otherSnap.exists()) {
              const data = otherSnap.data() as any;
              setOtherName(data.name || "Guest");
              setOtherProfile(data);
              // Phase 3: Generate icebreakers from prompts
              if (data.prompts && Array.isArray(data.prompts) && data.prompts.length > 0) {
                const suggestions: string[] = [];
                data.prompts.slice(0, 3).forEach((prompt: any) => {
                  if (prompt.question && prompt.answer) {
                    // Generate icebreaker based on prompt
                    const question = prompt.question.toLowerCase();
                    if (question.includes("favorite") || question.includes("love")) {
                      suggestions.push(`I saw you love ${prompt.answer.split(' ').slice(0, 3).join(' ')}! Tell me more?`);
                    } else if (question.includes("ideal") || question.includes("perfect")) {
                      suggestions.push(`Your ideal ${prompt.question.split(' ').slice(-2).join(' ')} sounds interesting!`);
                    } else {
                      suggestions.push(`I'm curious about your answer to "${prompt.question}"`);
                    }
                  }
                });
                setIcebreakers(suggestions.slice(0, 3));
              }
            }
          }
          if (chat.expiresAt?.toDate) {
            setExpired(chat.expiresAt.toDate().getTime() < Date.now());
          }
        }
      } catch (error) {
        logger.error("directChat.load.failed", { error });
      } finally {
        setLoading(false);
      }
    };

    load();

    // Phase 3: Subscribe to chat meta for typing indicators and read receipts
    const metaUnsub = onSnapshot(
      metaRef.current,
      (snap) => {
        if (snap.exists() && user) {
          const data = snap.data();
          const typingData = data.typing || {};
          setOtherTyping(typingData[otherUid || ""] === true);
          const lastReadData = data.lastReadAt || {};
          setLastReadAt(lastReadData[otherUid || ""]);
        }
      },
      (error) => {
        logger.error("directChat.meta.subscribe.failed", { error });
      }
    );

    const q = query(
      collection(db, "directChats", route.params.chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...(d.data() as any),
            } as DirectChatMessage)
        );
        setMessages(data);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
        // Phase 3: Update last read when new messages arrive
        if (data.length > 0) {
          updateLastRead();
        }
      },
      (error) => {
        logger.error("directChat.messages.failed", { error });
      }
    );

    return () => {
      unsub();
      metaUnsub();
      // Phase 3: Clear typing state on unmount
      updateTypingState(false);
    };
  }, [route.params.chatId, route.params.otherUid, user, otherUid]);

  // Phase 3: Handle input focus/blur for typing indicators
  const handleInputFocus = () => {
    if (!expired) {
      updateTypingState(true);
    }
  };

  const handleInputBlur = () => {
    updateTypingState(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (!expired && !isTyping) {
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

  const handleSend = async () => {
    if (!user || !text.trim() || expired) return;
    const value = text.trim();
    setText("");
    // Phase 3: Clear typing state when sending
    updateTypingState(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    try {
      await connectionStorage.sendDirectMessage({
        chatId: route.params.chatId,
        senderUid: user.id,
        text: value,
      });
      updateLastRead();
    } catch (error) {
      logger.error("directChat.send.failed", { error });
      setText(value);
    }
  };

  // Phase 3: Block user
  const handleBlock = () => {
    if (!user || !otherUid) return;
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${otherName}? You won't be able to message each other.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(db, "blocks", `${user.id}_${otherUid}`), {
                blockerUid: user.id,
                blockedUid: otherUid,
                createdAt: serverTimestamp(),
              });
              logger.info("user.blocked", { blockedUid: otherUid });
              Alert.alert("User Blocked", `${otherName} has been blocked.`);
              navigation.goBack();
            } catch (error) {
              logger.error("user.block.failed", { error });
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Phase 3: Report user
  const handleReport = () => {
    if (!user || !otherUid) return;
    Alert.alert(
      "Report User",
      `Report ${otherName} for inappropriate behavior?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(collection(db, "reports")), {
                reporterUid: user.id,
                reportedUid: otherUid,
                chatId: route.params.chatId,
                type: "direct_chat",
                createdAt: serverTimestamp(),
              });
              logger.info("user.reported", { reportedUid: otherUid });
              Alert.alert("Report Submitted", "Thank you for your report. We'll review it.");
            } catch (error) {
              logger.error("user.report.failed", { error });
              Alert.alert("Error", "Failed to submit report. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: DirectChatMessage }) => {
    if (item.type === "system") {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }
    const mine = item.senderUid === user?.id;
    const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
    // Phase 3: Check if message is read
    const isRead = mine && lastReadAt && createdAt && lastReadAt.toDate && 
      lastReadAt.toDate().getTime() >= createdAt.getTime();
    return (
      <View style={[styles.messageRow, mine && styles.messageRowRight]}>
        <View style={[styles.bubble, mine && styles.bubbleMine]}>
          <Text style={[styles.messageText, mine && styles.messageTextMine]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            {createdAt && (
              <Text style={[styles.timeText, mine && styles.timeTextMine]}>
                {formatTime(createdAt)}
              </Text>
            )}
            {/* Phase 3: Read receipt */}
            {mine && (
              <Ionicons
                name={isRead ? "checkmark-done" : "checkmark"}
                size={14}
                color={isRead ? tokens.colors.primary.solid : tokens.colors.text.subtle}
                style={styles.readReceipt}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const title = loading ? "Chat" : otherName;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={tokens.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.title}>{title}</Text>
          {/* Phase 3: Typing indicator */}
          {otherTyping && (
            <Text style={styles.typingIndicator}>typing...</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowOptionsModal(true)}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={tokens.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {expired && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>
            This chat is closed. Hope you had a great conversation.
          </Text>
        </View>
      )}

      {/* Phase 3: Icebreaker suggestions */}
      {!expired && icebreakers.length > 0 && messages.length === 0 && (
        <View style={styles.icebreakerContainer}>
          <Text style={styles.icebreakerLabel}>Quick starters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.icebreakerRow}>
            {icebreakers.map((icebreaker, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.icebreakerChip}
                onPress={() => {
                  setText(icebreaker);
                  handleTextChange(icebreaker);
                }}
              >
                <Text style={styles.icebreakerText} numberOfLines={2}>
                  {icebreaker}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, expired && styles.inputDisabled]}
          value={text}
          onChangeText={handleTextChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          editable={!expired}
          placeholder={expired ? "Chat closed" : "Say hi..."}
          placeholderTextColor={colors.textSubtle}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || expired) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || expired}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Phase 3: Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + spacing(2) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Options</Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowOptionsModal(false);
                navigation.navigate("Profile", { userId: otherUid || "" });
              }}
            >
              <Ionicons name="person-outline" size={20} color={tokens.colors.text.primary} />
              <Text style={styles.sheetOptionText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetOption, styles.sheetOptionDanger]}
              onPress={() => {
                setShowOptionsModal(false);
                handleReport();
              }}
            >
              <Ionicons name="flag-outline" size={20} color={tokens.colors.primary.solid} />
              <Text style={[styles.sheetOptionText, styles.sheetOptionTextDanger]}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetOption, styles.sheetOptionDanger]}
              onPress={() => {
                setShowOptionsModal(false);
                handleBlock();
              }}
            >
              <Ionicons name="ban-outline" size={20} color={tokens.colors.primary.solid} />
              <Text style={[styles.sheetOptionText, styles.sheetOptionTextDanger]}>Block</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  backButton: {
    paddingRight: tokens.spacing.sm,
  },
  headerBody: {
    flex: 1,
  },
  title: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h3,
  },
  list: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: tokens.colors.bg.raised,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: tokens.colors.primary.solid,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: tokens.colors.text.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  messageTextMine: {
    color: tokens.colors.primary.onPrimary,
  },
  timeText: {
    color: tokens.colors.text.subtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextMine: {
    color: tokens.colors.text.muted,
  },
  systemRow: {
    alignItems: "center",
    marginVertical: tokens.spacing.sm,
  },
  systemText: {
    color: tokens.colors.text.subtle,
    ...tokens.typography.micro,
  },
  expiredBanner: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.sm,
  },
  expiredText: {
    color: tokens.colors.text.subtle,
    ...tokens.typography.micro,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.overlay.glassMedium,
    backgroundColor: tokens.colors.bg.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.raised,
    color: tokens.colors.text.primary,
    ...tokens.typography.body2,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    marginLeft: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.button,
    backgroundColor: tokens.colors.primary.solid,
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.bg.raised,
  },
  sendText: {
    color: tokens.colors.primary.onPrimary,
    ...tokens.typography.body2,
    fontWeight: "600",
  },
  // Phase 3: Typing indicator
  typingIndicator: {
    color: tokens.colors.text.muted,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  // Phase 3: Message footer with read receipt
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  readReceipt: {
    marginLeft: 4,
  },
  // Phase 3: Options modal
  optionsButton: {
    padding: tokens.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.colors.overlay.strong,
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: tokens.colors.bg.base,
    borderTopLeftRadius: tokens.radius.card,
    borderTopRightRadius: tokens.radius.card,
    padding: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: tokens.colors.text.muted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: tokens.spacing.lg,
  },
  sheetTitle: {
    color: tokens.colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: tokens.spacing.lg,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.card,
    marginBottom: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.raised,
    gap: tokens.spacing.md,
  },
  sheetOptionDanger: {
    backgroundColor: tokens.colors.primary.soft,
  },
  sheetOptionText: {
    color: tokens.colors.text.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  sheetOptionTextDanger: {
    color: tokens.colors.primary.solid,
  },
  // Phase 3: Icebreaker suggestions
  icebreakerContainer: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.overlay.glassMedium,
    backgroundColor: tokens.colors.bg.surface,
  },
  icebreakerLabel: {
    color: tokens.colors.text.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: tokens.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  icebreakerRow: {
    gap: tokens.spacing.sm,
  },
  icebreakerChip: {
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    marginRight: tokens.spacing.sm,
    maxWidth: 200,
  },
  icebreakerText: {
    color: tokens.colors.text.primary,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DirectChatScreen;






