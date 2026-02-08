# Firestore Security Rules for ID Connection Requests

## Problem
The `idConnectionRequests` collection and `users/{userId}/notifications` subcollection require security rules to allow:
1. Authenticated users to create requests where `fromUid == request.auth.uid`
2. Receivers to read requests where `toUid == request.auth.uid`
3. Receivers to update requests to accepted/rejected
4. Senders to create notifications in receiver's notifications subcollection

## Required Rules

Add these rules to your Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // ID Connection Requests Collection
    match /idConnectionRequests/{requestId} {
      // Allow authenticated user to create a request where fromUid matches auth.uid
      allow create: if request.auth != null 
        && request.resource.data.fromUid == request.auth.uid
        && request.resource.data.toUid != request.auth.uid
        && request.resource.data.status == "pending"
        && request.resource.data.source == "user_id";
      
      // Allow receiver to read requests where toUid matches auth.uid
      allow read: if request.auth != null 
        && (resource.data.toUid == request.auth.uid 
            || resource.data.fromUid == request.auth.uid);
      
      // Allow receiver to update request to accepted/rejected
      allow update: if request.auth != null 
        && resource.data.toUid == request.auth.uid
        && resource.data.status == "pending"
        && (request.resource.data.status == "accepted" 
            || request.resource.data.status == "rejected")
        && request.resource.data.fromUid == resource.data.fromUid
        && request.resource.data.toUid == resource.data.toUid;
    }
    
    // Users Collection - Notifications Subcollection
    match /users/{userId}/notifications/{notificationId} {
      // Allow sender to create id_connection_request notifications in receiver's notifications
      allow create: if request.auth != null 
        && request.resource.data.type == "id_connection_request"
        && request.resource.data.fromUid == request.auth.uid
        && request.resource.data.read == false;
      
      // Allow user to read their own notifications
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow user to update their own notifications (mark as read)
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // ... rest of existing rules ...
  }
}
```

## How to Apply

1. Go to Firebase Console → Firestore Database → Rules
2. Add the rules above to your existing rules file
3. Click "Publish" to deploy the rules
4. Test the flow:
   - User A finds User B by code
   - User A presses Connect
   - Check Firestore console to verify:
     - `idConnectionRequests/{fromUid}_{toUid}` document is created
     - `users/{toUid}/notifications/{notificationId}` document is created
   - User B should see notification in app
   - User B can accept/reject the request

## Testing Checklist

- [ ] User A can create request in `idConnectionRequests`
- [ ] User B can read the request
- [ ] User B can update request to accepted/rejected
- [ ] User A can create notification in `users/{toUid}/notifications`
- [ ] User B can read their notifications
- [ ] User B can update notification (mark as read)
