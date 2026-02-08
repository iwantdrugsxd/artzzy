# Partizo Project Report

Date: February 8, 2026
Source: Codebase review at `/Users/vishnu/Arttzy`

**1. Executive Summary**

| Item | Findings |
| --- | --- |
| App name | Partizo |
| Platforms | iOS, Android, Web (Expo) |
| Tech stack | React Native + Expo + TypeScript, Firebase Auth + Firestore, Cloudinary (image upload), Google Places API, React Navigation, Expo Location, react-native-maps |
| Project stage | Not specified. Code comments reference Phase 1-4 features and multiple stubs, indicating pre-production build. |
| Scope coverage | Core flows for onboarding, discovery, outings, connections, and chat are implemented. Monetization, admin tooling, and some safety/polish features are partial or missing. |
| Overall readiness | Not production-ready due to security exposure, incomplete monetization, data model inconsistencies, and lack of automated tests. |

**Top strengths**

| Strength | Evidence |
| --- | --- |
| Core social and event flows implemented | `OutingsScreen`, `CreateOutingScreen`, `OutingDetailsScreen`, `OutingChatScreen`, `PeopleScreen`, `ConnectionReviewScreen` |
| Real-time messaging and notifications | Firestore `onSnapshot` usage in `OutingChatScreen`, `DirectChatScreen`, `NotificationsScreen` |
| Modular business logic | `src/utils/outingStorage.ts`, `src/utils/connectionStorage.ts`, `src/utils/eventPolicy.ts` |

**Critical risks**

| Risk | Evidence | Impact |
| --- | --- | --- |
| Service account private key in repo | `/Users/vishnu/Arttzy/serviceAccountKey.json` | Critical security exposure and immediate key rotation needed |
| Firestore rules gaps for cross-user writes | `/Users/vishnu/Arttzy/FIRESTORE_RULES_ID_CONNECTION.md`, `/Users/vishnu/Arttzy/FIRESTORE_RULES_VIBE_CONNECTIONS.md` | Production flows can fail or be insecure |
| Data model inconsistencies | `connections` legacy vs `users/{uid}/connections` subcollection | Incorrect filtering, duplicated connections, and inconsistent UI |
| No automated tests | No test frameworks in `package.json` | High regression risk |

**2. App Overview and Core Objectives**

| Objective | Supporting features | Status |
| --- | --- | --- |
| Let users discover and join outings | Discover feed, outing details, join requests, waitlist | Implemented with partial waitlist UI |
| Enable hosts to create and manage outings | Create outing, host dashboard, approve/decline requests, host tools in chat | Implemented |
| Match and connect users by vibe | People feed swipe, vibe requests, connect by user ID | Implemented with rule dependencies |
| Provide real-time communication | Outing chat and direct chat | Implemented |
| Support premium upsell | Subscription screen and gating | Partial and stubbed |

**3. Feature Inventory Matrix**

| Feature | Status | Notes |
| --- | --- | --- |
| Email sign up and login | Implemented | `EmailSignupScreen`, `EmailLoginScreen` |
| Google sign-in | Partial | Requires correct Expo client IDs and proxy config |
| Session persistence | Implemented | Firebase Auth + AsyncStorage |
| Onboarding (8 steps) | Implemented | Basic info, photos, bio, badges, prompts, vibe questions, interests, finish |
| Profile edit and manage photos | Implemented | Cloudinary upload required |
| Profile preview | Implemented | `ProfilePreviewScreen` |
| Discover outings feed | Implemented | Client-side filters and search |
| Outing details | Implemented | Join, view host, share |
| Create outing (multi-step) | Implemented | Cloudinary image, map location, validation |
| Curated join requests | Implemented | `outingStorage.createRequest` |
| Fast join mode | Implemented | `outingStorage.fastJoin` |
| Waitlist join and promotion | Partial | Join and auto-promotion only, no host controls |
| RSVP per member | Implemented | `OutingChatScreen` |
| Outing chat | Implemented | Typing indicators and read tracking |
| Direct chat | Implemented | Typing, read receipts, profile preview |
| Connection requests (vibe) | Implemented | `connectionStorage.sendVibe` |
| Connection review | Implemented | `ConnectionReviewScreen` |
| Connect by user ID | Partial | Flow exists but Firestore rules are required |
| Notifications | Implemented | Firestore-backed, unread badge |
| Safety: block/report | Implemented | Block and report actions, limited review UI |
| Subscription and premium gating | Partial | UI only, no payment provider integration |
| Spotlight boost | Partial | Timestamp set without duration enforcement |
| Referral invite | Partial | Code generation and share, no reward tracking |
| Calendar add | Missing | Stub in `OutingDetailsScreen` |
| Deep link handling | Missing | Share uses `partizo://` but no routing config |
| Admin/moderation tools | Missing | No admin UI or audit flows |

**4. Screen-by-Screen Functional Breakdown**

| Screen (Route) | Purpose | Primary actions | Data/services | Status/Notes |
| --- | --- | --- | --- | --- |
| Splash (Splash) | Loading transition | Animated branding | None | Used |
| AuthChoice (AuthChoice) | Entry auth choice | Google sign-in, Email signup/login | Firebase Auth, Expo Auth Session | Used |
| EmailSignup (EmailSignup) | Create account | Email/password validation, signup | Firebase Auth | Used |
| EmailLogin (EmailLogin) | Login | Email/password login | Firebase Auth | Used |
| BasicInfo (BasicInfo) | Onboarding step 1 | Name, gender, birthdate, city, detect location | Expo Location, Auth draft | Used |
| PhotoUpload (PhotoUpload) | Onboarding step 2 | Upload profile photos | Cloudinary | Used |
| Bio (Bio) | Onboarding step 3 | Bio input | Auth draft | Used |
| QuickBadges (QuickBadges) | Onboarding step 4 | Select badges | Local data | Used |
| Prompts (Prompts) | Onboarding step 5 | Answer prompts | Local data | Used |
| VibeQuestion (VibeQuestion) | Onboarding step 6 | Answer vibe questions | Local data | Used |
| Interests (Interests) | Onboarding step 7 | Select interests | Local data | Used |
| Finish (Finish) | Onboarding step 8 | Complete onboarding | Firestore user doc | Used |
| HomeTabs (Home) | Main tab navigator | Discover, People, Create, Chat, Notifications | React Navigation | Used |
| Outings (Discover) | Outing feed | Filter, search, open details | Firestore `outings` | Used |
| People (Vibe) | People feed and connect | Swipe vibe/pass, connect by ID | Firestore `users`, `connections`, `skips`, `blocks` | Used |
| ChatList (Chat) | Chat list | Open direct/outing chats | Firestore `directChats`, `users/*/activeOutings` | Used |
| Notifications (Notifications) | Notification inbox | Open details, mark read | Firestore `users/{uid}/notifications` | Used |
| OutingDetails | Outing details | Join/request, open chat, share | Firestore `outings`, `outingRequests` | Used |
| CreateOuting | Create outing | Multi-step publish | Firestore `outings` and user indexes | Used |
| OutingChat (ChatThread) | Group chat | Send messages, RSVP, host tools | Firestore `outings/*/messages` | Used |
| HostDashboard | Host admin view | Review requests, view outings | Firestore `outings`, `outingRequests` | Used |
| ConnectionRequests | Vibe request list | View incoming/sent/history | Firestore `connectionRequests` | Used |
| ConnectionReview | Review vibe request | Accept/reject/block/report | Firestore `connectionRequests` | Used |
| IdConnectionReview | Review ID request | Accept/reject | Firestore `idConnectionRequests` | Used |
| DirectChat | Direct messaging | Send, block/report, view profile | Firestore `directChats` | Used |
| Connections | Saved connections list | Open profile | Firestore `users/{uid}/connections` | Used |
| LocationPicker | Map-based location | Search places, pick location | Google Places, Expo Location, Maps | Used |
| MyProfile | Profile overview | Manage photos, view stats, user ID | Firestore `users` and subcollections | Used |
| EditProfile | Edit profile | Update bio/city/interests | Firestore `users` | Used |
| ManagePhotos | Photo management | Upload/reorder/remove | Cloudinary, Firestore `users` | Used |
| ProfilePreview | Preview own profile | View profile card | Local profile | Used |
| Profile | Public profile | Approve/decline join, connect | Firestore `users`, `outingRequests` | Used |
| SafetySettings | Safety controls | View/unblock | Firestore `blocks` | Used |
| InviteFriends | Referral share | Generate and share code | Firestore `users` | Used |
| Subscription | Premium UI | Upgrade/restore/manage | Firestore `users` (dev toggle only) | Used (stub) |
| HomeScreen | Legacy screen | None | None | Unused |
| OutingsLocked | Legacy locked screen | None | None | Unused |
| UserProfile | Legacy profile view | Connect | Firestore `connections` | Unused |
| HostViewProfile | Legacy host view | Approve/decline | Firestore `outingRequests` | Unused |

**5. User Flow Checklist**

| Flow | Entry | Exit | Status | Notes |
| --- | --- | --- | --- | --- |
| Email sign up | AuthChoice | Onboarding | Implemented | Validations in place |
| Email login | AuthChoice | Home | Implemented | Basic error handling |
| Google sign-in | AuthChoice | Home | Partial | Requires client IDs, proxy config |
| Onboarding completion | BasicInfo -> Finish | Home | Implemented | Draft persisted in AsyncStorage |
| Discover outing | Outings | OutingDetails | Implemented | Filters and search are client-side |
| Join curated outing | OutingDetails | OutingChat | Implemented | Request + host approval required |
| Fast join outing | OutingDetails | OutingChat | Implemented | Auto-approve until full |
| Join waitlist | OutingDetails | OutingDetails | Partial | No host waitlist UI |
| Create outing | CreateOuting | OutingDetails | Implemented | Requires cover image and title |
| Host review requests | HostDashboard/Profile | OutingChat | Implemented | Approval via `outingStorage` |
| Outing chat + RSVP | OutingChat | OutingChat | Implemented | RSVP required for curated |
| Direct chat | ChatList | DirectChat | Implemented | Expiry handled |
| Vibe request | People | ConnectionReview | Implemented | Cooldown and limits enforced |
| Connect by user ID | People | IdConnectionReview | Partial | Blocked by Firestore rules if not updated |
| Block/report | Profile/Chat | SafetySettings | Implemented | Reports are write-only |
| Subscription upgrade | Subscription | Subscription | Partial | No payment provider integration |
| Invite friends | InviteFriends | InviteFriends | Partial | No reward tracking |

**6. Functional Coverage Analysis**

| Domain | Coverage | Evidence |
| --- | --- | --- |
| Authentication | Medium | Email and Google supported, Google requires config |
| Onboarding | High | Full 8-step onboarding, draft persistence |
| Profiles | Medium | Core edit and view, some legacy flows unused |
| Outings | High | Create, discover, join, host tools implemented |
| Messaging | Medium | Direct and group chat implemented, no pagination |
| Connections | Medium | Vibe and ID connect exist, model inconsistencies |
| Safety | Low | Block/report exists, limited visibility of reports |
| Monetization | Low | Subscription UI only |
| Observability | Low | Logger only, no analytics or crash reporting |
| Admin/ops | Missing | No admin or moderation tooling |

**7. API and Backend Mapping**

**Firestore collections and paths**

| Resource | Read/Write | Used by | Notes |
| --- | --- | --- | --- |
| `users/{uid}` | R/W | AuthContext, Profile, Subscription | Primary profile data |
| `users/{uid}/notifications` | R/W | HomeTabs, Notifications, storage utilities | Unread counts and alerts |
| `users/{uid}/connections` | R/W | Connections, connectionStorage | New connection model |
| `users/{uid}/activeOutings` | R/W | ChatList, outingStorage | Active outing index |
| `users/{uid}/hostedOutings` | R/W | MyProfile, HostDashboard | Hosted outings index |
| `users/{uid}/pastOutings` | R/W | MyProfile, ChatList cleanup | Historical events |
| `users/{uid}/usage/{dateKey}` | R/W | connectionStorage | Daily vibe limits |
| `outings/{outingId}` | R/W | Outing screens, storage | Core outing data |
| `outings/{outingId}/members` | R/W | OutingChat, outingStorage | Membership and RSVP |
| `outings/{outingId}/messages` | R/W | OutingChat | Group chat messages |
| `outings/{outingId}/chatMeta/meta` | R/W | OutingChat, ChatList | Typing and last message |
| `outings/{outingId}/waitlist` | R/W | outingStorage | Waitlist management |
| `outingRequests/{outingId}_{userId}` | R/W | outingStorage, HostDashboard | Curated join requests |
| `connectionRequests/{fromUid}_{toUid}` | R/W | connectionStorage | Vibe requests |
| `idConnectionRequests/{fromUid}_{toUid}` | R/W | idConnectionStorage | Connect by user ID |
| `directChats/{chatId}` | R/W | DirectChat, connectionStorage | Direct chat metadata |
| `directChats/{chatId}/messages` | R/W | DirectChat | Direct messages |
| `directChats/{chatId}/meta/meta` | R/W | DirectChat | Typing and read receipts |
| `directChats/{chatId}/saveIntent/{uid}` | R/W | connectionStorage | Save connection intent |
| `connections` (legacy) | R/W | People, ProfileScreen, UserProfileScreen | Legacy connection model |
| `blocks` | R/W | Safety, connectionStorage | Block list |
| `reports` | W | connectionStorage, DirectChat | Report submissions |
| `skips` | W | People | Swipe pass tracking |

**External APIs and services**

| Service | Purpose | Evidence |
| --- | --- | --- |
| Firebase Auth | User authentication | `src/context/AuthContext.tsx` |
| Google Places API | Address autocomplete/details | `src/utils/places.ts` |
| Google Maps SDK | Map display | `LocationPickerScreen` |
| Cloudinary | Image upload | `PhotoUploadScreen`, `ManagePhotosScreen`, `CreateOutingScreen` |
| Expo Location | Device location | `BasicInfoScreen`, `LocationPickerScreen` |
| Expo Auth Session | Google OAuth | `AuthChoiceScreen` |
| Expo Sharing/Clipboard | Share links | `OutingDetailsScreen`, `ProfileScreen`, `InviteFriendsScreen` |

**8. State Management and Business Logic**

| Module | Responsibility | Notes |
| --- | --- | --- |
| `AuthContext` | Auth state and profile draft | Uses AsyncStorage for draft persistence |
| `outingStorage` | Outing request lifecycle, waitlist, RSVP, host actions | Transaction-heavy, relies on Firestore rules |
| `connectionStorage` | Vibe requests, direct chat creation, blocking, reporting | Contains cooldown and limit logic |
| `idConnectionStorage` | Connect by user ID | Requires Firestore rules for cross-user writes |
| `eventPolicy` | CTA logic for outing modes | Centralizes permissions and UI states |
| `connectionPolicy` | Vibe limits and chat expiry by plan | Uses profile plan fields |
| `outingTitleBackfill` | Repair missing title | Backfills from host indexes |
| `profileCompleteness` | Gating for People feed | Hard requirements enforced |
| `places` | Google Places API wrapper | Uses EXPO public API keys |
| `storage` | AsyncStorage wrapper | Used for drafts |

**9. UX and Usability Audit**

| Area | Finding | Severity |
| --- | --- | --- |
| Onboarding | Clear 8-step flow with validation | Low |
| Loading states | Skeletons used in key screens | Low |
| Error feedback | Inconsistent; some flows silently fail | Medium |
| Discover filters | Client-side approximations (radius = city) | Medium |
| Chat usability | Typing and read receipts present | Low |
| Premium gating | UI present but actions are stubbed | Medium |
| Navigation hygiene | Multiple unused screens remain | Medium |
| Accessibility | No explicit accessibility labels for icons | Medium |

**10. Edge Case and Error Handling Matrix**

| Edge case | Current handling | Gap/Risk |
| --- | --- | --- |
| Missing outing title | Backfill and fallback to "Outing" | Works, but depends on host index |
| Outing full | Join waitlist | No UI for waitlist management |
| Chat expired | Chat disabled | No user-facing explanation beyond text |
| Member removed | Chat locked and exit | Covered |
| Permission denied writes | Error logging and UI messages | Requires Firestore rule changes |
| Cloudinary upload failure | Alert with generic error | No retry or offline handling |
| Google sign-in misconfig | Button hidden | No troubleshooting guidance |
| Location permission denied | Falls back to default city | City not configurable |
| Subscription actions | Alert stubs | Missing payment integration |
| Saved connection intent | No UI trigger | Feature not reachable |

**11. Performance and Stability Review**

| Area | Observation | Risk |
| --- | --- | --- |
| People feed | Loads all users and filters client-side | High memory and latency at scale |
| Outings feed | Per-item host fetch for vibe score and host score | N+1 query overhead |
| Outing details | Per-attendee profile fetch | N+1 query overhead |
| Chat lists | Multiple queries and per-chat profile fetch | Slow with many chats |
| Message lists | No pagination; full history loaded | Slow for long chats |
| Firestore listeners | Multiple `onSnapshot` per screen | Battery and network usage |

**12. Security and Permissions Review**

| Issue | Evidence | Impact | Recommendation |
| --- | --- | --- | --- |
| Service account private key in repo | `/Users/vishnu/Arttzy/serviceAccountKey.json` | Critical credential leak | Remove file, rotate keys, add to .gitignore |
| Firestore rules missing for new flows | `/Users/vishnu/Arttzy/FIRESTORE_RULES_ID_CONNECTION.md` | Requests fail or are insecure | Implement rules and test |
| Cross-user writes in client | `connectionStorage.acceptVibe` | Requires permissive rules | Move to server or restrict with security rules |
| Public API keys in Expo env | `EXPO_PUBLIC_*` | Key misuse possible | Lock down keys and usage limits |
| Cloudinary unsigned uploads | Client-side upload preset | Abuse risk | Use signed uploads or rate limits |
| Sensitive logging | Email and user IDs logged | PII in logs | Reduce PII in production logs |

**13. Technical Debt and Risk Assessment**

| Item | Severity | Evidence |
| --- | --- | --- |
| Dual connection models | High | `connections` legacy vs `users/{uid}/connections` |
| Duplicate type definitions | Medium | `src/types/connection.ts`, `src/types/directChat.ts` |
| Unused screens | Medium | `HomeScreen`, `OutingsLockedScreen`, `UserProfileScreen`, `HostViewProfileScreen` |
| Subscription stubs | Medium | `SubscriptionScreen` is UI-only |
| Calendar integration stub | Medium | `OutingDetailsScreen` log-only action |
| Mixed legacy fields | Medium | `profile_photo_url` vs `profilePhotoUrls` |
| Client-side enforcement | Medium | Limits and access control in client code |

**14. Test Coverage Summary**

| Area | Coverage | Notes |
| --- | --- | --- |
| Unit tests | None | No test framework in repo |
| Integration tests | None | No automated Firestore or auth tests |
| E2E tests | None | No mobile test suite |
| Manual test aids | Partial | Seed scripts exist under `/Users/vishnu/Arttzy/scripts` |

**15. Final Readiness Scorecard**

| Dimension | Score (0-5) | Rationale |
| --- | --- | --- |
| Feature completeness | 3 | Core flows exist, premium and admin partial |
| UX maturity | 3 | Polished UI but inconsistent error handling |
| Stability | 2 | Heavy client-side queries and no pagination |
| Security/privacy | 1 | Service account key exposure and rules gaps |
| Observability | 2 | Logging only, no analytics or crash reporting |
| Test readiness | 0 | No automated tests |
| Release readiness | 2 | Requires security fixes and stabilization |

**16. Key Gaps, Blockers, and Recommendations**

| Priority | Gap/Blocker | Recommendation |
| --- | --- | --- |
| P0 | Service account key committed | Remove file, rotate Firebase keys immediately |
| P0 | Firestore rules not aligned with flows | Apply rules for `idConnectionRequests` and cross-user connections |
| P0 | Data model inconsistency for connections | Migrate to single model, update People/Profile filters |
| P1 | No payment integration | Implement payment provider or hide upgrade UI |
| P1 | Unbounded queries in People feed | Add pagination and server-side filters |
| P1 | No message pagination | Add query limits and load-more |
| P2 | Unused screens in nav | Remove or rewire legacy screens |
| P2 | Incomplete waitlist UX | Add waitlist visibility and admin tools |
| P2 | Deep link handling missing | Add app linking configuration |
| P2 | Missing analytics | Add event tracking and crash reporting |

