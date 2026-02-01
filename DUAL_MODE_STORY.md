# Partizo Dual-Mode Event System: A Day in Mumbai

*A narrative journey through the eyes of 12 users experiencing curated and fast events*

---

## The Cast

**Hosts:**
- **Riya** (22, Bandra) - Creates a curated rooftop mixer
- **Arjun** (24, Andheri) - Creates a fast-join gaming night
- **Priya** (21, Juhu) - Creates a curated deep talks circle

**Users:**
- **Karan** (23, Bandra) - High energy, loves parties
- **Meera** (20, Andheri) - Introvert, prefers small groups
- **Vikram** (25, Powai) - Tech enthusiast, spontaneous
- **Ananya** (22, Lower Parel) - Social butterfly, always down
- **Rohan** (24, Versova) - Music lover, selective
- **Isha** (21, Worli) - New to Mumbai, making friends
- **Aditya** (23, Bandra) - Party regular, knows everyone
- **Sneha** (22, Andheri) - Chill vibes, coffee person
- **Rahul** (24, Juhu) - Philosophy student, deep convos

---

## 6:00 PM - Riya Creates Her First Curated Event

**Riya's Story:**
Riya opens Partizo and taps "Create Outing". She's planning a rooftop mixer for Saturday night. 

**Step 1 - Identity & Vibe:**
- Title: "Sunset Rooftop Mixer at Bandra"
- Event Mode: She selects **"Curated"** - "Host approves requests"
  - *"I want to keep it intimate, maybe 10-12 people max. I'll review each person."*
- Type: Rooftop Mixer
- Energy: 65/100 (Chill & Social)
- Tags: `rooftop`, `sunset`, `light_drinks`, `aesthetic`, `small_circle`

**Step 2 - Logistics:**
- Date: Saturday, 8:00 PM
- Duration: 4 hours
- Area: Bandra West
- Max Guests: 12
- Rules: "BYOB", "Respect the space", "No smoking inside"

**Step 3 - Visuals:**
- Uploads a stunning sunset photo from her last rooftop party
- Publishes

**Behind the scenes:**
- `eventMode: "curated"`
- `chatExpiresAt: Sunday 12:00 AM` (event end + 24h)
- `revealAt: Saturday 7:00 PM` (60 min before event)
- `pendingCount: 0`, `approvedCount: 0`
- Notification system: `every_request` mode

---

## 6:15 PM - Arjun Creates a Fast Event

**Arjun's Story:**
Arjun wants to host a gaming night tonight. He needs people fast.

**Step 1:**
- Title: "Gaming Night - Tekken Tournament"
- Event Mode: He selects **"Fast"** - "Auto-approve until full"
  - *"I don't have time to review requests. First come, first serve!"*
- Type: Gaming Night
- Energy: 85/100 (High Energy)
- Tags: `gaming_lan`, `competitive`, `late_night`, `casual`

**Step 2:**
- Date: Tonight, 9:00 PM
- Duration: 3 hours
- Area: Andheri West
- Max Guests: 8
- Rules: "Bring your controller", "Winner takes all"

**Step 3:**
- Uploads a photo of his gaming setup
- Publishes

**Behind the scenes:**
- `eventMode: "fast"`
- `chatExpiresAt: Tomorrow 12:00 AM`
- `revealAt: Tonight 8:00 PM`
- Notification system: `spike_only` mode (only notifies when near full)

---

## 6:30 PM - Discovery Begins

**Karan's Story:**
Karan opens Partizo's Discover feed. He sees:

1. **Riya's Rooftop Mixer** (Curated)
   - Badge: "CURATED"
   - CTA: "Request to Join"
   - Vibe Match: 78%
   - *"Nice! A rooftop party. Let me request."*

2. **Arjun's Gaming Night** (Fast)
   - Badge: "FAST JOIN"
   - CTA: "Join Now"
   - Vibe Match: 65%
   - *"Gaming? Not really my thing, but I'll check it out later."*

**Karan taps "Request to Join" on Riya's event.**

**Behind the scenes:**
- `outingStorage.createRequest()` is called
- Transaction creates `outingRequests/{outingId}_karanId` with `status: "pending"`, `source: "curated_request"`
- `pendingCount` increments to 1
- Notification created for Riya: "New join request - Karan wants to join 'Sunset Rooftop Mixer'"
- Karan's card now shows: "Pending" (disabled) + "REQUEST SENT" pill

---

## 6:32 PM - Multiple Requests Pour In

**Meera's Story:**
Meera sees Riya's event. She's an introvert, but the "small_circle" tag appeals to her.

- Taps "Request to Join"
- Vibe Match: 82% (high match!)
- Status: Pending

**Ananya's Story:**
Ananya is always down for rooftop parties. She requests immediately.

- Vibe Match: 75%
- Status: Pending

**Isha's Story:**
Isha is new to Mumbai. She sees both events but requests Riya's curated one first.

- Vibe Match: 70%
- Status: Pending

**Behind the scenes:**
- Riya now has 4 pending requests:
  - Karan (78% match)
  - Meera (82% match)
  - Ananya (75% match)
  - Isha (70% match)
- Her notification badge shows: **4**
- `pendingCount: 4`

---

## 6:35 PM - Fast Event Gets Instant Joins

**Vikram's Story:**
Vikram sees Arjun's gaming night. He's a gamer and loves the fast-join concept.

- Taps "Join Now"
- **Instant approval!** No waiting.
- Card immediately shows: "Open Chat" + "APPROVED ✅"
- He's added to the chat automatically

**Behind the scenes:**
- `outingStorage.fastJoin()` is called
- Transaction:
  - Creates `outingRequests/{outingId}_vikramId` with `status: "approved"`, `source: "fast_join"`
  - Creates `outings/{outingId}/members/vikramId` with `role: "member"`
  - Increments `approvedCount` to 1
  - Adds to `users/vikramId/activeOutings/{outingId}`
  - System message: "Vikram joined the outing"
- No notification to Arjun yet (only 1 person, not near full)

**Rohan's Story:**
Rohan also joins the gaming night instantly.

- Taps "Join Now"
- Instant approval
- `approvedCount: 2`

**Aditya's Story:**
Aditya joins too. He's friends with Arjun.

- Instant approval
- `approvedCount: 3`

**Behind the scenes:**
- Chat now has 4 people (Arjun + 3 members)
- System messages show: "Vikram joined", "Rohan joined", "Aditya joined"
- Arjun hasn't received any notifications yet (spike-only mode)

---

## 6:40 PM - Riya Reviews Requests

**Riya's Story:**
Riya opens her Host Dashboard. She sees:

**Pending Requests Tab:**
1. **Meera** - 82% Vibe Match
   - City: Andheri
   - Tags: `introvert_friendly`, `small_circle`
   - *"High match, and she seems like she'd fit the vibe."*

2. **Karan** - 78% Vibe Match
   - City: Bandra
   - Tags: `high_energy`, `party_buddies`
   - *"Good match, but might be too high energy for my chill rooftop vibe."*

3. **Ananya** - 75% Vibe Match
   - City: Lower Parel
   - Tags: `social_butterfly`, `aesthetic`
   - *"Seems fun, let me check her profile."*

4. **Isha** - 70% Vibe Match
   - City: Worli
   - Tags: `new_people_welcome`, `making_friends`
   - *"New to Mumbai? I'll help her out."*

**Riya taps "View Profile" on Meera.**

**Behind the scenes:**
- Navigates to `HostViewProfileScreen`
- Shows Meera's full profile:
  - Bio: "Love quiet conversations and meaningful connections"
  - Interests: Reading, Coffee, Art
  - Vibe Answers: All displayed with mutual vibes highlighted
  - Mutual Vibes: 3 matches (both prefer small circles, introvert-friendly, calm energy)

**Riya approves Meera.**

**Behind the scenes:**
- `outingStorage.approveRequest()` transaction:
  - Updates request: `status: "approved"`
  - Creates member doc
  - `pendingCount: 3`, `approvedCount: 1`
  - System message: "Meera joined the outing"
  - Notification to Meera: "You're in 🎉 - You've been approved for 'Sunset Rooftop Mixer'"

**Meera's Story:**
Meera gets a notification. She opens it and sees she's approved! Her card now shows "Open Chat" + "APPROVED ✅".

---

## 6:45 PM - More Fast Joins

**Sneha's Story:**
Sneha sees Arjun's gaming night. She's not a gamer, but she's curious.

- Taps "Join Now"
- Instant approval
- `approvedCount: 4`

**Rahul's Story:**
Rahul joins too. He's a philosophy student but loves gaming.

- Instant approval
- `approvedCount: 5`

**Behind the scenes:**
- Chat is getting active
- Arjun still no notifications (5/8 spots, not near full yet)

---

## 6:50 PM - Riya Continues Reviewing

**Riya's Story:**
Riya views Ananya's profile. High energy, but seems fun. She approves.

- `pendingCount: 2`, `approvedCount: 2`

**Ananya's Story:**
Ananya gets approved! She's excited.

**Riya views Isha's profile.** New to Mumbai, making friends. Riya approves to help her out.

- `pendingCount: 1`, `approvedCount: 3`

**Isha's Story:**
Isha gets approved! She's grateful.

**Riya views Karan's profile.** He's high energy, might be too much for her chill rooftop. She declines.

**Behind the scenes:**
- `outingStorage.declineRequest()` transaction:
  - Updates request: `status: "declined"`
  - `pendingCount: 0`
  - Notification to Karan: "Request declined - Your request for 'Sunset Rooftop Mixer' was declined"

**Karan's Story:**
Karan gets a notification. He's disappointed but understands. His card shows "Declined" (disabled) + "NOT APPROVED" pill.

---

## 7:00 PM - Gaming Night Fills Up

**Vikram's Story:**
Vikram invites his friend **Neha** (not in our cast, but joins).

- Neha joins instantly
- `approvedCount: 6`

**Another friend joins:**
- `approvedCount: 7`

**One more joins:**
- `approvedCount: 8` - **EVENT FULL!**

**Behind the scenes:**
- Event is now full
- Next person who tries to join gets error: "Event is full"
- Arjun finally gets a notification: "Event Full - 'Gaming Night - Tekken Tournament' is now full!"
- All cards for this event now show: "Event Full" (disabled)

---

## 7:30 PM - Chat Activity

**Riya's Curated Event Chat:**
- **Meera**: "Hey everyone! Excited for Saturday 🌅"
- **Ananya**: "Same! Can't wait"
- **Isha**: "This will be my first Partizo event, so excited!"
- **Riya** (host, highlighted): "Welcome everyone! We'll share the exact address closer to the event time."

**Arjun's Fast Event Chat:**
- **Vikram**: "Who's bringing snacks?"
- **Rohan**: "I got chips"
- **Aditya**: "I'll bring energy drinks"
- **Sneha**: "I'm new to Tekken, go easy on me 😅"
- **Arjun** (host): "Don't worry, we'll teach you!"
- System message: "Vikram joined the outing"
- System message: "Rohan joined the outing"
- (All previous joins shown as system messages)

---

## 8:00 PM - Location Reveal

**Riya's Event:**
- It's now 60 minutes before the event
- `revealAt` timestamp has passed
- All approved members can now see the exact address
- Riya's address: "Rooftop, Building XYZ, Bandra West"

**Meera, Ananya, Isha** can now see the full address in the Outing Details screen.

**Arjun's Event:**
- Also 60 minutes before
- Address revealed: "Apartment 502, Andheri West"

---

## 9:00 PM - Event Time

**Arjun's Gaming Night:**
- Event starts
- All 8 members are chatting actively
- They're coordinating arrival times
- Chat is live and active

**Riya's Rooftop Mixer:**
- Event starts tomorrow (Saturday)
- Chat is quieter but people are confirming attendance
- Riya pins a message: "See you all tomorrow at 8 PM! 🎉"

---

## Saturday 8:00 PM - Riya's Event Happens

**The Event:**
- Meera, Ananya, and Isha all arrive
- Riya hosts beautifully
- They have deep conversations, watch the sunset
- Everyone connects well

**After the Event:**
- Chat remains active for 24 hours
- People share photos
- Exchange Instagram handles
- Chat expires Sunday 12:00 AM

---

## Sunday 12:00 AM - Chat Expiration

**Both Events:**
- `chatExpiresAt` timestamp passes
- Chat input is disabled
- Banner shows: "This chat is closed. Hope you had a great time ✨"
- People can still read old messages but can't send new ones

---

## The Day After - Priya Creates a Deep Talks Circle

**Priya's Story:**
Priya wants to host a curated deep talks circle. She creates it with:
- Event Mode: **Curated**
- Type: Deep Talks Circle
- Max Guests: 6
- Tags: `deep_convos`, `introvert_friendly`, `small_circle`, `no_alcohol`

**Rahul's Story:**
Rahul sees Priya's event. Perfect for him! He requests.

**Meera's Story:**
Meera also sees it. She requests too (already approved for Riya's, but wants more connections).

**Behind the scenes:**
- Priya gets 2 requests
- She reviews both profiles
- Approves both (small curated group)
- They join the chat

---

## Key Takeaways from the Story

### Curated Events (Riya, Priya):
1. **Host Control**: Host reviews every request
2. **Quality Over Quantity**: Smaller, more intentional groups
3. **Notifications**: Host gets notified for every request
4. **Profile Review**: Host can see full profiles before approving
5. **Selective Approval**: Host can decline if vibe doesn't match

### Fast Events (Arjun):
1. **Instant Access**: Users join immediately, no waiting
2. **First Come, First Serve**: Event fills up quickly
3. **Spike Notifications**: Host only notified when near full
4. **No Review Needed**: Perfect for casual, high-volume events
5. **Quick Fills**: Great for last-minute events

### User Experience:
- **Clear CTAs**: Users know exactly what to expect
- **Status Visibility**: Always know where they stand
- **Instant Feedback**: Optimistic UI updates
- **Smart Matching**: Vibe scores help hosts decide
- **System Messages**: Everyone knows who joined
- **Location Privacy**: Address revealed at the right time
- **Chat Expiration**: Clean closure after events

### Technical Flow:
1. **Policy Layer**: All decisions flow through `eventPolicy.ts`
2. **Transactions**: Atomic operations ensure data consistency
3. **Notifications**: Smart routing based on event mode
4. **Security**: Firestore rules enforce permissions
5. **Real-time**: Everything updates instantly

---

## Statistics from This Story

**Curated Events:**
- Riya's event: 4 requests, 3 approved, 1 declined (75% approval rate)
- Priya's event: 2 requests, 2 approved (100% approval rate)

**Fast Events:**
- Arjun's event: 8 instant joins, filled in 30 minutes

**User Journeys:**
- **Meera**: Requested curated → Approved → Attended → Requested another curated
- **Karan**: Requested curated → Declined → Learned to match energy better
- **Vikram**: Joined fast event → Instant access → Active in chat
- **Isha**: New user → Approved for curated → Made friends → Became regular

**Notification Patterns:**
- Riya: 4 notifications (every request)
- Arjun: 1 notification (only when full)
- Users: Notifications for approvals/declines

---

*This is how Partizo's dual-mode system creates two distinct experiences: curated intimacy and fast spontaneity, all powered by a single, elegant policy layer.*

