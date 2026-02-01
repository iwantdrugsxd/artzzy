// Prefer the new key name, fall back to older one if present
const API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = (placeId: string) =>
  `https://places.googleapis.com/v1/places/${placeId}`;

export type PlaceSuggestion = {
  placeId: string;
  text: string;
  secondaryText?: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export async function placesAutocomplete(
  input: string,
  locationBias?: { lat: number; lng: number }
): Promise<PlaceSuggestion[]> {
  if (!API_KEY || !input.trim()) return [];

  const body: any = {
    input,
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lng,
        },
        radius: 5000,
      },
    };
  }

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn("places.autocomplete.failed", res.status, errorText);
    return [];
  }

  const json = await res.json();
  if (json.error) {
    console.warn("places.autocomplete.error", json.error);
    return [];
  }
  const suggestions = json.suggestions ?? [];

  return suggestions.map((s: any) => ({
    placeId: s.placePrediction?.placeId || "",
    text:
      s.placePrediction?.text?.text ||
      s.placePrediction?.structuredFormat?.mainText?.text ||
      "",
    secondaryText:
      s.placePrediction?.structuredFormat?.secondaryText?.text || "",
  }));
}

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!API_KEY) return null;

  const res = await fetch(DETAILS_URL(placeId), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn("places.details.failed", res.status, errorText);
    return null;
  }

  const json = await res.json();
  if (json.error) {
    console.warn("places.details.error", json.error);
    return null;
  }
  const loc = json.location;
  if (!loc) return null;

  return {
    placeId: json.id,
    name: json.displayName?.text || "",
    address: json.formattedAddress || "",
    lat: loc.latitude,
    lng: loc.longitude,
  };
}
