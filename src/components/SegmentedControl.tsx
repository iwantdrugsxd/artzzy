import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, tokens } from "../theme";
import { haptics } from "../utils/haptics";

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value?: string | null;
  onChange: (value: string) => void;
};

const SegmentedControl: React.FC<Props> = ({ options, value, onChange }) => {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              haptics.light();
              onChange(option.value);
            }}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
            {selected && <View style={styles.underline} />}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: tokens.colors.bg.raised,
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.button,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,
    position: "relative",
  },
  segmentSelected: {
    // No background change, just underline
  },
  label: {
    color: tokens.colors.text.muted,
    ...tokens.typography.body2,
  },
  labelSelected: {
    color: tokens.colors.text.primary,
    fontWeight: "700",
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: tokens.spacing.sm,
    right: tokens.spacing.sm,
    height: 3,
    backgroundColor: tokens.colors.primary.solid,
    borderRadius: 1.5,
    shadowColor: tokens.colors.primary.solid,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default SegmentedControl;
