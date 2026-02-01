# PeopleScreen Pass/Vibe Flow Documentation

## UI + Data Flow

### Initial Load (Lines 62-93)
1. **Query Firestore:**
   - Fetches all `connections` where `fromUserId == currentUser.user_id`
   - Fetches all `skips` where `fromUserId == currentUser.user_id`
   - Extracts `toUserId` from both collections into a `blockedIds` Set
   - Fetches all users with `onboarding_complete == true`

2. **Filter Feed:**
   - Removes current user
   - Removes any user whose `user_id` is in `blockedIds` (already connected or passed)
   - Sets filtered list to `feed` state

3. **Sort & Score:**
   - Calculates vibe scores for each user
   - Sorts by: same city first, then by vibe score descending
   - Applies selected filter (if any) to show only matching tags

### User Taps "Pass" or "Vibe" (Lines 181-251)

#### Immediate UI Feedback (Optimistic Update)
1. **Haptics:**
   - Pass: `haptics.light()` - light vibration
   - Vibe: `haptics.medium()` - medium vibration

2. **Banner Display:**
   - Shows "Passed [Name]" or "Vibed [Name]" at top of screen
   - Auto-dismisses after 1.8 seconds

3. **Queue Update:**
   - Immediately removes current profile from queue (`setQueue(prev => prev.slice(1))`)
   - User sees next profile immediately (optimistic UI)

4. **Undo Snackbar:**
   - Shows snackbar at bottom with "Passed [Name]" or "Vibed [Name]"
   - Includes "Undo" button
   - Visible for 3 seconds (undo window)

#### Firestore Write (After 3-Second Undo Window)
After 3 seconds, if user hasn't undone:

**For "Vibe":**
- Calls `connectionStorage.sendVibe()` which:
  - Creates/updates `connectionRequests/{fromUid}_{toUid}` document
  - Checks for mutual vibes (auto-accept if reverse request exists)
  - Validates blocks, cooldowns, daily limits
  - Creates notification for recipient
  - Increments daily usage counter

**For "Pass":**
- Writes to `skips/{fromUid}_{toUid}` document with:
  - `fromUserId`: current user's ID
  - `toUserId`: passed user's ID
  - `createdAt`: server timestamp
  - `source`: "people_pass"

#### Error Handling
If Firestore write fails:
- Logs error: `people.vibe.failed` or `people.pass.failed`
- Shows error toast message
- **Rollback:** Puts the profile back at the top of the queue
- Clears pending action state

#### Undo Flow (Lines 253-261)
If user taps "Undo" within 3 seconds:
1. Clears the scheduled Firestore write timeout
2. Removes pending action state
3. Puts the profile back at the top of the queue
4. Shows "Vibe undone" or "Pass undone" banner
5. No Firestore write occurs

### Filtering Logic
- **On Load:** Passed users are filtered out by checking if their `user_id` exists in the `blockedIds` Set (populated from `skips` collection)
- **After Pass:** The user is immediately removed from the queue (optimistic), and the Firestore write ensures they won't appear on next page load/refresh

## Code Changes Made

### 1. Fixed Missing Import
**File:** `src/screens/PeopleScreen.tsx` (Line 14)
- **Before:** `import { collection, getDocs, query, where, doc, serverTimestamp } from "firebase/firestore";`
- **After:** `import { collection, getDocs, query, where, doc, serverTimestamp, setDoc } from "firebase/firestore";`
- **Reason:** `setDoc` was being used on line 219 but wasn't imported, causing runtime errors

### 2. Fixed Field Name Inconsistency
**File:** `src/screens/PeopleScreen.tsx` (Lines 219-224)
- **Before:**
  ```typescript
  await setDoc(doc(db, "skips", `${profile.user_id}_${acted.user_id}`), {
    from: profile.user_id,
    to: acted.user_id,
    createdAt: serverTimestamp(),
    source: "people_pass",
  });
  ```
- **After:**
  ```typescript
  await setDoc(doc(db, "skips", `${profile.user_id}_${acted.user_id}`), {
    fromUserId: profile.user_id,
    toUserId: acted.user_id,
    createdAt: serverTimestamp(),
    source: "people_pass",
  });
  ```
- **Reason:** The read query (line 70) uses `where("fromUserId", "==", profile.user_id)` and extracts `toUserId` (line 74). The write was using `from`/`to`, causing a mismatch. Passed users weren't being filtered out because the read couldn't find the documents written with different field names.

## Edge Cases Considered

### 1. Undo Window (3 seconds)
- User has 3 seconds to undo after tapping Pass/Vibe
- If undone, no Firestore write occurs
- Prevents accidental passes/vibes

### 2. Offline Behavior
- Optimistic UI still works (queue updates immediately)
- Firestore write will fail if offline
- Error handler shows toast and rolls back the queue
- When back online, user can try again

### 3. Concurrent Actions
- `isActingRef` and `isActing` state prevent multiple simultaneous actions
- `pendingAction` state prevents new actions while undo window is active
- Buttons are disabled during action processing

### 4. Error Recovery
- If Firestore write fails, profile is restored to queue
- User sees error toast with context-specific message
- User can retry the action

### 5. Daily Limits (Vibe only)
- `connectionStorage.sendVibe()` checks daily limits
- If limit reached, shows Alert dialog
- Pass action has no limits

### 6. Feed Refresh
- Passed users are filtered on initial load
- After passing, user is removed optimistically from queue
- On next screen refresh/reload, passed users won't appear (due to Firestore query filtering)
- No real-time listener, so changes from other devices require refresh

### 7. Race Conditions
- Uses `isActingRef.current` to prevent rapid button taps
- `pendingAction` state ensures only one undo window at a time
- Queue updates are atomic (slice operation)

### 8. Missing Profile Data
- Checks for `profile` existence before allowing actions
- Handles missing `name`, `user_id`, etc. gracefully
- Uses optional chaining and fallbacks

## Verification

After these fixes:
1. ✅ `setDoc` is properly imported - no runtime errors
2. ✅ Field names are consistent (`fromUserId`/`toUserId` in both reads and writes)
3. ✅ Passed users are properly filtered out on load (query matches write fields)
4. ✅ Passed users don't reappear after passing (optimistic UI + Firestore persistence)







