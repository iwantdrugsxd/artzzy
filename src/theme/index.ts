// Import spacing exports directly to ensure they're available
import { spacing as spacingImport, layout as layoutImport } from "./spacing";

// Import tokens (before exports to avoid hoisting issues)
import tokensDefault, { tokens as tokensImport, typography as tokensTypography } from "./tokens";

// Import legacy exports directly to ensure they're available
import { colors as colorsImport } from "./colors";
import { typography as typographyImport } from "./typography";
import { shadows as shadowsImport } from "./shadows";
import { radius as radiusImport } from "./radius";

// Export spacing and layout - direct re-export using imported values
export const spacing = spacingImport;
export const layout = layoutImport;

// Legacy exports (for backward compatibility - many files still use these)
// Import and export directly to avoid re-export issues
const resolvedColors = colorsImport ?? {};
export const colors = resolvedColors;
const resolvedTypography = tokensTypography ?? typographyImport ?? {};
export const typography = resolvedTypography;
export const shadows = shadowsImport;
export const radius = radiusImport;

// New unified tokens (preferred for new code)
// Export tokens - use a const to ensure it's evaluated
const resolvedTokens = tokensImport ?? tokensDefault ?? {};
const safeTokens = {
  ...resolvedTokens,
  colors: resolvedTokens?.colors ?? resolvedColors,
  typography: resolvedTokens?.typography ?? resolvedTypography,
  spacing: resolvedTokens?.spacing ?? spacingImport ?? {},
  radius: resolvedTokens?.radius ?? radiusImport ?? {},
  shadows: resolvedTokens?.shadows ?? shadowsImport ?? {},
  animation: resolvedTokens?.animation ?? {},
} as const;

export const tokens = safeTokens;

// Export individual token properties for convenience
export const tokenColors = safeTokens.colors;
export const tokenTypography = safeTokens.typography;
export const tokenSpacing = safeTokens.spacing;
export const tokenRadius = safeTokens.radius;
export const tokenShadows = safeTokens.shadows;
export const animation = safeTokens.animation;

// Aggregate theme export for any default/namespace imports.
export const theme = {
  colors,
  typography,
  shadows,
  radius,
  spacing,
  layout,
  tokens,
  tokenColors,
  tokenTypography,
  tokenSpacing,
  tokenRadius,
  tokenShadows,
  animation,
} as const;

export default theme;
