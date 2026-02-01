import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors, layout, radius, typography } from "../theme";
import { haptics } from "../utils/haptics";

type Props = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const DestructiveButton: React.FC<Props> = ({ label, onPress, style, disabled }) => {
  const handlePress = () => {
    if (disabled) return;
    haptics.heavy();
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.section,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.danger,
    ...typography.body,
    fontWeight: "600",
  },
});

export default DestructiveButton;
