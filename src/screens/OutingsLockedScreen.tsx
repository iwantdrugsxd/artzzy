import React from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { colors, layout, radius, typography } from "../theme";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Pill from "../components/Pill";

const OutingsLockedScreen: React.FC = () => {
  return (
    <Screen contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Outings"
        actions={<Pill label="LOCKED" selected />}
      />
      <Card style={styles.card} padding="lg">
        <View style={styles.lockCircle}>
          <Text style={styles.lockIcon}>LOCK</Text>
        </View>
        <Text style={styles.cardTitle}>Real parties are coming to Mumbai soon.</Text>
        <Text style={styles.cardSubtitle}>
          Exclusive access to the city's most curated social energy. Stay tuned
          for the drop.
        </Text>
        <PrimaryButton
          label="Get Premium for Early Access"
          onPress={() => Alert.alert("Premium", "Premium access is coming soon.")}
          style={styles.cta}
        />
        <Text style={styles.link} onPress={() => Alert.alert("Host", "Host applications open soon.")}> 
          Apply to become a Partizo Host
        </Text>
        <Text style={styles.footer}>CURATED COMMUNITY</Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: layout.major,
  },
  card: {
    marginTop: layout.section,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: layout.section,
  },
  lockIcon: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.textPrimary,
    ...typography.h3,
    marginBottom: layout.compact,
  },
  cardSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
    marginBottom: layout.section,
  },
  cta: {
    marginBottom: layout.section,
  },
  link: {
    color: colors.textMuted,
    textAlign: "center",
    ...typography.body2,
  },
  footer: {
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: layout.section,
    letterSpacing: 1.6,
    ...typography.micro,
  },
});

export default OutingsLockedScreen;
