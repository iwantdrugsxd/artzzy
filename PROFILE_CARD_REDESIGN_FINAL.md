# Profile Card Redesign - Final Implementation

## ✅ Layout Structure (Exact Order)

1. **Top Hero Image** (420px, full-bleed)
   - Subtle haze overlay
   - Black-to-transparent scrim
   - Rounded top corners (24px)
   - Floating pills: "ACTIVE NOW" (left) + Match % (right)

2. **Content Block** (Directly under hero)
   - Name + Age (28px, bold)
   - Height (14px, muted) - **Only if available, no blank space if missing**
   - Tags/Chips row (2-3 chips with red glow)

3. **Middle Image** (280px, full-bleed within card)
   - Second photo
   - Rounded corners (24px)
   - **Gracefully collapses if missing** (no layout break)

4. **Prompts Section** (Vertical stack, one after another)
   - Questions: Elegant serif/display, uppercase, muted (11px)
   - Answers: Clean sans, brighter, readable (14px)
   - **Always shows minimum 3 prompts** (fallback logic)
   - **Vertical layout** (NOT 2-column grid)

5. **Interests Section** (Under prompts)
   - Label: "INTERESTS"
   - 4-6 chips in a row

## ✅ System Protection Rules

### Height Field
- ✅ **If missing**: Completely hidden (no blank space)
- ✅ **If exists**: Displays formatted (e.g., "175 cm" or "5'10"")
- ✅ **No layout break**: Missing height doesn't affect spacing

### Middle Image
- ✅ **If missing**: Section collapses gracefully
- ✅ **If exists**: Full-bleed display
- ✅ **No layout break**: Missing image doesn't break structure

### Prompts/Answers
- ✅ **Always render**: Minimum 3 Q/A pairs guaranteed
- ✅ **Fallback logic**: Generates from bio/tags/interests
- ✅ **Vertical stack**: One prompt after another (not columns)
- ✅ **No missing fields**: Every prompt has question + answer

## ✅ Typography Map

### Name + Age
- Font: System Bold
- Size: 28px
- Weight: 700
- Letter Spacing: -0.5px
- Color: `#F5F5F5`

### Height (Optional)
- Font: System Regular
- Size: 14px
- Weight: 400
- Color: `rgba(245,245,245,0.52)`

### Tags/Chips
- Font: System Bold
- Size: 11px
- Weight: 700
- Color: `#F5F5F5`
- Effect: Subtle red glow

### Prompt Questions
- Font: System Semibold (ideally serif/display)
- Size: 11px
- Weight: 600
- Letter Spacing: 1.5px
- Text Transform: Uppercase
- Color: `rgba(245,245,245,0.52)` (muted)

### Prompt Answers
- Font: System Regular
- Size: 14px
- Weight: 400
- Line Height: 22px
- Color: `#F5F5F5` (brighter)

## ✅ Fallback Logic

### `ensureQAPairs()` Function
1. Uses existing valid prompts first
2. Generates answers from bio/tags/interests for missing prompts
3. Uses default questions if needed
4. **Always returns at least 3 Q/A pairs**

### `generateAnswer()` Function
- Extracts relevant info from bio
- Uses tags to inform personality-based answers
- Incorporates interests into responses
- Provides personalized defaults

## ✅ Files Updated

1. **`src/components/ProfileCard.tsx`**
   - Complete redesign with exact layout order
   - Height field support (optional)
   - Middle image between content and prompts
   - Vertical prompts stack (not 2-column)
   - Fallback logic for missing prompts
   - System protection (no layout breaks)

2. **`PROFILE_CARD_TYPOGRAPHY.md`**
   - Updated with height typography
   - Complete font specifications

3. **`PROFILE_CARD_LAYOUT.md`** (New)
   - Exact layout structure
   - System protection rules
   - Spacing system

4. **`PROFILE_CARD_EXAMPLES_UPDATED.md`** (New)
   - Examples with new layout
   - Fallback examples
   - Complete profile examples

## ✅ Design Features

- **Cinematic**: Full-bleed hero with scrim
- **Glossy**: Glass panels and soft shadows
- **Intimate**: Dark background with neon/red accents
- **Premium**: 24px rounded corners, 8pt grid spacing
- **Robust**: Graceful handling of missing data

## ✅ Testing Checklist

- [x] Height displays when available
- [x] Height hidden when missing (no blank space)
- [x] Middle image displays when available
- [x] Middle image collapses when missing (no layout break)
- [x] Prompts always show (minimum 3)
- [x] Prompts in vertical stack (not columns)
- [x] Fallback logic generates relevant answers
- [x] Interests display when available
- [x] All spacing follows 8pt grid
- [x] No system breaks with missing data

## ✅ Component Props

```typescript
type Props = {
  name: string;
  age?: number | null;
  height?: string | number | null; // NEW: Optional height
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  photo?: string | null;
  photos?: string[];
  interests?: string[];
  score: number;
  tags: string[];
  onPress?: () => void;
  showDetails?: boolean;
  vibeHighlights?: string[];
  memberSince?: number | string | null;
  quickBadges?: string[];
  prompts?: Array<{ id: string; category: string; question: string; answer: string }>;
  isActive?: boolean;
};
```

## ✅ Usage

The component handles all edge cases gracefully:
- Missing height → Hidden (no blank space)
- Missing middle image → Section collapses
- Missing prompts → Generated from bio/tags/interests
- Missing interests → Section hidden

**No breaking changes** - existing usage continues to work, with new optional `height` prop.



