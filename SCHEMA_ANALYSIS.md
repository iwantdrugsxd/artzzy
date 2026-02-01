# Complete Schema Analysis - Onboarding, Profile, and Entity Creation

## Overview
This document provides a complete analysis of all fields saved to Firestore during onboarding, profile creation, and entity (outing) creation flows.

---

## 1. Profile Schema (`users/{uid}`)

### Required Fields (from `completeOnboarding()`)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `user_id` | `string` | Auth UID | User's unique identifier |
| `email` | `string` | Auth email | User's email address |
| `name` | `string` | BasicInfoScreen | User's full name |
| `birthdate` | `string` | BasicInfoScreen | Format: "YYYY-MM-DD" |
| `gender` | `"male" \| "female" \| "prefer_not_to_say"` | BasicInfoScreen | User's gender |
| `city` | `string` | BasicInfoScreen | User's city |
| `country` | `string` | BasicInfoScreen | User's country (default: "India") |
| `bio` | `string` | BioScreen | User's bio text (min 1 char) |
| `profile_photo_url` | `string` | PhotoUploadScreen | Primary photo URL (legacy, also in profilePhotoUrls[0]) |
| `profilePhotoUrls` | `string[]` | PhotoUploadScreen | Array of photo URLs (min 1, max 6) |
| `primaryPhotoUrl` | `string` | PhotoUploadScreen | Primary photo (equals profilePhotoUrls[0]) |
| `interests` | `string[]` | InterestsScreen | Array of interest strings (min 3) |
| `vibe_answers` | `Record<string, string>` | VibeQuestionScreen | Answers to 8 vibe questions |
| `quick_badges` | `string[]` | QuickBadgesScreen | Array of 4-6 badge strings |
| `prompts` | `ProfilePrompt[]` | PromptsScreen | Array of 2-3 prompts with answers |
| `created_at` | `number \| Timestamp` | Server | Creation timestamp |
| `onboarding_complete` | `boolean` | FinishScreen | Always `true` after onboarding |
| `connectionsCount` | `number` | Default | Default: 0, incremented on connections |

### Optional Fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `isHost` | `boolean` | Manual/Admin | Whether user can create outings |
| `height` | `string \| number` | EditProfileScreen | Height in cm or inches (optional) |

### ProfilePrompt Type

```typescript
{
  id: string;        // Prompt ID (e.g., "core_1", "social_3")
  category: string;  // "core" | "social" | "depth" | "fun" | "city"
  question: string;  // The prompt question text
  answer: string;    // User's answer (120-200 chars recommended)
}
```

### Vibe Answers Structure

```typescript
{
  social_energy: "observe" | "known_people" | "warm_up" | "few_new" | "everyone" | "center",
  party_style: "coffee" | "deep_talks" | "movie" | "house_party" | "clubbing" | "chaos",
  spontaneity: "two_days" | "planning" | "flexible" | "down_if_free" | "spontaneous" | "right_now",
  conversation: "growth" | "relationships" | "memes" | "music_movies" | "random" | "philosophy",
  alcohol: "none" | "rarely" | "socially" | "weekends" | "often" | "lit",
  energy_level: "calm" | "soft" | "balanced" | "energetic" | "hyper" | "chaos",
  group_size: "one_two" | "three_four" | "five_seven" | "eight_ten" | "ten_plus" | "any",
  intent: "friends" | "hangouts" | "party_buddies" | "networking" | "dating" | "anything"
}
```

---

## 2. Entity (Outing) Schema (`outings/{outingId}`)

### Required Fields (from `CreateOutingScreen`)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `hostId` | `string` | Auth | Host's user ID |
| `hostName` | `string` | Profile | Host's name |
| `hostPhotoUrl` | `string` | Profile | Host's primary photo URL |
| `city` | `string` | Profile | Host's city |
| `title` | `string` | Step 1 | Outing title (6-60 chars) |
| `typeId` | `OutingTypeId` | Step 1 | Normalized outing type ID |
| `type` | `string` | Step 1 | Legacy type label |
| `vibeTagIds` | `VibeTagId[]` | Step 1 | Array of vibe tag IDs (max 5) |
| `vibeTags` | `string[]` | Step 1 | Legacy vibe tag labels |
| `vibeMode` | `"CHAOS" \| "CALM" \| "HIGH_ENERGY" \| "CHILL"` | Computed | Derived from energy/vibe tags |
| `energy` | `number` | Step 1 | Energy level (0-100) |
| `area` | `string` | Step 2 | Area/neighborhood |
| `location` | `LocationValue?` | Step 2 | Full location object (optional) |
| `dateTime` | `Timestamp` | Step 2 | Event date/time (min 30 mins from now) |
| `durationMins` | `number` | Step 2 | Duration in minutes (90, 120, 180, 240) |
| `maxGuests` | `number` | Step 2 | Max guests (5-15) |
| `approvedCount` | `number` | Default | Default: 0 |
| `pendingCount` | `number` | Default | Default: 0 |
| `status` | `"active" \| "cancelled" \| "ended"` | Default | Default: "active" |
| `visibility` | `"public" \| "invite_only"` | Default | Default: "public" |
| `eventMode` | `"curated" \| "fast"` | Step 1 | Event mode |
| `locationRevealMode` | `"timelock" \| "host_triggered"` | Computed | Default: "timelock" |
| `revealAt` | `Timestamp?` | Computed | When to reveal exact address |
| `coverImageUrl` | `string` | Step 3 | Cover image URL (required) |
| `rules` | `string[]` | Step 2 | Array of rule strings |
| `description` | `string` | Step 3 | Outing description |
| `searchTokens` | `string[]?` | Computed | Search tokens for discovery |
| `chatExpiresAt` | `Timestamp?` | Computed | When chat expires |
| `createdAt` | `Timestamp` | Server | Creation timestamp |
| `updatedAt` | `Timestamp` | Server | Last update timestamp |

### Optional Fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `exactAddress` | `string` | Step 2 | Exact address (optional) |
| `genderMix` | `"mixed" \| "women_only" \| "men_only"` | Step 2 | Gender mix preference |
| `manualReveal` | `boolean` | Host action | Whether host manually revealed location |

### LocationValue Type

```typescript
{
  name: string;      // Location name
  address: string;  // Full address
  lat: number;      // Latitude
  lng: number;      // Longitude
  placeId: string; // Google Place ID
}
```

---

## 3. Subcollections and Indexes

### `outings/{outingId}/members/{uid}`

| Field | Type | Notes |
|-------|------|-------|
| `role` | `"host" \| "member"` | User's role in outing |
| `joinedAt` | `Timestamp` | When user joined |

### `outings/{outingId}/messages/{messageId}`

| Field | Type | Notes |
|-------|------|-------|
| `type` | `"user" \| "system"` | Message type |
| `senderId` | `string` | Sender's user ID |
| `senderName` | `string` | Sender's name |
| `senderPhotoUrl` | `string` | Sender's photo URL |
| `text` | `string` | Message text |
| `createdAt` | `Timestamp` | Message timestamp |

### `outings/{outingId}/chatMeta/meta`

| Field | Type | Notes |
|-------|------|-------|
| `lastMessageAt` | `Timestamp` | Last message timestamp |
| `lastMessageText` | `string` | Last message text |
| `lastSenderName` | `string` | Last sender's name |
| `expiresAt` | `Timestamp?` | Chat expiration (optional) |

### `users/{uid}/hostedOutings/{outingId}`

| Field | Type | Notes |
|-------|------|-------|
| `outingId` | `string` | Outing ID |
| `title` | `string` | Outing title |
| `dateTime` | `Timestamp` | Event date/time |
| `role` | `"host"` | Always "host" |
| `coverImageUrl` | `string` | Cover image URL |
| `status` | `string` | Outing status |

### `users/{uid}/activeOutings/{outingId}`

| Field | Type | Notes |
|-------|------|-------|
| `outingId` | `string` | Outing ID |
| `title` | `string` | Outing title |
| `dateTime` | `Timestamp` | Event date/time |
| `role` | `"host" \| "member"` | User's role |
| `coverImageUrl` | `string` | Cover image URL |
| `status` | `string` | Outing status |

### `outingRequests/{outingId_userId}`

| Field | Type | Notes |
|-------|------|-------|
| `outingId` | `string` | Outing ID |
| `hostId` | `string` | Host's user ID |
| `userId` | `string` | Requester's user ID |
| `userName` | `string` | Requester's name |
| `userPhotoUrl` | `string` | Requester's photo URL |
| `userCity` | `string?` | Requester's city |
| `vibeMatch` | `number` | Vibe match percentage |
| `message` | `string?` | Optional request message |
| `status` | `"pending" \| "approved" \| "declined" \| "cancelled"` | Request status |
| `createdAt` | `Timestamp` | Request timestamp |
| `updatedAt` | `Timestamp` | Last update timestamp |

---

## 4. Data Validation Rules

### Profile Validation

- **Name**: Required, non-empty
- **Birthdate**: Required, valid date format "YYYY-MM-DD"
- **Gender**: Required, one of: "male", "female", "prefer_not_to_say"
- **City**: Required, non-empty
- **Country**: Required, non-empty (default: "India")
- **Bio**: Required, min 1 character
- **Photos**: Required, min 1 photo, max 6 photos
- **Interests**: Required, min 3 interests
- **Quick Badges**: Required, 4-6 badges
- **Prompts**: Required, 2-3 prompts, each answer 120-200 chars (soft warning < 120)
- **Vibe Answers**: Required, all 8 questions answered

### Outing Validation

- **Title**: Required, 6-60 characters
- **TypeId**: Required, valid OutingTypeId
- **DateTime**: Required, at least 30 minutes from now
- **Duration**: Required, one of: 90, 120, 180, 240 minutes
- **Location**: Required (area or full location)
- **MaxGuests**: Required, 5-15
- **CoverImage**: Required, valid URL
- **VibeTagIds**: Optional, max 5 tags
- **Rules**: Optional, array of strings
- **Description**: Optional, string

---

## 5. Seed Script Requirements

### For 50 Fully Completed Users

Each user must have:

1. **Profile Data**:
   - ✅ Name, email, birthdate, gender, city, country
   - ✅ Bio (realistic, varied)
   - ✅ 1-3 profile photos (realistic URLs)
   - ✅ 4-6 quick badges (from badge list)
   - ✅ 2-3 prompts with unique, first-person answers (120-200 chars each)
   - ✅ 3-6 interests (from interest list)
   - ✅ All 8 vibe answers
   - ✅ `onboarding_complete: true`
   - ✅ `created_at` timestamp

2. **Optional Profile Data**:
   - Height (some users)
   - `isHost: true` (25% of users)

3. **Entity Data (for hosts)**:
   - 1-2 active outings per host
   - Outing with all required fields
   - Member subcollection entries
   - HostedOutings index entries

4. **No Placeholder Data**:
   - ❌ No "dummy" or "placeholder" text
   - ❌ No generic answers like "That's a great question!"
   - ❌ All prompts must have unique, realistic answers
   - ❌ All interests must be from the interest list
   - ❌ All badges must be from the badge list

---

## 6. UI Rendering Requirements

### ProfileCard Component

The ProfileCard expects:
- `photos` or `photo` (array or single string)
- `prompts` (array of {id, category, question, answer})
- `interests` (array of strings)
- `quickBadges` (array of strings)
- `bio` (string)
- `name`, `age`, `city`, `country`
- `height` (optional)

**Important**: ProfileCard filters out prompts with empty answers. All seeded prompts must have valid answers.

---

## 7. Data Sources

### Badges
- Source: `src/data/badges.ts`
- 57 total badges across 5 groups
- Seed script should select 4-6 per user

### Prompts
- Source: `src/data/prompts.ts`
- 41 total prompts across 5 categories
- Seed script should select 2-3 per user with unique answers

### Interests
- Source: `src/data/interests.ts`
- 20 total interests across 3 groups
- Seed script should select 3-6 per user

### Vibe Questions
- Source: `src/data/vibeQuestions.ts`
- 8 questions total
- Seed script must answer all 8 for each user

### Outing Types
- Source: `src/data/outingConstants.ts`
- 35 total types
- Seed script should use realistic types for host outings

### Vibe Tags
- Source: `src/data/outingConstants.ts`
- 47 total tags across 5 groups
- Seed script should select 2-5 tags per outing

---

## 8. Implementation Checklist

- [x] Analyze all schema fields
- [ ] Generate 50 fully completed user profiles
- [ ] Generate unique, first-person prompt answers
- [ ] Generate realistic outings for hosts
- [ ] Remove all placeholder/dummy data
- [ ] Verify all required fields are present
- [ ] Test UI rendering with seeded data



