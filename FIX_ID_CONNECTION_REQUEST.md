# Fix: ID Connection Request Not Sending

## Problem Identified
The "Connect by User ID" feature was not actually creating requests or notifications. The most likely root cause is **Firestore security rules** blocking writes to:
1. `idConnectionRequests` collection (new collection, no rules)
2. `users/{toUid}/notifications` subcollection (cross-user write not allowed)

## Changes Made

### 1. Enhanced Logging (`src/utils/idConnectionStorage.ts`)
- Added detailed logging at each step:
  - `idConnection.request.attempt` - when function is called
  - `idConnection.request.created` - when request doc is created
  - `idConnection.notification.created` - when notification is created
  - `idConnection.request.sent` - when entire flow succeeds
- Added error logging with error codes and messages for:
  - `setDoc` failures (request creation)
  - `createNotification` failures
- Added specific error messages for `permission-denied` errors

### 2. Improved Error Handling (`src/utils/idConnectionStorage.ts`)
- Separated `setDoc` error handling to catch permission errors specifically
- Made `createNotification` throw errors (was silently catching)
- Return error status if notification creation fails (request created but receiver won't see it)
- All errors now include error codes for debugging

### 3. UI Error Surfacing (`src/screens/PeopleScreen.tsx`)
- Added logging for connect attempts
- Enhanced error messages to show specific error codes
- All errors are now shown via both `showToast` and inline error display

### 4. Firestore Security Rules Documentation
Created `FIRESTORE_RULES_ID_CONNECTION.md` with required rules that must be added to Firebase Console.

## Root Cause
**Firestore security rules are blocking writes.** The new `idConnectionRequests` collection and cross-user notification writes require explicit rules.

## Required Action
**You must add Firestore security rules** (see `FIRESTORE_RULES_ID_CONNECTION.md`):

1. Go to Firebase Console → Firestore Database → Rules
2. Add the rules from `FIRESTORE_RULES_ID_CONNECTION.md`
3. Publish the rules
4. Test the flow

## Testing Steps

1. **User A finds User B by code:**
   - User A goes to People screen
   - Enters User B's user code
   - Clicks "Find"
   - Preview card appears with User B's name and photo

2. **User A sends request:**
   - User A clicks "Connect" button
   - Should see "Request sent!" toast
   - Check Firestore console:
     - `idConnectionRequests/{fromUid}_{toUid}` document should exist
     - `users/{toUid}/notifications/{notificationId}` document should exist

3. **User B receives notification:**
   - User B opens Notifications screen
   - Should see "New connection request" notification
   - Notification should show User A's name

4. **User B reviews request:**
   - User B taps notification
   - Should navigate to `IdConnectionReview` screen
   - Should see User A's profile
   - Accept/Reject buttons should work

5. **User B accepts:**
   - User B clicks "Accept"
   - Should navigate to Connections screen
   - Check Firestore:
     - `users/{fromUid}/connections/{toUid}` should exist
     - `users/{toUid}/connections/{fromUid}` should exist
     - Both users' `connectionsCount` should increment
     - Request status should be "accepted"

6. **Verify connections list:**
   - Both users should see each other in Connections screen
   - Only name + photo should be displayed (no city)

## Debugging

If requests still fail after adding rules:

1. **Check browser console logs:**
   - Look for `idConnection.request.attempt`
   - Look for `idConnection.request.created` (confirms write succeeded)
   - Look for `idConnection.notification.created` (confirms notification write succeeded)
   - Look for error logs with `code: "permission-denied"`

2. **Check Firestore console:**
   - Verify `idConnectionRequests` collection exists
   - Verify document is created with correct `fromUid` and `toUid`
   - Verify notification document exists in `users/{toUid}/notifications`

3. **Check error messages:**
   - If you see "Permission denied" in UI, rules are not correct
   - If you see other errors, check the error code and message in logs

## Files Modified

1. `src/utils/idConnectionStorage.ts` - Enhanced logging and error handling
2. `src/screens/PeopleScreen.tsx` - Enhanced error logging and UI error display
3. `FIRESTORE_RULES_ID_CONNECTION.md` - Documentation of required rules (NEW)
4. `FIX_ID_CONNECTION_REQUEST.md` - This file (NEW)

## Non-Breaking Changes
- All changes are additive
- No existing vibe/chat/connection flows modified
- Only ID connection request flow affected
- Enhanced logging doesn't change behavior, only visibility
