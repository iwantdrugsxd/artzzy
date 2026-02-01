# Phase 3 - Real Outings + Host + Requests + Chat (Production MVP)

This document is the implementation plan and backend contract for Phase 3 with real Firestore data, no mocks.

## 0) Success Criteria
User can:
- See real outings in Mumbai
- Open an outing and request to join
- See pending / approved / declined state
- If approved, access group chat

Host can:
- Create outing with cover image
- See join requests
- Approve / decline
- Chat with approved members

Backend enforces:
- Only hosts can create outings
- Only host can approve for their outing
- Only approved members can read/write chat
- Exact address hidden until approved (optional)

## 1) Firestore Data Model

### 1.1 `users/{uid}`
```ts
{
  uid: string,
  email: string,
  name: string,
  photoUrl: string,
  city: "Mumbai",
  onboardingComplete: true,
  vibeAnswers: { [questionId: string]: string | number },
  interests: string[],
  isHost: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1.2 `outings/{outingId}`
```ts
{
  hostId: string,
  hostName: string,
  hostPhotoUrl: string,
  title: string,
  type: "House Party" | "Rooftop Mixer" | "Deep Talks" | string,
  vibeMode: "Chaos" | "Calm" | "High Energy" | "Chill",
  vibeTags: string[],
  energy: number,
  area: string,
  exactAddress?: string,
  geo?: GeoPoint,
  dateTime: Timestamp,
  durationMins: number,
  maxGuests: number,
  approvedCount: number,
  pendingCount: number,
  status: "active" | "cancelled" | "ended",
  coverImageUrl: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1.3 `outingRequests/{outingId_userId}`
```ts
{
  outingId: string,
  hostId: string,
  userId: string,
  userName: string,
  userPhotoUrl: string,
  userCollege?: string,
  vibeMatch: number,
  message?: string,
  status: "pending" | "approved" | "declined" | "cancelled",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 1.4 `outings/{outingId}/members/{uid}`
```ts
{
  role: "host" | "member",
  joinedAt: Timestamp
}
```

### 1.5 `outings/{outingId}/messages/{messageId}`
```ts
{
  senderId: string,
  senderName: string,
  senderPhotoUrl: string,
  text: string,
  createdAt: Timestamp
}
```

### 1.6 `outings/{outingId}/chatMeta/meta`
```ts
{
  expiresAt?: Timestamp,
  lastMessageAt: Timestamp,
  lastMessageText: string,
  lastSenderName: string
}
```

## 2) Firestore Security Rules (High Level)
- Auth required for all reads/writes
- `users`: owner can write; reads allowed for profiles needed in app
- `outings`: create only if `users/{uid}.isHost == true`
- `outingRequests`: user can create their own; only host can approve/decline
- `members`: only host can add; members can read
- `messages`: only members can read/write

## 3) Backend Flows

### 3.1 Create Outing (Host)
Steps:
1. Validate fields
2. Upload cover image to Cloudinary
3. Write `outings/{outingId}`
4. Create `outings/{outingId}/members/{hostId}` with role `host`

### 3.2 Outings Feed
Query:
- `status == "active"`
- `dateTime >= now`
- `orderBy(dateTime asc)`
- limit + pagination

### 3.3 Outing Details
Reads:
- `outings/{outingId}`
- `outingRequests/{outingId_userId}` for status

### 3.4 Request to Join
Transaction:
- Create `outingRequests/{outingId_userId}` with status pending
- `outings/{outingId}.pendingCount += 1`

### 3.5 Host Approve
Transaction:
- Update request status to approved
- Add member doc
- `pendingCount -= 1`, `approvedCount += 1`

### 3.6 Host Decline
Transaction:
- Update request status to declined
- `pendingCount -= 1`

### 3.7 Chat
Access:
- Only if `outings/{outingId}/members/{uid}` exists
Reads:
- Subscribe to messages by `createdAt asc`
Writes:
- Add message + update `chatMeta/meta`

## 4) Navigation (Phase 3)
User side:
- Outings feed
- Outing details
- Chat list
- Chat thread
- Profile

Host side:
- Host dashboard
- Create outing

Host tab gated by `users/{uid}.isHost`.

## 5) Implementation Order
1. CreateOuting (host only)
2. Outings feed
3. Outing details + request
4. Host dashboard + approve/decline
5. Chat (members only)

## 6) Testing Plan (Two Accounts)
- Account A (host): set `isHost=true`
- Account B (user)
- Host creates outing
- User requests join
- Host approves
- User opens chat and sends message

## 7) Next Inputs Needed From You
Provide:
1. Example `outings` doc JSON
2. Example `outingRequests` doc JSON
3. Whether `members` subcollection exists
