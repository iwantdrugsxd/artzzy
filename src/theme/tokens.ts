/**
 * Design Tokens - Single source of truth for all UI values
 * Follows 8pt grid system. All spacing in multiples of 8.
 */

// ============================================================================
// COLORS - Semantic color system
// ============================================================================

const tokensConst = {
  colors: {
    // Backgrounds - Phase I: Only black variants
    bg: {
      base: "#000000", // Pure black - main app background
      surface: "#0A0A0A", // Card/surface background
      raised: "#111111", // Elevated surfaces
      // Legacy/alias keys used across the codebase
      bg: "#000000",
      background: "#000000",
      surface3: "#111111",
      primary: "#FF2D2D",
      overlayStrong: "rgba(0,0,0,0.65)",
      textMuted: "rgba(255,255,255,0.55)",
    },

    // Text - Phase I: Only white with opacity
    text: {
      primary: "#FFFFFF", // Main text
      secondary: "rgba(255,255,255,0.78)", // Secondary text
      muted: "rgba(255,255,255,0.55)", // Muted text
      subtle: "rgba(255,255,255,0.38)", // Subtle text (timestamps, hints)
    },

    // Primary brand - Phase I: Only red
    primary: {
      solid: "#FF2D2D", // Main red
      soft: "rgba(255,45,45,0.15)", // Soft background
      onPrimary: "#FFFFFF", // Text on primary (white)
      glow: "#FF2D2D", // Glow color (same as solid)
      border: "#FF2D2D", // Border color (same as solid)
    },

    // Danger - Phase I: Same as primary (red)
    danger: {
      solid: "#FF2D2D",
      soft: "rgba(255,45,45,0.15)",
      border: "#FF2D2D",
      glow: "#FF2D2D",
    },

    // Overlays - Phase I: Only black/white with opacity
    overlay: {
      glass: "rgba(255,255,255,0.06)", // Glass effect
      glassMedium: "rgba(255,255,255,0.12)", // Medium glass
      strong: "rgba(0,0,0,0.65)", // Strong overlay
      medium: "rgba(255,255,255,0.12)", // Alias for glassMedium
    },

    // Border - mapped to overlay for consistency
    border: "rgba(255,255,255,0.12)", // Same as overlay.glassMedium
    divider: "rgba(255,255,255,0.06)", // Same as overlay.glass

    // Status colors - Phase I: All red (for backward compatibility)
    success: {
      solid: "#FF2D2D",
      glow: "#FF2D2D", // Same as primary.glow
      soft: "rgba(255,45,45,0.15)",
      border: "#FF2D2D",
    },
    warning: {
      solid: "#FF2D2D",
      glow: "#FF2D2D",
      soft: "rgba(255,45,45,0.15)",
      border: "#FF2D2D",
    },

    transparent: "transparent",
  },

  // ============================================================================
  // TYPOGRAPHY - Phase I: 1.4 line-height for all
  // ============================================================================
  typography: {
    h1: {
      fontSize: 32,
      lineHeight: 45, // 1.4x
      fontWeight: "700" as const,
    },
    h2: {
      fontSize: 26,
      lineHeight: 36, // 1.4x
      fontWeight: "700" as const,
    },
    h3: {
      fontSize: 20,
      lineHeight: 28, // 1.4x
      fontWeight: "600" as const,
    },
    body: {
      fontSize: 15,
      lineHeight: 21, // 1.4x
      fontWeight: "500" as const,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20, // 1.4x
      fontWeight: "400" as const,
    },
    caption: {
      fontSize: 12,
      lineHeight: 17, // 1.4x
      fontWeight: "600" as const,
    },
    micro: {
      fontSize: 11,
      lineHeight: 15, // 1.4x
      fontWeight: "600" as const,
      letterSpacing: 0.6,
    },
  },

  // ============================================================================
  // SPACING - 8pt grid system
  // ============================================================================
  spacing: {
    // Base unit
    unit: 8,

    // Standard spacing values
    xs: 4, // 0.5 units
    sm: 8, // 1 unit
    md: 12, // 1.5 units
    lg: 16, // 2 units
    xl: 24, // 3 units (gutter)
    xxl: 32, // 4 units
    xxxl: 48, // 6 units

    // Layout constants
    gutter: 24, // Standard horizontal padding
    section: 24, // Vertical spacing between sections
    item: 12, // Spacing between items in a list
    compact: 8, // Tight spacing
    touchTarget: 48, // Minimum touch target
  },

  // ============================================================================
  // RADIUS - Phase I: Exact values
  // ============================================================================
  radius: {
    card: 22, // Cards
    cardPremium: 22, // Premium cards (same as card)
    pill: 999, // Pills/chips
    button: 16, // Buttons
    input: 16, // Inputs (same as button)
    sheet: 22, // Sheets (same as card)
  },

  // ============================================================================
  // SHADOWS & ELEVATION - Phase I: Red glow only
  // ============================================================================
  shadows: {
    // Card elevation
    card: {
      flat: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
      raised: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      },
      hero: {
        shadowColor: "#FF2D2D", // Red edge glow for hero cards
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      },
    },

    // Red glow effects (25-40% opacity)
    glow: {
      soft: {
        shadowColor: "#FF2D2D",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
      },
      medium: {
        shadowColor: "#FF2D2D",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      },
    },

    // Glass shadow (for glass effects)
    glass: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  },

  // ============================================================================
  // ANIMATIONS - Phase I: Motion standards
  // ============================================================================
  animation: {
    pressScale: 0.98,
    duration: {
      fast: 180, // 180ms
      base: 260, // 260ms
      slow: 420, // 420ms
    },
    transition: 400, // 400ms (for transitions)
    easing: {
      standard: "easeOut" as const,
    },
  },
} as const;

export const tokens = tokensConst;
export const typography = tokensConst.typography;
export default tokensConst;

// Note: Individual exports (colors, typography, etc.) are NOT exported here
// to avoid conflicts with legacy exports in theme/index.ts
// Use tokens.colors, tokens.typography, etc. or import from theme/index.ts
