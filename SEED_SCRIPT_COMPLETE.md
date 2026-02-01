# Seed Script - Complete Implementation Summary

## Overview
The seed script has been completely rewritten to generate **50 fully completed users** with realistic, unique data and no placeholder content. All users have complete profiles with photos, prompts, badges, interests, and vibe answers. Host users also have associated outings.

## What Was Implemented

### 1. Comprehensive Prompt Answers
- **All 41 prompts** now have realistic, first-person answers (120-200 chars)
- Answers are unique per user (using index-based selection)
- No placeholder text like "That's a great question!" or "Ask me in person"
- Answers feel authentic and personal, written in first-person voice

### 2. Complete User Profiles (50 users)
Each user has:
- ✅ **Name, email, birthdate, gender, city, country**
- ✅ **Bio** (realistic, varied)
- ✅ **1-3 profile photos** (using Unsplash URLs, varied per user)
- ✅ **4-6 quick badges** (from badge list)
- ✅ **2-3 prompts** with unique, realistic answers
- ✅ **3-6 interests** (from interest list)
- ✅ **All 8 vibe answers** (complete vibe profile)
- ✅ **Height** (33% of users, in cm format)
- ✅ **onboarding_complete: true**
- ✅ **isHost: true** (25% of users = 12-13 hosts)

### 3. Outing Generation for Hosts
- Each host creates **1-2 active outings**
- Outings include all required fields:
  - Title, typeId, vibeMode, energy
  - Location (area, full location object)
  - DateTime (1-30 days in future)
  - Duration, maxGuests, rules, description
  - Cover image, vibe tags
  - Event mode (curated/fast)
  - Location reveal settings
  - Chat expiration
- **Subcollections created**:
  - `outings/{outingId}/members/{hostId}` (host member entry)
  - `users/{hostId}/hostedOutings/{outingId}` (hosted outings index)

### 4. Data Cleanup
- Deletes all existing data before seeding:
  - `users`, `outings`, `outingRequests`
  - `connections`, `connectionRequests`, `skips`, `directChats`
  - All subcollections (notifications, members, messages, etc.)

## Key Features

### No Placeholder Data
- ❌ Removed all generic answers like "That's a great question!"
- ❌ Removed "Ask me in person" type responses
- ✅ All prompts have unique, realistic first-person answers
- ✅ All data comes from defined lists (badges, interests, prompts)

### Realistic First-Person Answers
All prompt answers are written in first-person voice and feel authentic:
- "I bring positive energy and make sure everyone feels included..."
- "Usually ends with deep conversations at 3am..."
- "They'd say I'm the life of the party..."
- "I recharge by spending time alone..."

### Photo Variety
- Expanded photo pool for 50 users
- Each user gets 1-3 unique photos
- Photos selected using index-based rotation to ensure variety

### Outing Variety
- 10 different outing types
- Various vibe modes (CHAOS, CALM, HIGH_ENERGY, CHILL)
- Different locations, durations, and guest limits
- Realistic titles and descriptions

## Running the Script

### Dry Run (Preview)
```bash
npm run seed:users:dry-run
```

### Execute
```bash
npm run seed:users
```

### Force (if safety check fails)
```bash
ts-node scripts/seedUsers.ts --force
```

## Expected Output

After running, you should see:
- ✅ 50 users created
- ✅ 12-13 hosts identified
- ✅ 12-25 outings created (1-2 per host)
- ✅ All users with complete profiles
- ✅ All prompts with realistic answers
- ✅ All outings with complete data

## Verification Checklist

After seeding, verify by:

1. **Login as a seeded user** (e.g., `seed0@partizo.dev`)
2. **Check People screen**:
   - [ ] All profile cards show unique prompts and answers
   - [ ] All cards show photos (1-3 per user)
   - [ ] All cards show badges (4-6 per user)
   - [ ] All cards show interests (3-6 per user)
   - [ ] No placeholder text visible
   - [ ] All prompts have realistic, first-person answers

3. **Check Discover screen**:
   - [ ] Outings are visible
   - [ ] Outings have cover images
   - [ ] Outings have complete information
   - [ ] Outings are in the future (1-30 days)

4. **Check Profile data**:
   - [ ] All users have `onboarding_complete: true`
   - [ ] All users have all 8 vibe answers
   - [ ] All users have 2-3 prompts with answers
   - [ ] All users have 4-6 badges
   - [ ] All users have 3-6 interests

## Data Quality

### Profile Completeness
- **100%** of users have complete profiles
- **100%** of prompts have realistic answers (no placeholders)
- **100%** of badges are from the defined badge list
- **100%** of interests are from the defined interest list

### Uniqueness
- Each user has unique prompt combinations
- Each user has unique photo combinations
- Each user has unique badge combinations
- Each user has unique interest combinations

### Realism
- All answers are in first-person voice
- All answers are 120-200 characters (realistic length)
- All answers feel authentic and personal
- All outings have realistic titles and descriptions

## Files Modified

1. **`scripts/seedUsers.ts`** - Complete rewrite
   - Added comprehensive prompt answers (all 41 prompts)
   - Updated to generate 50 users
   - Added outing generation for hosts
   - Removed all placeholder data
   - Added height field for some users
   - Expanded photo pool

2. **`SCHEMA_ANALYSIS.md`** - New file
   - Complete schema documentation
   - Field requirements and validation rules
   - Data sources and structure

## Next Steps

1. Run the seed script: `npm run seed:users`
2. Verify data in Firestore console
3. Test UI rendering:
   - Login and check People screen
   - Check Discover screen for outings
   - Verify profile cards show all data correctly
4. Confirm no placeholder text appears anywhere

## Notes

- The script uses deterministic selection (based on index) to ensure variety
- All data is realistic and follows the app's data structure
- No dummy or placeholder content remains
- All users are fully onboarded and ready to use



