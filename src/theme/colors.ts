// Phase I: Legacy color exports - mapped to tokens (only black, red, white)
import tokensDefault, { tokens as tokensNamed } from "./tokens";

const resolvedTokens = tokensNamed ?? tokensDefault ?? ({} as any);
const resolvedColors = resolvedTokens.colors ?? ({} as any);

const colorsConst = {
  // Backgrounds - mapped to tokens
  bg: resolvedColors.bg?.base,
  surface1: resolvedColors.bg?.surface,
  surface2: resolvedColors.bg?.raised,
  surface3: resolvedColors.bg?.raised, // Alias for raised
  border: resolvedColors.overlay?.glassMedium,
  divider: resolvedColors.overlay?.glass,
  // Text - mapped to tokens
  textPrimary: resolvedColors.text?.primary,
  textSecondary: resolvedColors.text?.secondary,
  textMuted: resolvedColors.text?.muted,
  textSubtle: resolvedColors.text?.subtle,
  // Primary - mapped to tokens
  primary: resolvedColors.primary?.solid,
  primarySoft: resolvedColors.primary?.soft,
  onPrimary: resolvedColors.primary?.onPrimary,
  onPrimaryMuted: resolvedColors.text?.muted,
  accent: resolvedColors.primary?.solid,
  // Phase I: No status colors - use primary for errors/warnings
  success: resolvedColors.primary?.solid, // Red for all status
  danger: resolvedColors.primary?.solid,
  warning: resolvedColors.primary?.solid,
  info: resolvedColors.primary?.solid,
  dangerSoft: resolvedColors.primary?.soft,
  dangerBorder: resolvedColors.primary?.solid,
  warningSoft: resolvedColors.primary?.soft,
  infoSoft: resolvedColors.primary?.soft,
  successSoft: resolvedColors.primary?.soft,
  // Overlays - mapped to tokens
  overlayLight: resolvedColors.overlay?.strong,
  overlay: resolvedColors.overlay?.strong,
  overlayStrong: resolvedColors.overlay?.strong,
  overlaySoft: resolvedColors.overlay?.strong,
  shadowText: resolvedColors.bg?.base,
  bgGlass: resolvedColors.overlay?.glass,
  transparent: resolvedColors.transparent,

  // Legacy aliases
  background: resolvedColors.bg?.base,
  surface: resolvedColors.bg?.surface,
  surfaceLight: resolvedColors.bg?.raised,
};

export const colors = colorsConst;
export default colorsConst;
