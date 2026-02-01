# Premium UI Implementation Plan

This document tracks the comprehensive UI improvements across all Partizo screens to achieve production-level quality matching Bumble/Instagram standards.

## Implementation Status

### ✅ Completed
- [x] ProfileScreen - Full-bleed carousel, glass back button, deep black base
- [x] SplashScreen - Pulsing logo with red glow + noise gradient background

### 🚧 In Progress
- [ ] AuthChoiceScreen - Hero gradient panel + 56px CTAs with red glow
- [ ] EmailLoginScreen - Glass input fields + red focus glow + inline error chips

### 📋 Pending

#### Auth Flow
- [ ] EmailSignupScreen - Step indicator + high-contrast helper text

#### Main Screens
- [ ] HomeScreen - Bold hero header + quick action cards with red edge lighting
- [ ] PeopleScreen - Full-bleed cards with image scrim + bottom-left badges
- [ ] MyProfileScreen - Profile strength ring + glass edit bar
- [ ] UserProfileScreen - Social proof (mutuals, stats) in elevated cards with red glow edges
- [ ] HostViewProfileScreen - Featured banner + verified chip + red accent

#### Profile Management
- [ ] ManagePhotosScreen - Drag-reorder affordance + glowing "Add photo" tile
- [ ] EditProfileScreen - Glass sections + sticky glowing Save CTA

#### Connections
- [ ] ConnectionsScreen - Avatar cards with soft shadows + red unread dots
- [ ] ConnectionRequestsScreen - Card stack + accept/decline haptics + red action glow
- [ ] ConnectionReviewScreen - "Why this match" glass panel with bold keywords

#### Chat
- [ ] ChatListScreen - Glass search bar + unread badge glow
- [ ] DirectChatScreen - Red-accent message bubbles + glass composer + typing shimmer
- [ ] OutingChatScreen - Outing banner header with date pill + red accent

#### Outings
- [ ] OutingsScreen - Segmented control with red underline + card date pills
- [ ] OutingDetailsScreen - Hero image + sticky Join/RSVP CTA with red glow
- [ ] CreateOutingScreen - Stepper header + section cards + inline previews
- [ ] OutingsLockedScreen - Dramatic lock illustration + red halo + unlock CTA
- [ ] HostDashboardScreen - KPI tiles with glow + trend sparkline

#### Other
- [ ] NotificationsScreen - Time grouping + red unread accents + thin dividers
- [ ] LocationPickerScreen - Glass search + red pin glow + bottom sheet CTA

#### Onboarding
- [ ] BasicInfoScreen - Bold H1 + red highlight for key fields
- [ ] BioScreen - Live character count pill + subtle red focus ring
- [ ] PhotoUploadScreen - Larger primary photo slot with red border glow
- [ ] VibeQuestionScreen - Card flip animation + progress dots
- [ ] InterestsScreen - Pill chips with red active glow + haptic on select
- [ ] FinishScreen - Celebratory gradient burst + strong primary CTA

## Design System Enhancements

### Colors
- Pure black background: `#000000`
- Red glow: `rgba(255, 45, 45, 0.4)` with shadow radius 20-30
- Glass effect: `rgba(0, 0, 0, 0.5)` with `rgba(255, 255, 255, 0.1)` border

### Typography
- H1: 32px, bold (700-800 weight)
- H2: 26px, bold (700 weight)
- H3: 20px, semibold (600 weight)
- Caption: 12px for subtle text

### Components
- CTAs: 56px height, 22px radius, red glow shadow
- Glass inputs: Semi-transparent with red focus glow
- Cards: Elevated with shadows and red edge lighting
- Badges: Red glow edges for premium feel

### Interactions
- Haptic feedback on all primary actions
- Smooth animations (scale, opacity, glow)
- Press states with scale 0.98

## Implementation Notes

- All screens use pure black (`#000000`) background
- Red glow effects use `shadowColor: colors.primary` with high opacity
- Glass effects use semi-transparent backgrounds with subtle borders
- All CTAs are 56px height minimum
- Consistent spacing: 24px (layout.major) between sections










