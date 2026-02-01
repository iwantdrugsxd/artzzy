import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Outing } from "../types/outing";
import { OutingRequestStatus } from "../utils/outingStorage";
import { colors, tokens } from "../theme";
import { getEventPolicy, getModeBadge } from "../utils/eventPolicy";
import { haptics } from "../utils/haptics";

type OutingCardProps = {
  outing: Outing;
  requestStatus: OutingRequestStatus | null;
  isMember?: boolean;
  vibeMatch?: number;
  hostScore?: number; // Phase 2: Host credibility score
  isHost?: boolean;
  currentUserId?: string;
  onPress: () => void;
  onCtaPress: () => void;
};

const formatDateTime = (value: any) => {
  if (!value?.toDate) return "";
  const date = value.toDate();
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
};

export const OutingCard: React.FC<OutingCardProps> = ({
  outing,
  requestStatus,
  isMember = false,
  vibeMatch,
  hostScore, // Phase 2: Host score
  isHost = false,
  currentUserId,
  onPress,
  onCtaPress,
}) => {
  const policy = currentUserId
    ? getEventPolicy({
        outing,
        currentUserId,
        requestStatus,
        isMember,
        isHost,
      })
    : null;

  const ctaLabel = policy?.ctaLabel || "View Details";
  const ctaDisabled = policy ? !policy.ctaEnabled : false;

  const spotsLeft = Math.max(outing.maxGuests - (outing.approvedCount ?? 0), 0);
  const isFull = spotsLeft <= 0 || outing.status === "full"; // Phase 2: Check status field too
  const modeBadge = outing.eventMode ? getModeBadge(outing.eventMode) : null;

  // Phase 2: Status badge - use only red (black/red/white only)
  const statusBadge = isFull
    ? { label: "FULL", tone: tokens.colors.primary.solid }
    : requestStatus === "approved"
      ? { label: "APPROVED", tone: tokens.colors.primary.solid }
      : requestStatus === "pending"
        ? { label: "REQUESTED", tone: tokens.colors.primary.solid }
        : requestStatus === "declined"
          ? { label: "DECLINED", tone: tokens.colors.primary.solid }
          : null;

  const guestCount = outing.maxGuests ? `${outing.maxGuests} Guests` : "Guests";

  const handleCardPress = () => {
    haptics.light();
    onPress();
  };

  const handleCtaPress = () => {
    if (ctaDisabled) return;
    haptics.medium();
    onCtaPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={handleCardPress}
    >
      {/* Full-bleed hero image with gradient scrim */}
      <View style={styles.imageContainer}>
        <ImageBackground
          source={{ uri: outing.coverImageUrl }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          {/* Subtle haze overlay */}
          <View style={styles.hazeOverlay} />
          {/* Black to transparent gradient scrim */}
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Badges overlay */}
          <View style={styles.badgesRow}>
            <View style={styles.leftBadges}>
              {modeBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{modeBadge}</Text>
                </View>
              ) : null}
              {vibeMatch !== undefined && vibeMatch > 0 && (
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>{vibeMatch}% MATCH</Text>
                </View>
              )}
            </View>
            {statusBadge ? (
              <View style={[styles.badge, { borderColor: statusBadge.tone }]}>
                <Text style={[styles.badgeText, { color: statusBadge.tone }]}>
                  {statusBadge.label}
                </Text>
              </View>
            ) : null}
          </View>
        </ImageBackground>
      </View>

      {/* Content section */}
      <View style={styles.content}>
        <View style={styles.contentLeft}>
          <Text style={styles.title} numberOfLines={2}>
            {outing.title}
          </Text>
          {outing.location?.name && (
            <Text style={styles.location} numberOfLines={1}>
              {outing.location.name}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color={tokens.colors.text.muted} />
              <Text style={styles.metaText}>{formatDateTime(outing.dateTime)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={16} color={tokens.colors.text.muted} />
              <Text style={styles.metaText}>
                {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
              </Text>
            </View>
            {/* Phase 2: Host score pill */}
            {hostScore !== undefined && (
              <View style={styles.hostScorePill}>
                <Text style={styles.hostScoreText}>Host: {hostScore}/100</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            ctaDisabled ? styles.ctaDisabled : null,
            pressed && !ctaDisabled ? styles.ctaPressed : null,
          ]}
          onPress={(event) => {
            event.stopPropagation();
            handleCtaPress();
          }}
          disabled={ctaDisabled}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.bg.surface,
    borderRadius: tokens.radius.cardPremium,
    overflow: "hidden",
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.card.hero,
  },
  cardPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
  },
  imageContainer: {
    width: "100%",
    height: 280, // Increased height for premium feel
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 280,
  },
  cardImageStyle: {
    resizeMode: "cover",
  },
  hazeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)", // Subtle white overlay for haze effect
  },
  badgesRow: {
    position: "absolute",
    top: tokens.spacing.lg,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  badge: {
    backgroundColor: tokens.colors.overlay.glass,
    borderWidth: 1,
    borderColor: tokens.colors.overlay.glassMedium,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.pill,
    ...tokens.shadows.glass,
  },
  badgeText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  matchBadge: {
    backgroundColor: tokens.colors.overlay.glass,
    borderWidth: 1.5,
    borderColor: tokens.colors.primary.solid,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.pill,
    ...tokens.shadows.glow.medium,
  },
  matchBadgeText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  content: {
    padding: tokens.spacing.xl,
    backgroundColor: tokens.colors.bg.surface,
    gap: tokens.spacing.md,
  },
  contentLeft: {
    gap: tokens.spacing.xs + 2,
  },
  title: {
    color: tokens.colors.text.primary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  location: {
    color: tokens.colors.text.muted,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    marginTop: tokens.spacing.xs / 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  metaText: {
    color: tokens.colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  ctaButton: {
    backgroundColor: tokens.colors.primary.solid,
    borderRadius: tokens.radius.button,
    height: 48,
    paddingHorizontal: tokens.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.spacing.sm,
    ...tokens.shadows.glow.soft,
  },
  ctaPressed: {
    transform: [{ scale: tokens.animation.pressScale }],
    opacity: 0.9,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    color: tokens.colors.primary.onPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Phase 2: Host score pill
  hostScorePill: {
    backgroundColor: tokens.colors.bg.base,
    borderWidth: 1,
    borderColor: tokens.colors.primary.solid,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    ...tokens.shadows.glow.soft,
  },
  hostScoreText: {
    color: tokens.colors.text.primary,
    ...tokens.typography.micro,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
