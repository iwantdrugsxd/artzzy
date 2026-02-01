import React from "react";
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, layout, tokens } from "../theme";
import Pill from "./Pill";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 420; // Full-bleed hero image
const MIDDLE_IMAGE_HEIGHT = 280; // Middle image height
const CARD_WIDTH = width - tokens.spacing.xl * 2;

type Props = {
  name: string;
  age?: number | null;
  height?: string | number | null; // Height in cm or inches
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  photo?: string | null;
  photos?: string[];
  interests?: string[];
  score: number;
  tags: string[];
  onPress?: () => void;
  showDetails?: boolean;
  vibeHighlights?: string[];
  memberSince?: number | string | null;
  quickBadges?: string[];
  prompts?: Array<{ id: string; category: string; question: string; answer: string }>;
  isActive?: boolean; // For "ACTIVE NOW" pill
  // Phase 1: Profile upgrades
  work?: string | null;
  education?: string | null;
  isVerified?: boolean;
  // Phase 1: Why this match?
  matchReasons?: string[]; // Array of match reason strings
};

// Helper to format height
const formatHeight = (height: string | number | null | undefined): string | null => {
  if (!height) return null;
  if (typeof height === "number") {
    // Assume cm if > 100, otherwise inches
    return height > 100 ? `${height} cm` : `${height}"`;
  }
  if (typeof height === "string") {
    return height.trim() || null;
  }
  return null;
};

const ProfileCard: React.FC<Props> = ({
  name,
  age,
  height,
  city,
  country,
  bio,
  photo,
  photos = [],
  interests = [],
  score,
  tags = [],
  onPress,
  showDetails = true,
  vibeHighlights = [],
  memberSince,
  quickBadges = [],
  prompts = [],
  isActive = true,
  work,
  education,
  isVerified = false,
  matchReasons = [],
}) => {
  const sourcePhotos = photos.length > 0 ? photos : photo ? [photo] : [];
  const heroImage = sourcePhotos[0] || null;
  const middleImage = sourcePhotos[1] || null; // Second photo for middle section

  const formattedHeight = formatHeight(height);
  const knownForTags = tags.slice(0, 3);

  // Filter valid prompts - only use real user data
  const validPrompts = (prompts || []).filter(
    (p) => p && p.question && p.answer && p.answer.trim().length > 0
  );

  const content = (
    <>
      {/* 1. Top Hero Image (Full-bleed, edge-to-edge) */}
      <View style={styles.heroWrap}>
        {heroImage ? (
          <View style={styles.heroImageContainer}>
            <ImageBackground
              source={{ uri: heroImage }}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            />
            {/* Subtle haze overlay for blur effect */}
            <View style={styles.hazeOverlay} />
            {/* Black to transparent gradient scrim */}
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackText}>{name[0]?.toUpperCase() || "P"}</Text>
          </View>
        )}

        {/* Floating Pills Overlay */}
        <View style={styles.heroOverlay} pointerEvents="none">
          {/* Left: ACTIVE NOW pill */}
          {isActive && (
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>ACTIVE NOW</Text>
            </View>
          )}

          {/* Right: Match percentage pill */}
          {score > 0 && (
            <View style={styles.matchPill}>
              <Text style={styles.matchText}>{score}% MATCH</Text>
            </View>
          )}
        </View>
      </View>

      {showDetails ? (
        <View style={styles.content} pointerEvents="none">
          {/* 2. Content Block: Name + Age + Height + Tags */}
          <View style={styles.contentBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {name}
                {typeof age === "number" ? `, ${age}` : ""}
              </Text>
              {/* Phase 1: Verification badge */}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={tokens.colors.primary.solid} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            
            {/* Height - only show if available */}
            {formattedHeight && (
              <Text style={styles.height}>{formattedHeight}</Text>
            )}

            {/* Phase 1: Work/Education - only show if available */}
            {work && (
              <Text style={styles.workEducation}>{work}</Text>
            )}
            {education && (
              <Text style={styles.workEducation}>{education}</Text>
            )}

            {/* Tags/Chips Row */}
            {knownForTags.length > 0 && (
              <View style={styles.tagRow}>
                {knownForTags.map((tag, idx) => (
                  <View key={idx} style={styles.vibeChip}>
                    <Text style={styles.vibeChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Phase 1: "Why This Match?" micro-panel */}
            {matchReasons.length > 0 && (
              <View style={styles.matchReasonsPanel}>
                <Text style={styles.matchReasonsTitle}>Why this match?</Text>
                {matchReasons.slice(0, 2).map((reason, idx) => (
                  <Text key={idx} style={styles.matchReasonItem}>• {reason}</Text>
                ))}
              </View>
            )}
          </View>

          {/* 3. Middle Image (Second Photo) - Full-width edge-to-edge */}
          {middleImage ? (
            <View style={styles.middleImageWrap}>
              <ImageBackground
                source={{ uri: middleImage }}
                style={styles.middleImage}
                imageStyle={styles.middleImageStyle}
              />
            </View>
          ) : null}

          {/* 4. Prompts Section - Only show if user has real prompts */}
          {validPrompts.length > 0 && (
            <View style={styles.promptsSection}>
              {validPrompts.map((prompt, idx) => (
                <View key={prompt.id || `qa_${idx}`} style={styles.promptItem}>
                  <Text style={styles.promptQuestion}>{prompt.question}</Text>
                  <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 5. Hobbies/Interests Section */}
          {interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionLabel}>INTERESTS</Text>
              <View style={styles.interestsRow}>
                {interests.slice(0, 6).map((interest, idx) => (
                  <Pill key={idx} label={interest} />
                ))}
              </View>
            </View>
          )}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: tokens.radius.cardPremium,
    overflow: "hidden",
    backgroundColor: tokens.colors.bg.base,
    ...tokens.shadows.card.hero,
  },
  heroWrap: {
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroImageContainer: {
    width: "100%",
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: HERO_HEIGHT,
  },
  heroImageStyle: {
    resizeMode: "cover",
    borderTopLeftRadius: tokens.radius.cardPremium,
    borderTopRightRadius: tokens.radius.cardPremium,
  },
  hazeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)", // Subtle white overlay for haze effect
  },
  heroFallback: {
    height: HERO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bg.raised,
    borderTopLeftRadius: tokens.radius.cardPremium,
    borderTopRightRadius: tokens.radius.cardPremium,
  },
  heroFallbackText: {
    color: tokens.colors.text.primary,
    fontSize: 64,
    fontWeight: "700",
  },
  heroOverlay: {
    position: "absolute",
    top: tokens.spacing.lg,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.overlay.glass,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs + 2,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    gap: tokens.spacing.xs,
    ...tokens.shadows.glass,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.primary.solid,
    ...tokens.shadows.glow.soft,
    shadowColor: tokens.colors.primary.glow,
  },
  activeText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  matchPill: {
    backgroundColor: tokens.colors.overlay.glass,
    borderWidth: 1.5,
    borderColor: tokens.colors.primary.solid,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs + 2,
    ...tokens.shadows.glow.medium,
  },
  matchText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  content: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.bg.base,
  },
  contentBlock: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  name: {
    color: tokens.colors.text.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  height: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    fontSize: 14,
    marginTop: -tokens.spacing.xs / 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  vibeChip: {
    backgroundColor: tokens.colors.primary.soft,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    ...tokens.shadows.glow.soft,
  },
  vibeChipText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontWeight: "700",
    fontSize: 11,
  },
  middleImageWrap: {
    width: CARD_WIDTH, // Full-width of card
    height: MIDDLE_IMAGE_HEIGHT,
    marginVertical: tokens.spacing.md,
    borderRadius: tokens.radius.cardPremium,
    overflow: "hidden",
    marginHorizontal: -tokens.spacing.lg, // Edge-to-edge within card
    marginLeft: -tokens.spacing.lg,
    marginRight: -tokens.spacing.lg,
  },
  middleImage: {
    width: "100%",
    height: MIDDLE_IMAGE_HEIGHT,
  },
  middleImageStyle: {
    resizeMode: "cover",
  },
  promptsSection: {
    marginTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
  promptItem: {
    marginBottom: tokens.spacing.lg,
  },
  promptQuestion: {
    // Elegant serif/display style - professional, premium
    color: tokens.colors.text.muted,
    fontSize: 13, // Increased from 11px
    lineHeight: 20, // Increased from 16px
    fontWeight: "600",
    letterSpacing: 1.8, // Increased letter spacing for elegance
    textTransform: "uppercase",
    marginBottom: tokens.spacing.sm, // Increased spacing
    // Note: For true serif font, would use: fontFamily: "Georgia" or "Times New Roman"
    // React Native default is System font, but styling creates elegant look
  },
  promptAnswer: {
    // Clean sans-serif, larger and more readable
    color: tokens.colors.text.primary,
    fontSize: 16, // Increased from 14px
    lineHeight: 24, // Increased from 22px for better readability
    fontWeight: "400",
    letterSpacing: 0.2, // Subtle letter spacing for readability
  },
  interestsSection: {
    marginTop: tokens.spacing.md,
  },
  sectionLabel: {
    color: tokens.colors.text.subtle,
    ...tokens.typography.micro,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: tokens.spacing.sm,
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  // Phase 1: Profile upgrades
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.primary.soft,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
  },
  verifiedText: {
    color: tokens.colors.text.primary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  workEducation: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
    fontSize: 14,
    marginTop: -tokens.spacing.xs / 2,
  },
  // Phase 1: Why this match?
  matchReasonsPanel: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  matchReasonsTitle: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: tokens.spacing.xs,
  },
  matchReasonItem: {
    color: tokens.colors.text.secondary,
    ...tokens.typography.body2,
    fontSize: 13,
    marginTop: tokens.spacing.xs / 2,
  },
});

export default ProfileCard;
