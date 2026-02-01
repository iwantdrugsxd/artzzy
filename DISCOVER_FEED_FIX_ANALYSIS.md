# Discover Feed Visibility Fix - Root Cause Analysis

## Problem Statement
New accounts were seeing no outing party requests on the Discover screen. The goal was to ensure every logged-in user sees outing requests by default, unless explicitly marked as private.

## Root Cause Analysis

### 1. **Restrictive City Filtering (PRIMARY ISSUE)**
**Location**: `src/screens/OutingsScreen.tsx`, lines 78-85

**Problem**:
- The query filtered outings by `city` if the user's profile had a city set
- This was too restrictive: new users without a city, or users in cities with no outings, would see nothing
- The filter was applied at the Firestore query level, preventing global/nearby discovery

**Code Before**:
```typescript
const q = profile?.city
  ? query(
      collection(db, "outings"),
      where("city", "==", profile.city),
      ...appliedFilters,
      orderBy("dateTime", "asc")
    )
  : query(collection(db, "outings"), ...appliedFilters, orderBy("dateTime", "asc"));
```

**Impact**:
- Users with a city set: Only saw outings in their exact city
- Users without a city: Saw all outings (inconsistent behavior)
- New users: Often had no city set during onboarding, but if set, would only see local outings

### 2. **Missing Visibility Filter**
**Location**: `src/screens/OutingsScreen.tsx`, line 95

**Problem**:
- The code filtered out user's own outings but didn't check for `visibility === "invite_only"`
- Private/invite-only outings were being shown to all users

**Code Before**:
```typescript
.filter((outing) => outing.hostId !== user?.id);
```

**Impact**:
- Invite-only outings were visible to everyone
- Privacy settings were not respected

### 3. **Profile Refresh Not Triggered After Updates**
**Location**: Multiple files

**Problem**:
- `AuthContext` only loaded profile once on auth state change
- After `completeOnboarding()`, profile was set locally but not refetched from Firestore
- `MyProfileScreen` didn't refresh when navigated to
- `EditProfileScreen` and `ManagePhotosScreen` updated Firestore but didn't refresh context

**Impact**:
- Profile data could be stale after onboarding or edits
- Users had to restart app to see updated profile data
- Prompts, badges, photos, bio changes weren't reflected immediately

## Solutions Implemented

### 1. **Removed Restrictive City Filter**
**File**: `src/screens/OutingsScreen.tsx`

**Changes**:
- Removed city-based Firestore query filter
- Show all active outings by default
- Sort results to prioritize user's city (if set) but show all outings
- Filter out invite-only outings at the application level

**Code After**:
```typescript
// Show all public outings by default - only filter out invite_only if visibility field exists
// Don't filter by city - show global discover feed
const q = query(
  collection(db, "outings"),
  ...appliedFilters,
  orderBy("dateTime", "asc")
);

const data = snap.docs
  .map((docItem) => {
    const outingData = docItem.data() as Outing;
    return {
      ...outingData,
      id: docItem.id,
    };
  })
  .filter((outing) => {
    // Filter out user's own outings
    if (outing.hostId === user.id) return false;
    // Only show public outings (or outings without visibility field for backward compatibility)
    if (outing.visibility === "invite_only") return false;
    return true;
  })
  // Sort: user's city first, then others
  .sort((a, b) => {
    if (profile?.city) {
      const aInCity = a.city === profile.city;
      const bInCity = b.city === profile.city;
      if (aInCity && !bInCity) return -1;
      if (!aInCity && bInCity) return 1;
    }
    return 0;
  });
```

**Benefits**:
- All users see outings by default
- City-based sorting provides relevance without hiding content
- Global discover feed works for all users

### 2. **Added Visibility Filter**
**File**: `src/screens/OutingsScreen.tsx`

**Changes**:
- Added explicit check for `visibility === "invite_only"`
- Only public outings (or outings without visibility field) are shown

**Benefits**:
- Privacy settings are respected
- Invite-only outings are properly hidden from discover feed

### 3. **Profile Refresh Mechanism**
**Files**: 
- `src/context/AuthContext.tsx`
- `src/screens/MyProfileScreen.tsx`
- `src/screens/EditProfileScreen.tsx`
- `src/screens/ManagePhotosScreen.tsx`

**Changes**:
- Added `refreshProfile()` method to `AuthContext`
- `completeOnboarding()` now calls `refreshProfile()` after saving
- `MyProfileScreen` refreshes profile when screen is focused
- `EditProfileScreen` and `ManagePhotosScreen` call `refreshProfile()` after updates

**Code**:
```typescript
// AuthContext.tsx
const refreshProfile = async () => {
  if (!user) return;
  try {
    const ref = doc(db, "users", user.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Profile;
      // Normalize and set profile...
    }
  } catch (error) {
    logger.error("auth.profile.refresh.failed", { error });
  }
};

// MyProfileScreen.tsx
React.useEffect(() => {
  const unsubscribe = navigation.addListener("focus", () => {
    if (user) {
      refreshProfile();
    }
  });
  return unsubscribe;
}, [navigation, user, refreshProfile]);
```

**Benefits**:
- Profile data is always up-to-date
- Changes reflect immediately without app restart
- Consistent data across all screens

## UI Improvements

### OutingCard Premium Redesign
**File**: `src/components/OutingCard.tsx`

**Changes**:
- Full-bleed hero image (280px height, increased from 230px)
- Added subtle haze overlay and gradient scrim for depth
- Premium glass badges with glow effects
- Larger, more readable typography (title: 24px, location: 15px)
- Improved spacing and visual hierarchy
- Match percentage badge with glow effect
- Enhanced shadows and rounded corners (cardPremium: 24px)

**Typography Map**:
- **Title**: 24px, line-height 30px, weight 700, letter-spacing -0.3
- **Location**: 15px, line-height 20px, weight 500
- **Meta Text**: 14px, line-height 20px, weight 500
- **CTA Label**: 16px, line-height 22px, weight 700, letter-spacing 0.3

**Design Tokens Used**:
- `tokens.radius.cardPremium` (24px)
- `tokens.shadows.card.hero`
- `tokens.shadows.glass`
- `tokens.shadows.glow.medium`
- `tokens.colors.overlay.glass`
- `tokens.colors.overlay.glassMedium`

## Testing Checklist

### Discover Feed Visibility
- [x] New user without city sees all outings
- [x] User with city sees all outings (city sorted first)
- [x] Invite-only outings are hidden from discover
- [x] User's own outings are filtered out
- [x] Only active, future outings are shown
- [x] Vibe mode filters work correctly

### Profile Refresh
- [x] Profile refreshes after onboarding completion
- [x] Profile refreshes when navigating to MyProfileScreen
- [x] Profile refreshes after editing bio/city/interests
- [x] Profile refreshes after managing photos
- [x] Prompts, badges, photos reflect immediately

### UI/UX
- [x] OutingCard displays premium design
- [x] Typography is large and readable
- [x] Images are full-bleed with rounded corners
- [x] Badges have glass effects and glow
- [x] Spacing follows 8pt grid system

## Implementation Summary

### Files Modified
1. `src/screens/OutingsScreen.tsx` - Removed city filter, added visibility filter
2. `src/context/AuthContext.tsx` - Added `refreshProfile()` method
3. `src/screens/MyProfileScreen.tsx` - Added focus listener for profile refresh
4. `src/screens/EditProfileScreen.tsx` - Call `refreshProfile()` after save
5. `src/screens/ManagePhotosScreen.tsx` - Call `refreshProfile()` after save
6. `src/components/OutingCard.tsx` - Premium UI redesign

### Breaking Changes
None - all changes are backward compatible.

### Migration Notes
- Existing outings without `visibility` field are treated as public (backward compatible)
- City-based sorting is optional and doesn't hide content
- Profile refresh is automatic and transparent to users

## Future Enhancements

1. **Location-Based Discovery**: Add optional "Nearby" filter that uses geolocation
2. **Smart Sorting**: Prioritize outings by vibe match, distance, and time
3. **Profile Caching**: Cache profile data with TTL to reduce Firestore reads
4. **Real-time Updates**: Use Firestore listeners for profile updates instead of manual refresh



