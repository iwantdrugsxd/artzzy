// Phase I: Legacy typography exports - mapped to tokens (1.4 line-height)
import tokensDefault, { tokens as tokensNamed } from "./tokens";

const resolvedTokens = tokensNamed ?? tokensDefault;
const resolvedTypography = resolvedTokens?.typography ?? {};

export const typography: Record<string, any> = {
  h1: resolvedTypography.h1,
  h2: resolvedTypography.h2,
  h3: resolvedTypography.h3,
  body: resolvedTypography.body,
  body2: resolvedTypography.body2,
  caption: resolvedTypography.caption,
  micro: resolvedTypography.micro,
};
