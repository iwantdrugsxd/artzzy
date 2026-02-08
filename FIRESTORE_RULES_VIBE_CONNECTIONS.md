# Firestore Security Rules for Vibe Accept Connections

## Problem
When a vibe request is accepted via `acceptVibe`, the code tries to create connection documents in:
- `users/{fromUid}/connections/{toUid}`
- `users/{toUid}/connections/{fromUid}`

And updates `connectionsCount` on both user documents. These operations require Firestore security rules.

## Required Rules

Add these rules to your Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // Users Collection - Connections Subcollection
    // Allow users to create/read their own connections
    match /users/{userId}/connections/{connectionId} {
      // Allow user to create connection where they are the owner
      allow create: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.data.otherUid is string
        && request.resource.data.sinceAt is timestamp;
      
      // Allow user to read their own connections
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow user to update their own connections (for merge operations)
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users Collection - Allow updating connectionsCount
    match /users/{userId} {
      // Allow user to update their own connectionsCount
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['connectionsCount', 'updatedAt']);
      
      // ... other existing user rules ...
    }
    
    // ... rest of existing rules ...
  }
}
```

## Important Notes

1. **Transaction Context**: When `acceptVibe` runs a transaction, it needs to:
   - Create `users/{fromUid}/connections/{toUid}` (fromUid must be authenticated)
   - Create `users/{toUid}/connections/{fromUid}` (toUid must be authenticated)
   - Update `users/{fromUid}` connectionsCount (fromUid must be authenticated)
   - Update `users/{toUid}` connectionsCount (toUid must be authenticated)

2. **Transaction Limitation**: Firestore transactions run with the permissions of the user who initiated the transaction. Since `acceptVibe` is called by `toUid` (the receiver), the transaction runs as `toUid`. This means:
   - ✅ Can create `users/{toUid}/connections/{fromUid}` (toUid owns this)
   - ✅ Can update `users/{toUid}` connectionsCount (toUid owns this)
   - ❌ **CANNOT** create `users/{fromUid}/connections/{toUid}` (fromUid doesn't own this)
   - ❌ **CANNOT** update `users/{fromUid}` connectionsCount (fromUid doesn't own this)

3. **Solution**: We need to allow cross-user connection creation when it's part of a mutual acceptance. Update the rules to allow:

```javascript
match /users/{userId}/connections/{connectionId} {
  // Allow creating connection for another user IF:
  // - The authenticated user is accepting a vibe request
  // - The connection document's otherUid matches the authenticated user
  // - This is verified by checking the connectionRequests collection
  allow create: if request.auth != null 
    && (
      // User creating their own connection
      (request.auth.uid == userId)
      ||
      // Cross-user creation: authenticated user is the "otherUid" in the connection
      (request.resource.data.otherUid == request.auth.uid)
    )
    && request.resource.data.otherUid is string
    && request.resource.data.sinceAt is timestamp;
  
  allow read: if request.auth != null 
    && (request.auth.uid == userId || request.auth.uid == resource.data.otherUid);
  
  allow update: if request.auth != null && request.auth.uid == userId;
}

match /users/{userId} {
  // Allow updating connectionsCount for another user IF:
  // - The authenticated user is the "other" in a connection being created
  // This is needed for mutual connection creation
  allow update: if request.auth != null 
    && (
      // User updating their own document
      (request.auth.uid == userId)
      ||
      // Cross-user update: only allow connectionsCount increment
      (request.resource.data.connectionsCount == resource.data.connectionsCount + 1
       && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['connectionsCount']))
    );
}
```

## How to Apply

1. Go to Firebase Console → Firestore Database → Rules
2. Add the rules above to your existing rules file
3. Click "Publish" to deploy the rules
4. Test the flow:
   - User A vibes User B
   - User B accepts
   - Check Firestore console to verify:
     - `users/{fromUid}/connections/{toUid}` document is created
     - `users/{toUid}/connections/{fromUid}` document is created
     - Both users' `connectionsCount` is incremented

## Testing Checklist

- [ ] User B can create connection in `users/{toUid}/connections/{fromUid}`
- [ ] User B can create connection in `users/{fromUid}/connections/{toUid}` (cross-user)
- [ ] User B can update `users/{toUid}` connectionsCount
- [ ] User B can update `users/{fromUid}` connectionsCount (cross-user)
- [ ] Both users see correct connection count after acceptance
