# Profile Card Layout Structure

## Exact Layout Order

### 1. Top Hero Image (Full-bleed)
- Height: 420px
- Full-width within card
- Rounded top corners (24px)
- Subtle haze overlay (rgba(255,255,255,0.03))
- Black-to-transparent gradient scrim
- Floating pills overlay:
  - Left: "ACTIVE NOW" with green dot
  - Right: Match percentage

### 2. Content Block (Directly under top image)
- **Name + Age**: 28px, bold, confident
- **Height**: 14px, muted (only if available - no blank space if missing)
- **Tags/Chips Row**: 2-3 vibe chips with subtle red glow
- Compact spacing, premium feel

### 3. Middle Image (Second Photo)
- Height: 280px
- Full-bleed within card (extends to card edges)
- Rounded corners (24px)
- Only shown if second photo exists
- If missing, section collapses gracefully (no layout break)

### 4. Prompts Section (Under middle image)
- **Layout**: Vertical stack (one after another)
- **NOT 2-column grid** - each prompt renders vertically
- Each prompt shows:
  - Question on top (elegant serif/display, uppercase, muted)
  - Answer beneath (clean sans, brighter, readable)
- Minimum 3 prompts always shown (fallback logic ensures this)
- Spacing: Generous gaps between prompts

### 5. Interests/Hobbies Section
- Label: "INTERESTS" (uppercase, letter-spaced)
- 4-6 interest chips in a row
- Only shown if interests exist

## Data Rules (System Protection)

### Height Field
- ✅ **If height is missing**: Hide the height line completely (no blank space)
- ✅ **If height exists**: Display formatted (e.g., "175 cm" or `5'10"`)
- ✅ **No layout break**: Missing height doesn't affect spacing

### Middle Image
- ✅ **If missing**: Section collapses, no blank space
- ✅ **If exists**: Full-bleed display with rounded corners
- ✅ **No layout break**: Missing image doesn't break card structure

### Prompts/Answers
- ✅ **Always render**: Minimum 3 Q/A pairs guaranteed
- ✅ **Fallback logic**: Generates from bio/tags/interests if missing
- ✅ **Vertical layout**: One prompt after another (not columns)
- ✅ **No missing fields**: Every prompt has question + answer

### Interests
- ✅ **If missing**: Section hidden (no blank space)
- ✅ **If exists**: Shows label + chips

## Spacing System (8pt Grid)

- Content padding: 16px (tokens.spacing.lg)
- Section gaps: 16px (tokens.spacing.md)
- Item gaps: 8-12px (tokens.spacing.sm-md)
- Prompt spacing: 24px (tokens.spacing.lg) between prompts
- Card radius: 24px (tokens.radius.cardPremium)

## Visual Hierarchy

1. **Hero Image** (420px) - Largest visual element
2. **Content Block** - Name/Height/Tags (compact)
3. **Middle Image** (280px) - Secondary visual
4. **Prompts** - Text-heavy, vertical stack
5. **Interests** - Supporting chips

## Responsive Behavior

- Card width: Screen width - 48px (24px padding each side)
- Images: Full-bleed within card boundaries
- Text: Responsive to card width
- Chips: Wrap to multiple rows if needed



