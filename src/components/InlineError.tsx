import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, layout, typography } from "../theme";

type Props = {
  message: string;
  onRetry?: () => void;
};

const InlineError: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.compact,
    paddingVertical: layout.compact,
    flexWrap: "wrap",
  },
  text: {
    color: colors.danger,
    ...typography.body2,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  retryText: {
    color: colors.danger,
    ...typography.body2,
    fontWeight: "600",
  },
});

export default InlineError;
