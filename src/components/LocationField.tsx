import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, layout, radius, typography } from "../theme";

export type LocationValue = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  // Optional fields for detailed address
  addressLine2?: string;      // building/flat/apt
  landmark?: string;          // landmark / nearby
  instructions?: string;      // directions / access notes
  fullAddress?: string;       // combined display string (optional)
};

type Props = {
  value: LocationValue | null;
  onChange: (loc: LocationValue) => void;
  onOpenMap?: () => void;
};

const LocationField: React.FC<Props> = ({ value, onChange, onOpenMap }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>
      {!value && (
        <Pressable
          style={styles.addButton}
          onPress={onOpenMap}
        >
          <Ionicons
            name="add"
            size={18}
            color={colors.onPrimary}
            style={styles.addIcon}
          />
          <Text style={styles.addButtonText}>Add address</Text>
        </Pressable>
      )}

      {value && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedTextWrap}>
            <Text style={styles.selectedTitle}>{value.name}</Text>
            {value.address ? (
              <Text style={styles.selectedSubtitle}>{value.address}</Text>
            ) : null}
            {value.addressLine2 ? (
              <Text style={styles.selectedSubtitle}>{value.addressLine2}</Text>
            ) : null}
            {value.landmark ? (
              <Text style={styles.selectedSubtitle}>Near {value.landmark}</Text>
            ) : null}
          </View>
          {onOpenMap ? (
            <Pressable onPress={onOpenMap}>
              <Text style={styles.refineText}>Change</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: layout.section,
  },
  label: {
    color: colors.textSecondary,
    ...typography.caption,
    marginBottom: layout.compact,
  },
  addButton: {
    marginTop: layout.compact,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    paddingVertical: layout.compact,
    paddingHorizontal: layout.section,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    marginRight: layout.compact / 2,
  },
  addButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  selectedCard: {
    marginTop: layout.section,
    padding: layout.section,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedTextWrap: {
    flex: 1,
    marginRight: layout.section,
    gap: layout.compact,
  },
  selectedTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  selectedSubtitle: {
    color: colors.textMuted,
    ...typography.body2,
  },
  refineText: {
    color: colors.textSecondary,
    ...typography.micro,
  },
});

export default LocationField;



