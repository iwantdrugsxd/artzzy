# UI-Only Refactor Implementation Plan

## Phase 1: Foundation ✅
- [x] Create unified tokens.ts
- [x] Create UI primitives (PrimaryButton, SecondaryButton, AppCard, AppTextField, AppSheet, Toast)
- [x] Update theme exports

## Phase 2: Core Screen Updates (In Progress)

### Priority 1: High-Impact Screens
1. **OutingsScreen** - Segmented control with red underline + card date pills
2. **OutingCard** - Simplify visually, emphasize title/date/city/CTA only
3. **PeopleScreen** - Already has full-bleed cards, enhance badges
4. **HomeScreen** - Already updated with hero header

### Priority 2: Auth & Onboarding
5. **AuthChoiceScreen** - Tagline updated ✅
6. **EmailLoginScreen** - Already has glass inputs ✅
7. **EmailSignupScreen** - Already has step indicator ✅
8. **Onboarding screens** - Update typography/spacing

### Priority 3: Profile & Settings
9. **MyProfileScreen** - Profile strength ring + glass edit bar
10. **ProfileScreen** - Already updated ✅
11. **EditProfileScreen** - Glass sections + sticky Save CTA
12. **ManagePhotosScreen** - Drag-reorder + glowing Add tile

### Priority 4: Connections & Chat
13. **ConnectionsScreen** - Avatar cards + red unread dots
14. **ConnectionRequestsScreen** - Card stack + haptics
15. **ChatListScreen** - Glass search + unread badge glow
16. **DirectChatScreen** - Red-accent bubbles + glass composer

### Priority 5: Outings Flow
17. **OutingDetailsScreen** - Hero image + sticky Join/RSVP CTA
18. **CreateOutingScreen** - Stepper header + section cards
19. **HostDashboardScreen** - KPI tiles with glow

## Implementation Rules
- Replace hardcoded #000000 with tokens.colors.bg.base
- Replace all buttons with PrimaryButton/SecondaryButton (56px height)
- Use tokens for all spacing (8pt grid)
- Use tokens for all typography
- Simplify cards: remove extra pills, emphasize core info
- Add red underline to active segmented controls
- Update taglines globally










