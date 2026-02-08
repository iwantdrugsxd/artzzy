import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, RouteProp, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types/navigation";
import { LocationValue } from "../components/LocationField";
import { placesAutocomplete, placeDetails, PlaceSuggestion } from "../utils/places";
import { colors, layout, radius, typography, tokens } from "../theme";
import Screen from "../components/Screen";
import PrimaryButton from "../components/PrimaryButton";
import { logger } from "../utils/logger";

type Route = RouteProp<RootStackParamList, "LocationPicker">;
type Nav = StackNavigationProp<RootStackParamList, "LocationPicker">;

const LocationPickerScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const initialLocation = route.params?.initialLocation;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Location state
  const [selectedLocation, setSelectedLocation] = useState<LocationValue | null>(
    initialLocation
      ? {
          name: initialLocation.name || "",
          address: initialLocation.address || "",
          lat: initialLocation.lat || 0,
          lng: initialLocation.lng || 0,
          placeId: initialLocation.placeId || "",
        }
      : null
  );
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationBias, setLocationBias] = useState<{ lat: number; lng: number } | undefined>();

  // Bottom sheet details
  const [addressLine2, setAddressLine2] = useState(initialLocation?.addressLine2 || "");
  const [landmark, setLandmark] = useState(initialLocation?.landmark || "");
  const [instructions, setInstructions] = useState(initialLocation?.instructions || "");

  // Initialize map with current location or initial location
  useEffect(() => {
    const initializeLocation = async () => {
      // If initial location provided, center map on it first
      if (initialLocation?.lat && initialLocation?.lng) {
        const region: Region = {
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        return; // Don't try to get current location if initial is provided
      }

      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const position = await Location.getCurrentPositionAsync({});
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(coords);
          setLocationBias(coords);

          // Center map on current location
          const region: Region = {
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setMapRegion(region);
        } else {
          // Fallback: default to Mumbai if permission denied
          const defaultRegion: Region = {
            latitude: 19.0760,
            longitude: 72.8777,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          };
          setMapRegion(defaultRegion);
        }
      } catch (error) {
        logger.error("location.picker.init.failed", { error });
        // Fallback: default to Mumbai on error
        const defaultRegion: Region = {
          latitude: 19.0760,
          longitude: 72.8777,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setMapRegion(defaultRegion);
      }
    };

    initializeLocation();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await placesAutocomplete(searchQuery.trim(), locationBias);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        logger.error("location.picker.autocomplete.failed", { error });
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, locationBias]);

  const handleSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    setSearching(true);
    setShowSuggestions(false);
    setSearchQuery(suggestion.text);

    try {
      const details = await placeDetails(suggestion.placeId);
      if (details) {
        const location: LocationValue = {
          name: details.name,
          address: details.address,
          lat: details.lat,
          lng: details.lng,
          placeId: details.placeId,
        };
        setSelectedLocation(location);

        // Center map on selected location
        const region: Region = {
          latitude: details.lat,
          longitude: details.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        mapRef.current?.animateToRegion(region, 500);
      }
    } catch (error) {
      logger.error("location.picker.details.failed", { error });
      Alert.alert("Error", "Failed to load location details. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleMapRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
    // Update selected location coordinates if user drags map
    if (selectedLocation) {
      setSelectedLocation({
        ...selectedLocation,
        lat: region.latitude,
        lng: region.longitude,
      });
    }
  }, [selectedLocation]);

  const handleUseCurrentLocation = async () => {
    if (currentLocation) {
      const region: Region = {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 500);

      // Try to reverse geocode to get address
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
        });
        if (place) {
          const address = [
            place.street,
            place.city,
            place.region,
            place.country,
          ]
            .filter(Boolean)
            .join(", ");

          setSelectedLocation({
            name: place.name || address || "Current Location",
            address: address,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            placeId: "", // No placeId for current location
          });
        }
      } catch (error) {
        logger.error("location.picker.reverse.geocode.failed", { error });
        // Still set location even if reverse geocode fails
        setSelectedLocation({
          name: "Current Location",
          address: `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          placeId: "",
        });
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
      Alert.alert("Location Required", "Please select a location on the map.");
      return;
    }

    const result: LocationValue = {
      ...selectedLocation,
      addressLine2: addressLine2.trim() || undefined,
      landmark: landmark.trim() || undefined,
      instructions: instructions.trim() || undefined,
    };

    // Navigate back to CreateOuting with location result
    // Note: This will update params on the existing CreateOuting screen if it exists in the stack
    logger.info("locationPicker.confirming", { 
      hasLocation: !!selectedLocation,
      locationName: result.name,
      locationAddress: result.address 
    });
    
    // Navigate to existing CreateOuting and merge params to avoid remount/state loss
    navigation.navigate({
      name: "CreateOuting",
      params: { locationResult: result },
      merge: true,
    });
  };

  const canConfirm = selectedLocation && selectedLocation.lat && selectedLocation.lng;

  return (
    <Screen contentContainerStyle={styles.container} scroll={false}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { paddingTop: insets.top + layout.compact }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {searching && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
            )}
          </View>

          {/* Suggestions List */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`${suggestion.placeId}-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color={colors.primary}
                      style={styles.suggestionIcon}
                    />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionMain}>{suggestion.text}</Text>
                      {suggestion.secondaryText ? (
                        <Text style={styles.suggestionSecondary}>{suggestion.secondaryText}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Map View */}
        {mapRegion ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            onRegionChangeComplete={handleMapRegionChange}
            showsUserLocation={true}
            showsMyLocationButton={false}
            mapType="standard"
          >
            {selectedLocation && (
              <Marker
                coordinate={{
                  latitude: selectedLocation.lat,
                  longitude: selectedLocation.lng,
                }}
                title={selectedLocation.name}
                description={selectedLocation.address}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
        )}

        {/* Bottom Sheet */}
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + layout.section }]}>
          <ScrollView
            style={styles.bottomSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {selectedLocation ? (
              <>
                <View style={styles.locationHeader}>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{selectedLocation.name}</Text>
                    <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
                  </View>
                  {currentLocation && (
                    <TouchableOpacity
                      onPress={handleUseCurrentLocation}
                      style={styles.currentLocationButton}
                    >
                      <Ionicons name="locate" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsLabel}>Building / Flat / Floor</Text>
                  <TextInput
                    style={styles.detailsInput}
                    placeholder="e.g., Floor 3, Apt 2B"
                    placeholderTextColor={colors.textMuted}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                  />

                  <Text style={styles.detailsLabel}>Landmark</Text>
                  <TextInput
                    style={styles.detailsInput}
                    placeholder="e.g., Near Starbucks, Behind the mall"
                    placeholderTextColor={colors.textMuted}
                    value={landmark}
                    onChangeText={setLandmark}
                  />

                  <Text style={styles.detailsLabel}>Instructions</Text>
                  <TextInput
                    style={[styles.detailsInput, styles.detailsInputMultiline]}
                    placeholder="e.g., Ring doorbell, Use side entrance"
                    placeholderTextColor={colors.textMuted}
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyStateText}>Search for a location or drag the map</Text>
                {currentLocation && (
                  <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    style={styles.useCurrentButton}
                  >
                    <Ionicons name="locate" size={18} color={colors.onPrimary} />
                    <Text style={styles.useCurrentButtonText}>Use Current Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <PrimaryButton
              label="Confirm Location"
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={styles.confirmButton}
            />
          </ScrollView>
    </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: layout.section,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderRadius: radius.pill,
    paddingHorizontal: layout.section,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: layout.compact,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: layout.compact,
    padding: layout.compact / 2,
  },
  searchLoader: {
    marginLeft: layout.compact,
  },
  suggestionsContainer: {
    marginTop: layout.compact,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    shadowColor: colors.bg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: layout.section,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIcon: {
    marginRight: layout.compact,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  suggestionSecondary: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface1,
  },
  mapPlaceholderText: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: "50%",
    shadowColor: colors.bg,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  bottomSheetContent: {
    padding: layout.section,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: layout.section,
  },
  locationInfo: {
    flex: 1,
    marginRight: layout.compact,
  },
  locationName: {
    color: colors.textPrimary,
    ...typography.h3,
    fontWeight: "700",
    marginBottom: layout.compact / 2,
  },
  locationAddress: {
    color: colors.textMuted,
    ...typography.body2,
  },
  currentLocationButton: {
    padding: layout.compact,
    borderRadius: radius.button,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsSection: {
    marginTop: layout.section,
  },
  detailsLabel: {
    color: colors.textSecondary,
    ...typography.caption,
    marginTop: layout.section,
    marginBottom: layout.compact / 2,
  },
  detailsInput: {
    backgroundColor: colors.surface1,
    borderRadius: radius.button,
    padding: layout.section,
    color: colors.textPrimary,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: layout.major,
  },
  emptyStateText: {
    color: colors.textMuted,
    ...typography.body2,
    marginTop: layout.compact,
    textAlign: "center",
  },
  useCurrentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: layout.section,
    paddingVertical: layout.compact,
    borderRadius: radius.button,
    marginTop: layout.section,
  },
  useCurrentButtonText: {
    color: colors.onPrimary,
    ...typography.body,
    fontWeight: "600",
    marginLeft: layout.compact / 2,
  },
  confirmButton: {
    marginTop: layout.section,
  },
});

export default LocationPickerScreen;
