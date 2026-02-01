import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ExpoLocation from "expo-location";
import { CommonActions, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { placesAutocomplete, placeDetails, PlaceSuggestion } from "../utils/places";
import { colors, layout, radius, typography } from "../theme";
import { Ionicons } from "@expo/vector-icons";

type Route = RouteProp<RootStackParamList, "LocationPicker">;
type Nav = StackNavigationProp<RootStackParamList, "LocationPicker">;
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_COORDS = {
  latitude: 19.076,
  longitude: 72.8777,
};

type LocationObject = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
};

const LocationPickerScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const initialLat = route.params?.initialLocation?.lat ?? DEFAULT_COORDS.latitude;
  const initialLng = route.params?.initialLocation?.lng ?? DEFAULT_COORDS.longitude;

  const [region, setRegion] = useState<Region>({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selected, setSelected] = useState<LocationObject | null>(
    route.params?.initialLocation && route.params.initialLocation.lat != null
      ? {
          name: route.params.initialLocation.name || "Pinned location",
          address: route.params.initialLocation.address || "",
          lat: route.params.initialLocation.lat!,
          lng: route.params.initialLocation.lng!,
          placeId: route.params.initialLocation.placeId,
        }
      : null
  );
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optional current-location centering if no explicit initial location
  useEffect(() => {
    let cancelled = false;
    const centerOnUser = async () => {
      if (route.params?.initialLocation?.lat != null) {
        setMapLoading(false);
        return;
      }
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setMapLoading(false);
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({});
        if (cancelled) return;
        setRegion((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
      } catch {
        // ignore; keep default
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    };
    centerOnUser();
    return () => {
      cancelled = true;
    };
  }, [route.params]);

  // Debounced autocomplete
  useEffect(() => {
    let cancelled = false;
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const results = await placesAutocomplete(query.trim(), {
          lat: region.latitude,
          lng: region.longitude,
        });
        if (!cancelled) {
          setSuggestions(results);
        }
      } catch {
        if (!cancelled) {
          setError("Could not search places. Pull to retry.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, region.latitude, region.longitude]);

  const recenterToUser = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await ExpoLocation.getCurrentPositionAsync({});
      setRegion((prev) => ({
        ...prev,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }));
    } catch {
      // ignore
    }
  };

  const handleSelectSuggestion = async (item: PlaceSuggestion) => {
    setSearching(true);
    setError(null);
    try {
      const details = await placeDetails(item.placeId);
      if (!details) {
        setError("Could not load place details.");
        return;
      }
      const loc: LocationObject = {
        name: details.name || item.text,
        address: details.address,
        lat: details.lat,
        lng: details.lng,
        placeId: details.placeId,
      };
      setSelected(loc);
      setRegion((prev) => ({
        ...prev,
        latitude: loc.lat,
        longitude: loc.lng,
      }));
      setSuggestions([]);
      setQuery(details.name || item.text);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    const base =
      selected ??
      ({
        name: route.params?.initialLocation?.name || "Pinned location",
        address: route.params?.initialLocation?.address || "",
        lat: region.latitude,
        lng: region.longitude,
        placeId: route.params?.initialLocation?.placeId || "",
      } as LocationObject);

    const locationResult = {
      name: base.name,
      address: base.address,
      lat: base.lat,
      lng: base.lng,
      placeId: base.placeId || "",
    };

    // Navigate back to existing CreateOuting screen and merge params there
    navigation.navigate("CreateOuting", { locationResult } as any);
  };

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionRow}
      onPress={() => handleSelectSuggestion(item)}
    >
      <View style={styles.suggestionTextWrap}>
        <Text style={styles.suggestionPrimary}>{item.text}</Text>
        {!!item.secondaryText && (
          <Text style={styles.suggestionSecondary}>{item.secondaryText}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.map}>
        <Text style={styles.mapPlaceholder}>Map preview unavailable in Snack</Text>
      </View>

      <View
        style={[
          styles.searchCard,
          { top: insets.top + layout.section },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setSuggestions([]);
              setError(null);
            }}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        )}
        {searching && (
          <ActivityIndicator size="small" color={colors.textSubtle} />
        )}
      </View>

      {(error || query.trim().length >= 2) && (
        <View style={styles.resultsCard}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : suggestions.length === 0 && !searching ? (
            <Text style={styles.emptyText}>No places found</Text>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.placeId}
              renderItem={renderSuggestion}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      )}

      <TouchableOpacity style={styles.locateButton} onPress={recenterToUser}>
        <Ionicons name="locate" size={18} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.bottomCard}>
        <Text style={styles.bottomLabel}>SELECTED LOCATION</Text>
        <Text style={styles.bottomTitle}>
          {selected ? selected.name : "Move pin or search to pick a spot"}
        </Text>
        {selected?.address ? (
          <Text style={styles.bottomSubtitle}>{selected.address}</Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.button,
            !selected && { opacity: 0.5 },
          ]}
          onPress={handleConfirm}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Confirm location</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  map: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  mapPlaceholder: {
    color: colors.textMuted,
    ...typography.body2,
  },
  searchCard: {
    position: "absolute",
    left: layout.gutter,
    right: layout.gutter,
    borderRadius: radius.pill,
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    backgroundColor: colors.surfaceLight,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body2,
  },
  resultsCard: {
    position: "absolute",
    top: layout.major + 40,
    left: layout.gutter,
    right: layout.gutter,
    maxHeight: 220,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  suggestionRow: {
    paddingVertical: layout.compact,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  suggestionTextWrap: {
    gap: 2,
  },
  suggestionPrimary: {
    color: colors.textPrimary,
    ...typography.body2,
  },
  suggestionSecondary: {
    color: colors.textMuted,
    ...typography.micro,
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.micro,
  },
  bottomCard: {
    position: "absolute",
    left: layout.gutter,
    right: layout.gutter,
    bottom: layout.major,
    borderRadius: radius.sheet,
    padding: layout.section,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bottomLabel: {
    color: colors.textMuted,
    ...typography.micro,
    marginBottom: layout.compact / 2,
  },
  bottomTitle: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
    marginBottom: layout.compact,
  },
  bottomSubtitle: {
    color: colors.textMuted,
    ...typography.micro,
    marginBottom: layout.section,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: layout.compact,
    alignItems: "center",
    marginTop: layout.section,
  },
  buttonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  locateButton: {
    position: "absolute",
    right: layout.gutter,
    bottom: layout.major * 2.2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

export default LocationPickerScreen;


