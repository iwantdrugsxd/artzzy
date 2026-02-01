import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, layout, typography } from "../theme";
import { logger } from "../utils/logger";
import PrimaryButton from "./PrimaryButton";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("render error", { error: error.message, info });
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>{this.state.message}</Text>
        <PrimaryButton label="Try again" onPress={this.handleReset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.gutter,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.compact,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body2,
    textAlign: "center",
    marginBottom: layout.section,
  },
});
