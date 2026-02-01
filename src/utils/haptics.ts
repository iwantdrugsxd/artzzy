import * as Haptics from "expo-haptics";

const safeImpact = async (style: Haptics.ImpactFeedbackStyle) => {
  try {
    await Haptics.impactAsync(style);
  } catch (_) {
    // Haptics can fail on unsupported platforms; ignore.
  }
};

const safeSelection = async () => {
  try {
    await Haptics.selectionAsync();
  } catch (_) {
    // Ignore haptics errors on unsupported platforms.
  }
};

export const haptics = {
  light: () => safeImpact(Haptics.ImpactFeedbackStyle.Light),
  medium: () => safeImpact(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => safeImpact(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => safeSelection(),
};
