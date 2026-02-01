import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../types/navigation";
import { tokens } from "../theme";

type Nav = StackNavigationProp<RootStackParamList>;

const DevToolsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, profile, loading } = useAuth();

  const handleOpenOutings = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Home",
        params: { screen: "Discover" },
      })
    );
  };

  const handleLogAuth = () => {
    // Only logs state; no auth logic changes.
    console.log("DevTools auth state", { user, profile, loading });
  };

  return (
    <Screen>
      <ScreenHeader title="DevTools" showDivider={false} />
      <View style={styles.body}>
        <Text style={styles.caption}>Development only</Text>
        <PrimaryButton label="Open Outings" onPress={handleOpenOutings} />
        <SecondaryButton label="Log Auth State" onPress={handleLogAuth} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
  },
  caption: {
    color: tokens.colors.text.subtle,
    ...tokens.typography.caption,
  },
});

export default DevToolsScreen;

