/**
 * AppSheet - Standardized bottom sheet component
 * Visual styling only - no behavior changes
 */
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, tokens } from "../../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
};

export const AppSheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + tokens.spacing.xl },
            style,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}

          {/* Content */}
          <View style={styles.content}>{children}</View>

          {/* Sticky Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tokens.colors.overlay.medium,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: tokens.colors.bg.surface,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: tokens.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: tokens.spacing.lg,
  },
  title: {
    color: tokens.colors.text.primary,
    ...tokens.typography.h2,
    marginBottom: tokens.spacing.xl,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.divider,
  },
});

