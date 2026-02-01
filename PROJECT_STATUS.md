# Partizo v1 - Implementation Status

Last updated: 2026-01-27

Single source of truth for everything implemented so far in `/Users/vishnu/Arttzy`.

## 1) Project Setup
- Expo SDK 54 app (TypeScript template).
- Core deps:
  - Navigation: `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`
  - Gesture/UI: `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `react-native-reanimated`
  - Expo: `expo-image-picker`, `expo-location`, `expo-haptics`, `expo-web-browser`
  - Storage: `@react-native-async-storage/async-storage`
  - Date picker: `@react-native-community/datetimepicker`
  - Firebase SDK: `firebase`
- Babel config includes `react-native-reanimated/plugin`.
- New architecture disabled in `app.json` to avoid Fabric boolean crash.

## 2) App Configuration
File: `app.json`
- name/slug: `Partizo` / `partizo`
- `userInterfaceStyle: "dark"`
- `newArchEnabled: false`
- Splash background `#0A0C12`

## 3) Global Bootstrap + Logging
File: `src/bootstrap.ts`
- Imports `react-native-gesture-handler`
- `enableScreens(false)` for stability
- Global error handler wired to `logger`
- Unhandled promise rejection logging
- `WebBrowser.maybeCompleteAuthSession()` for Expo auth callback handling

File: `src/utils/logger.ts`
- Structured logger: `debug`, `info`, `warn`, `error`

File: `src/components/ErrorBoundary.tsx`
- Catches render errors and logs via `logger`

## 4) Firebase + Firestore Setup
File: `src/firebaseApp.ts`
- Initializes Firebase app from `.env`
- Auth initialized with React Native persistence
- Firestore instance exported

## 5) Auth + Profile Draft
File: `src/context/AuthContext.tsx`
- Firebase Auth email/password
- Firestore `users` collection
- AsyncStorage onboarding draft
- Functions:
  - `signUpEmail`, `signInEmail`, `signOut`
  - `signInWithGoogleIdToken` (Google auth temporarily paused)
  - `updateDraft`, `completeOnboarding`
- On auth state change:
  - loads Firestore profile if present
  - sets `profile` and `draft`

## 6) Navigation + App Flow
File: `App.tsx`
- JS Stack navigator (no native stack)
- Flow:
  - If not logged in: `AuthChoice`, `EmailSignup`, `EmailLogin`
  - If logged in and onboarding incomplete: onboarding stack
  - If onboarding complete: `HomeTabs` and app screens

File: `src/navigation/HomeTabs.tsx`
- Tabs: Discover (Outings), Host dashboard (gated by `isHost`), Chat, Profile
- People feed accessible from Discover header action

## 7) UI Theme + Components
File: `src/theme.ts`
- Shared colors, spacing, radius, shadow

Reusable components:
- `PrimaryButton`, `SecondaryButton`, `TextField`, `Chip`

## 8) Onboarding Screens (Functional)
- `SplashScreen`
- `AuthChoiceScreen`
- `EmailSignupScreen`
- `EmailLoginScreen`
- `BasicInfoScreen`
- `PhotoUploadScreen`
- `BioScreen`
- `VibeQuestionScreen` (data in `src/data/vibeQuestions.ts`)
- `InterestsScreen` (data in `src/data/interests.ts`)
- `FinishScreen`

Onboarding data:
File: `src/types/profile.ts`
- Fields: `user_id`, `email`, `name`, `birthdate`, `gender`, `city`, `country`,
  `bio`, `profile_photo_url`, `interests`, `vibe_answers`, `created_at`,
  `onboarding_complete`, `isHost`

## 9) Cloudinary Uploads (Live)
- `PhotoUploadScreen`: uploads profile photo using unsigned preset
- `CreateOutingScreen`: uploads outing cover image

## 10) Outings + Host (Firestore)
Collections:
- `outings` (main data, dual-mode: curated/fast)
- `outingRequests` (join requests, with `source: "curated_request" | "fast_join"`)
- `outings/{outingId}/messages` (chat, includes `type: "user" | "system"`)
- `outings/{outingId}/members` (membership)
- `users/{uid}/activeOutings` (chat/index)

Screens:
- `OutingsScreen`
  - Firestore-backed feed + server-side `vibeMode` filters
  - Filters out host's own outings from Discover
  - Loads all `outingRequests` for current user once and maps status by `outingId`
- `OutingDetailsScreen`
  - Luxury-style hero layout for outings
  - Uses policy layer for CTAs based on `eventMode`, membership, and request state
  - Creates join requests (curated) or invokes fast join (fast mode)
  - Shows attendee avatars, vibe match %, rules, and address (gated)
- `HostDashboardScreen`
  - Shows host stats + active outings
  - Pending requests list (curated events only) with `View Profile`, `Approve`, `Decline`
- `CreateOutingScreen`
  - 3-step wizard: Identity & Vibe → Logistics & Rules → Visuals & Finalize
  - Cloudinary upload with preview, retry, and success state
  - Normalized outing types (`OUTING_TYPES`) and vibe tags (`VIBE_TAGS`)
  - Structured rules input (chips) and tag picker modals
  - Dual-mode selector: `eventMode: "curated" | "fast"`
  - Computes `searchTokens`, `chatExpiresAt`, `revealAt`
- `ChatListScreen` and `OutingChatScreen`
  - Outing chat UI with host highlighting and system messages (`"X joined the outing"`)
  - Keyboard-safe layout, avatars, timestamps, and blocked/expired states
- `MyProfileScreen`

Utilities:
- `src/utils/outingStorage.ts`
  - `createRequest` (curated requests + host notifications)
  - `approveRequest` / `declineRequest` (transactions + counts + member docs + notifications)
  - `fastJoin` for fast-mode auto-approval, membership, index updates, and near-full notifications
- `src/utils/eventPolicy.ts`
  - Centralized policy for CTAs, address visibility, chat writability, RSVP requirement, etc.
- Types: `src/types/outing.ts`, `src/types/chat.ts`

Chat gating:
- `OutingChatScreen` checks `outings/{outingId}/members/{uid}` before subscribing.

Outing schema now uses production fields:
- `hostId`, `hostName`, `hostPhotoUrl`
- `title`, normalized `typeId` (+ legacy `type`), `vibeMode`, normalized `vibeTagIds` (+ legacy `vibeTags`), `energy`
- `city`, `area`, `exactAddress?`, `dateTime`, `durationMins`
- `maxGuests`, `approvedCount`, `pendingCount`, `status`
- `visibility?`, `genderMix?`
- `eventMode: "curated" | "fast"`, `locationRevealMode?`, `revealAt?`
- `coverImageUrl`, `rules`, `description`
- `searchTokens?`, `chatExpiresAt?`, `createdAt?`, `updatedAt?`

## 11) People Feed (Firestore)
File: `src/screens/PeopleScreen.tsx`
- Reads `users` (onboarding_complete)
- Skips self and prior `connections`/`skips`
- Vibe/Skip writes to Firestore
- Uses `src/utils/vibeScore.ts` and `src/utils/vibeTags.ts`
- Tapping a profile card opens full `UserProfile` screen

## 12) Profiles (Multi-photo, Edit, View)
- Types: `src/types/profile.ts`
  - `profilePhotoUrls?: string[]`, `primaryPhotoUrl?: string`, `connectionsCount?: number`
- Auth:
  - `AuthContext` normalises legacy `profile_photo_url` into new fields on load
  - `completeOnboarding` writes both single + multi-photo fields
- Onboarding:
  - `PhotoUploadScreen` seeds `profilePhotoUrls[0]` + `primaryPhotoUrl`
- Components:
  - `PhotoCarousel`: horizontal, paged image viewer with dots + counter
- Screens:
  - `MyProfileScreen`:
    - Uses `PhotoCarousel` for gallery
    - Shows stats row: connections (from `connectionsCount`), events (placeholder)
    - Buttons: `Edit Profile`, `Open Host Dashboard`, `Sign out`
  - `EditProfileScreen`:
    - Edits `bio`, `city`, `interests` with validation (min 3 interests)
    - Writes back to `users/{uid}` and updates local `profile`
  - `ManagePhotosScreen`:
    - Displays existing photos with PRIMARY badge on first
    - Add photo (ImagePicker + Cloudinary) up to 6 photos
    - Reorder via simple up/down controls; enforce minimum 1 photo
    - Saves ordered array to `profilePhotoUrls`, `primaryPhotoUrl`, and legacy `profile_photo_url`
  - `UserProfileScreen`:
    - Public read-only profile: photos, name/age, city, connections count
    - Bio, interests chips, and top 3 vibe highlights
    - Used when opening cards from People feed

## 13) Environment Variables
Required in `.env`:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

Optional (Google auth):
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## 14) Google Auth (Paused)
Status:
- OAuth proxy routing is unstable in Expo Go.
- Logs show `response_type=code` and valid redirect URI.
- Current focus: continue with email auth for onboarding.
Files touched:
- `src/screens/AuthChoiceScreen.tsx` contains Google auth flow + logs.
- `src/bootstrap.ts` includes `WebBrowser.maybeCompleteAuthSession()`.

## 15) How To Run
1. `npm install`
2. `npx expo start -c`
3. Scan QR with Expo Go

## 16) Known Limitations / Remaining for MVP
- Google sign-in not finalized in Expo Go (email-based auth only).
- No push notifications (APNs/FCM) – notifications are in-app only (Firestore-backed).
- No in-app reporting/blocking for users or outings.
- No host moderation tools beyond approve/decline (e.g., remove/mute member from chat).
- No RSVP states (`going` / `maybe` / `no`) stored on members.
- No explicit location \"reveal now\" toggle UI for hosts (uses default timelock only).
- No analytics/metrics dashboards (joins per event, retention, etc.).
- No deep links / shareable outing links wired into OS-level share sheets.
- No rate limiting / abuse protection on joins or messages.

## 17) Firestore Indexes Needed
- `outings`: `status == "active"` + `dateTime >= now` + `orderBy(dateTime)`
- `outings`: `city == <city>` + `status == "active"` + `dateTime >= now` + `orderBy(dateTime)`
- `outingRequests`: `hostId == <uid>` + `status == "pending"`
- (Optional, later) multi-field indexes for advanced discovery & ranking

## 18) Firestore Security Rules
- `firestore.rules` created and aligned with current data model:
  - Helpers: `isSignedIn`, `isOwner`, `isMember`, `isHost`, `isChatExpired`
  - `users/{uid}`: owner-only writes, notifications subcollection read/update only by owner
  - `outings/{outingId}`: readable when `status == "active"`, updates only by host
  - `outings/{outingId}/members`: readable by members; writes allowed for host or fast-mode self-join (not full)
  - `outings/{outingId}/messages`: read/write only by members, write blocked after `chatExpiresAt`, system vs user messages enforced
  - `outingRequests/{requestId}`: read by requester or host; create supports both curated (`pending`) and fast (`approved`) flows

## 19) Next Logical Steps (When Ready)
- Finalize Google Auth or move to a custom dev client.
- Add real push notifications (APNs/FCM) wired to the existing Firestore notifications model.
- Add RSVP and basic host moderation (remove/mute member) on top of existing policy layer.
- Add reporting/blocking flows and corresponding Firestore rules.
