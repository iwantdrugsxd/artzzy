import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, layout, typography } from "../theme";

type Props = {
  title: string;
  actions?: React.ReactNode;
  subheader?: React.ReactNode;
  showDivider?: boolean;
  compact?: boolean;
};

const ScreenHeader: React.FC<Props> = ({
  title,
  actions,
  subheader,
  showDivider = true,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subheader ? <View style={styles.subheader}>{subheader}</View> : null}
      {showDivider ? (
        <View style={[styles.divider, compact ? styles.dividerCompact : null]} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: layout.section,
    marginBottom: layout.section,
  },
  containerCompact: {
    marginTop: layout.element,
    marginBottom: layout.element,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: layout.element,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.element,
  },
  subheader: {
    marginTop: layout.element,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginTop: layout.section,
  },
  dividerCompact: {
    marginTop: layout.element,
  },
});

export default ScreenHeader;
