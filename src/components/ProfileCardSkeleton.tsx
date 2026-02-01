import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { colors, tokens } from "../theme";
import Skeleton from "./Skeleton";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 420;
const MIDDLE_IMAGE_HEIGHT = 280;
const CARD_WIDTH = width - tokens.spacing.xl * 2;

const ProfileCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Hero Image Skeleton */}
      <View style={styles.heroWrap}>
        <Skeleton height={HERO_HEIGHT} radius={0} style={styles.heroImage} />
        
        {/* Floating Pills Skeleton */}
        <View style={styles.heroOverlay}>
          <Skeleton width={100} height={28} radius={tokens.radius.pill} />
          <Skeleton width={80} height={28} radius={tokens.radius.pill} />
        </View>
      </View>

      {/* Content Block */}
      <View style={styles.content}>
        {/* Name + Age */}
        <Skeleton height={34} width="70%" radius={8} />
        
        {/* Height (optional - sometimes shown) */}
        <Skeleton height={20} width="30%" radius={6} style={styles.heightSkeleton} />
        
        {/* Tag Chips Row */}
        <View style={styles.tagRow}>
          <Skeleton width={80} height={28} radius={tokens.radius.pill} />
          <Skeleton width={90} height={28} radius={tokens.radius.pill} />
          <Skeleton width={75} height={28} radius={tokens.radius.pill} />
        </View>

        {/* Middle Image Skeleton */}
        <View style={styles.middleImageWrap}>
          <Skeleton height={MIDDLE_IMAGE_HEIGHT} radius={tokens.radius.cardPremium} />
        </View>

        {/* Prompts Section */}
        <View style={styles.promptsSection}>
          {/* Prompt 1 */}
          <View style={styles.promptItem}>
            <Skeleton height={20} width="60%" radius={6} style={styles.promptQuestion} />
            <Skeleton height={24} width="100%" radius={6} style={styles.promptAnswer} />
            <Skeleton height={24} width="85%" radius={6} style={styles.promptAnswer} />
          </View>
          
          {/* Prompt 2 */}
          <View style={styles.promptItem}>
            <Skeleton height={20} width="55%" radius={6} style={styles.promptQuestion} />
            <Skeleton height={24} width="100%" radius={6} style={styles.promptAnswer} />
            <Skeleton height={24} width="90%" radius={6} style={styles.promptAnswer} />
          </View>
          
          {/* Prompt 3 */}
          <View style={styles.promptItem}>
            <Skeleton height={20} width="65%" radius={6} style={styles.promptQuestion} />
            <Skeleton height={24} width="95%" radius={6} style={styles.promptAnswer} />
            <Skeleton height={24} width="80%" radius={6} style={styles.promptAnswer} />
          </View>
        </View>

        {/* Interests Section */}
        <View style={styles.interestsSection}>
          <Skeleton height={16} width="25%" radius={6} style={styles.sectionLabel} />
          <View style={styles.interestsRow}>
            <Skeleton width={70} height={32} radius={tokens.radius.pill} />
            <Skeleton width={85} height={32} radius={tokens.radius.pill} />
            <Skeleton width={75} height={32} radius={tokens.radius.pill} />
            <Skeleton width={90} height={32} radius={tokens.radius.pill} />
            <Skeleton width={65} height={32} radius={tokens.radius.pill} />
            <Skeleton width={80} height={32} radius={tokens.radius.pill} />
          </View>
        </View>
      </View>
    </View>
  );
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
    borderTopLeftRadius: tokens.radius.cardPremium,
    borderTopRightRadius: tokens.radius.cardPremium,
    overflow: "hidden",
  },
  heroImage: {
    borderTopLeftRadius: tokens.radius.cardPremium,
    borderTopRightRadius: tokens.radius.cardPremium,
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
  content: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.bg.base,
  },
  heightSkeleton: {
    marginTop: tokens.spacing.xs,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  middleImageWrap: {
    width: CARD_WIDTH,
    height: MIDDLE_IMAGE_HEIGHT,
    marginVertical: tokens.spacing.md,
    borderRadius: tokens.radius.cardPremium,
    overflow: "hidden",
    marginHorizontal: -tokens.spacing.lg,
  },
  promptsSection: {
    marginTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
  },
  promptItem: {
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  promptQuestion: {
    marginBottom: tokens.spacing.xs,
  },
  promptAnswer: {
    marginTop: tokens.spacing.xs / 2,
  },
  interestsSection: {
    marginTop: tokens.spacing.md,
  },
  sectionLabel: {
    marginBottom: tokens.spacing.sm,
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
});

export default ProfileCardSkeleton;



