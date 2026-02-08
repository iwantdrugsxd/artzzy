import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ImageBackground,
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
import { colors, spacing, tokens } from "../theme";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseApp";
import { connectionStorage } from "../utils/connectionStorage";
import { DirectChatMessage } from "../types/directChat";
import { logger } from "../utils/logger";
import { vibeQuestions } from "../data/vibeQuestions";
import PhotoCarousel from "../components/PhotoCarousel";
import Pill from "../components/Pill";

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
  const [showProfilePreview, setShowProfilePreview] = useState(false);
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

  const renderItem = ({ item, index }: { item: DirectChatMessage; index: number }) => {
    if (item.type === "system") {
      return (
        <View style={styles.systemPill}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }
    const mine = item.senderUid === user?.id;
    const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
    
    // Check if previous message is from same sender (for grouped spacing)
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const isGrouped = prevMessage && 
      prevMessage.type !== "system" && 
      prevMessage.senderUid === item.senderUid;
    
    // Phase 3: Check if message is read
    const isRead = mine && lastReadAt && createdAt && lastReadAt.toDate && 
      lastReadAt.toDate().getTime() >= createdAt.getTime();
    
    return (
      <View style={[
        styles.messageRow, 
        mine ? styles.messageRowMine : styles.messageRowTheirs,
        isGrouped && styles.messageRowGrouped
      ]}>
        <View style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs
        ]}>
          <Text style={[
            styles.bubbleText,
            mine && styles.bubbleTextMine
          ]}>
            {item.text}
          </Text>
        </View>
        <View style={[
          styles.bubbleTimeRow,
          mine && styles.bubbleTimeRowMine
        ]}>
          {createdAt && (
            <Text style={styles.bubbleTime}>
              {formatTime(createdAt)}
            </Text>
          )}
          {/* Phase 3: Read receipt */}
          {mine && (
            <Ionicons
              name={isRead ? "checkmark-done" : "checkmark"}
              size={12}
              color={isRead ? tokens.colors.primary.solid : tokens.colors.text.subtle}
              style={styles.readReceipt}
            />
          )}
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

  // Helper to calculate age from birthdate
  const getAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Build profile card data from otherProfile
  const profileCardData = useMemo(() => {
    if (!otherProfile) {
      return null;
    }

    const otherVibeAnswers = (otherProfile.vibe_answers as Record<string, string>) || {};
    
    // Compute vibe highlights (same logic as PeopleScreen)
    const vibeHighlights = (() => {
      const entries = Object.entries(otherVibeAnswers);
      if (!entries.length) return [];

      const byKey: Record<string, string> = {};
      vibeQuestions.forEach((q) => {
        const answer = otherVibeAnswers[q.key];
        if (!answer) return;
        const opt = q.options.find((o) => o.value === answer);
        if (opt) {
          byKey[q.key] = `${q.title}: ${opt.label}`;
        } else {
          byKey[q.key] = `${q.title}: ${answer}`;
        }
      });

      return Object.values(byKey).slice(0, 3);
    })();

    const photo = otherProfile.profile_photo_url || otherProfile.primaryPhotoUrl || "";
    const photos = otherProfile.profilePhotoUrls || (photo ? [photo] : []);

    return {
      name: otherProfile.name || "Guest",
      age: getAge(otherProfile.birthdate),
      height: otherProfile.height,
      city: otherProfile.city,
      country: otherProfile.country,
      bio: otherProfile.bio || "",
      photo,
      photos,
      interests: otherProfile.interests || [],
      score: 0, // No match score in direct chat context
      tags: [], // No tags in direct chat context
      vibeHighlights,
      quickBadges: otherProfile.quick_badges || [],
      prompts: otherProfile.prompts || [],
      work: otherProfile.work,
      education: otherProfile.education,
      isVerified: otherProfile.isVerified || false,
      memberSince: otherProfile.created_at,
    };
  }, [otherProfile]);

  const otherPhoto = otherProfile?.profile_photo_url || otherProfile?.primaryPhotoUrl;
  const headerSubtitle = otherTyping ? "typing..." : "Tap to view profile";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color={tokens.colors.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => {
            setShowProfilePreview(true);
          }}
          activeOpacity={0.7}
        >
          {otherPhoto ? (
            <ImageBackground
              source={{ uri: otherPhoto }}
              style={styles.headerAvatar}
              imageStyle={styles.headerAvatarImage}
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarFallbackText}>
                {otherName[0]?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <View style={styles.headerNameContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {loading ? "Chat" : otherName}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowOptionsModal(true)}
            style={styles.headerActionButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={tokens.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 80 }
        ]}
        style={styles.listContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        showsVerticalScrollIndicator={false}
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

      <View style={[
        styles.inputBar,
        { paddingBottom: insets.bottom + 8 }
      ]}>
        <View style={styles.inputFieldContainer}>
          <TextInput
            style={[styles.inputField, expired && styles.inputFieldDisabled]}
            value={text}
            onChangeText={handleTextChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            editable={!expired}
            placeholder={expired ? "Chat closed" : "Say hi…"}
            placeholderTextColor={tokens.colors.text.subtle}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || expired) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || expired}
          activeOpacity={0.7}
        >
          <Ionicons
            name="paper-plane"
            size={20}
            color={(!text.trim() || expired) ? tokens.colors.text.subtle : tokens.colors.primary.onPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Profile Preview Modal - Full Screen Sheet */}
      <Modal
        visible={showProfilePreview}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowProfilePreview(false)}
      >
        <View style={[styles.profileSheet, { paddingTop: insets.top }]}>
          {/* Fixed Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.profileHeaderClose}
              onPress={() => setShowProfilePreview(false)}
            >
              <Ionicons name="close" size={24} color={tokens.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.profileHeaderTitle}>Profile</Text>
            <View style={styles.profileHeaderRight} />
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.profileScrollView}
            contentContainerStyle={[
              styles.profileScrollContent,
              { paddingBottom: insets.bottom + tokens.spacing.xl }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {profileCardData ? (
              <>
                {/* Avatar Section */}
                <View style={styles.profileAvatarWrap}>
                  {profileCardData.photo ? (
                    <ImageBackground
                      source={{ uri: profileCardData.photo }}
                      style={styles.profileAvatar}
                      imageStyle={styles.profileAvatarImage}
                    />
                  ) : (
                    <View style={styles.profileAvatarFallback}>
                      <Text style={styles.profileAvatarFallbackText}>
                        {profileCardData.name[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  {profileCardData.isVerified && (
                    <View style={styles.profileVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={tokens.colors.primary.solid} />
                    </View>
                  )}
                </View>

                {/* Name + Age */}
                <View style={styles.profileNameSection}>
                  <Text style={styles.profileName}>
                    {profileCardData.name}
                    {profileCardData.age ? `, ${profileCardData.age}` : ""}
                  </Text>
                  {(profileCardData.city || profileCardData.country) && (
                    <Text style={styles.profileLocation}>
                      {[profileCardData.city, profileCardData.country].filter(Boolean).join(", ")}
                    </Text>
                  )}
                  {profileCardData.height && (
                    <Text style={styles.profileMeta}>{profileCardData.height}</Text>
                  )}
                  {(profileCardData.work || profileCardData.education) && (
                    <Text style={styles.profileMeta}>
                      {[profileCardData.work, profileCardData.education].filter(Boolean).join(" • ")}
                    </Text>
                  )}
                </View>

                {/* Quick Badges */}
                {profileCardData.quickBadges && profileCardData.quickBadges.length > 0 && (
                  <View style={styles.profileSection}>
                    <View style={styles.profileBadgesRow}>
                      {profileCardData.quickBadges.slice(0, 6).map((badge, idx) => (
                        <View key={idx} style={styles.profileBadge}>
                          <Text style={styles.profileBadgeText}>{badge}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Photo Carousel */}
                {profileCardData.photos && profileCardData.photos.length > 0 && (
                  <View style={styles.profileSection}>
                    <PhotoCarousel
                      photos={profileCardData.photos}
                      height={320}
                      containerStyle={styles.profileCarousel}
                    />
                  </View>
                )}

                {/* About Section */}
                {profileCardData.bio && (
                  <View style={styles.profileSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionAccent} />
                      <Text style={styles.sectionTitle}>ABOUT</Text>
                    </View>
                    <Text style={styles.aboutText}>{profileCardData.bio}</Text>
                    <View style={styles.sectionDivider} />
                  </View>
                )}

                {/* Prompts Section */}
                {profileCardData.prompts && profileCardData.prompts.length > 0 && (
                  <View style={styles.profileSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionAccent} />
                      <Text style={styles.sectionTitle}>PROMPTS</Text>
                    </View>
                    {profileCardData.prompts.map((prompt: any, idx: number) => (
                      <View key={prompt.id || idx} style={styles.promptCard}>
                        <Text style={styles.promptTitle}>{prompt.question}</Text>
                        <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Interests Section */}
                {profileCardData.interests && profileCardData.interests.length > 0 && (
                  <View style={styles.profileSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionAccent} />
                      <Text style={styles.sectionTitle}>INTERESTS</Text>
                    </View>
                    <View style={styles.interestsWrap}>
                      {profileCardData.interests.map((interest, idx) => (
                        <View key={idx} style={styles.interestPill}>
                          <Text style={styles.interestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Vibe Highlights */}
                {profileCardData.vibeHighlights && profileCardData.vibeHighlights.length > 0 && (
                  <View style={styles.profileSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionAccent} />
                      <Text style={styles.sectionTitle}>VIBE</Text>
                    </View>
                    {profileCardData.vibeHighlights.map((highlight, idx) => (
                      <Text key={idx} style={styles.profileVibeItem}>
                        {highlight}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.profileUnavailable}>
                <Text style={styles.profileUnavailableText}>Profile unavailable</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

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
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + tokens.spacing.lg }]}>
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
  // Header styles
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.overlay.glassMedium,
    backgroundColor: tokens.colors.bg.base,
    minHeight: 56,
  },
  headerBackButton: {
    padding: tokens.spacing.sm,
    marginRight: tokens.spacing.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  headerAvatarImage: {
    borderRadius: 20,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bg.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarFallbackText: {
    color: tokens.colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerNameContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: tokens.colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  headerSubtitle: {
    color: tokens.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  headerActionButton: {
    padding: tokens.spacing.sm,
  },
  // List styles
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  // Message row styles
  messageRow: {
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  messageRowMine: {
    alignItems: "flex-end",
  },
  messageRowTheirs: {
    alignItems: "flex-start",
  },
  messageRowGrouped: {
    marginTop: 2,
  },
  // Bubble styles
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: tokens.colors.primary.solid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  bubbleTextMine: {
    color: tokens.colors.primary.onPrimary,
  },
  bubbleTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  bubbleTimeRowMine: {
    justifyContent: "flex-end",
  },
  bubbleTime: {
    color: tokens.colors.text.subtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
  },
  readReceipt: {
    marginLeft: 4,
  },
  // System message styles
  systemPill: {
    alignSelf: "center",
    alignItems: "center",
    marginVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg.raised,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  systemText: {
    color: tokens.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    textAlign: "center",
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
  // Input bar styles
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.overlay.glassMedium,
    backgroundColor: tokens.colors.bg.base,
    gap: tokens.spacing.sm,
  },
  inputFieldContainer: {
    flex: 1,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg.raised,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: "center",
  },
  inputField: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    color: tokens.colors.text.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  inputFieldDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.primary.solid,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.bg.raised,
    opacity: 0.5,
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
  // Profile Preview Modal styles - Full Screen Sheet
  profileSheet: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
    backgroundColor: tokens.colors.bg.base,
    minHeight: 56,
  },
  profileHeaderClose: {
    padding: tokens.spacing.sm,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeaderTitle: {
    color: tokens.colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  profileHeaderRight: {
    width: 40,
  },
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
  },
  // Avatar section
  profileAvatarWrap: {
    alignItems: "center",
    marginBottom: tokens.spacing.lg,
    position: "relative",
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  profileAvatarImage: {
    borderRadius: 44,
  },
  profileAvatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.colors.bg.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  profileAvatarFallbackText: {
    color: tokens.colors.text.primary,
    fontSize: 32,
    fontWeight: "600",
  },
  profileVerifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: tokens.colors.bg.base,
    borderRadius: 12,
    padding: 2,
  },
  // Name section
  profileNameSection: {
    alignItems: "center",
    marginBottom: tokens.spacing.xl,
  },
  profileName: {
    color: tokens.colors.text.primary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: tokens.spacing.xs,
    textAlign: "center",
  },
  profileLocation: {
    color: tokens.colors.text.muted,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: tokens.spacing.xs,
    textAlign: "center",
  },
  profileMeta: {
    color: tokens.colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: tokens.spacing.xs,
    textAlign: "center",
  },
  // Sections
  profileSection: {
    marginTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.lg,
  },
  // Section Header with Red Accent
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.spacing.md,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: tokens.colors.primary.solid,
    marginRight: tokens.spacing.sm,
  },
  sectionTitle: {
    color: tokens.colors.primary.solid,
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  // About Section
  aboutText: {
    color: tokens.colors.text.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 45, 45, 0.2)",
    marginTop: tokens.spacing.lg,
  },
  // Photo carousel
  profileCarousel: {
    marginHorizontal: -tokens.spacing.lg,
    marginBottom: 0,
  },
  // Badges
  profileBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  profileBadge: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bg.raised,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
  },
  profileBadgeText: {
    color: tokens.colors.text.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  // Prompts - Red Outlined Cards
  promptCard: {
    borderWidth: 1.5,
    borderColor: tokens.colors.primary.solid,
    borderRadius: 18,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  promptTitle: {
    color: tokens.colors.text.subtle,
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: tokens.spacing.xs,
    fontWeight: "400",
  },
  promptAnswer: {
    color: tokens.colors.text.primary,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
  },
  // Interests - Red Outlined Pills
  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  interestPill: {
    borderWidth: 1.5,
    borderColor: tokens.colors.primary.solid,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: "transparent",
  },
  interestText: {
    color: tokens.colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  // Vibe highlights
  profileVibeItem: {
    color: tokens.colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: tokens.spacing.sm,
    paddingLeft: tokens.spacing.md,
  },
  // Unavailable state
  profileUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.xxxl,
  },
  profileUnavailableText: {
    color: tokens.colors.text.muted,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default DirectChatScreen;






