# Premium Profile Card Design System

## Typography Map

### Hero & Identity
- **Name + Age**: 
  - Font: System Bold (San Francisco / Roboto)
  - Size: 28px
  - Line Height: 34px
  - Weight: 700 (Bold)
  - Letter Spacing: -0.5px
  - Color: `text.primary` (#F5F5F5)

- **Location**:
  - Font: System Regular
  - Size: 13px
  - Line Height: 18px
  - Weight: 400
  - Color: `text.muted` (rgba(245,245,245,0.52))

### Content Typography

- **Headline** (One-line personal statement):
  - Font: System Semibold
  - Size: 16px
  - Line Height: 22px
  - Weight: 600
  - Color: `text.primary`

- **Paragraph** (First-person bio):
  - Font: System Regular
  - Size: 14px
  - Line Height: 22px
  - Weight: 400
  - Color: `text.secondary` (rgba(245,245,245,0.72))

### Section Labels
- **Section Labels** (INTERESTS, etc.):
  - Font: System Semibold
  - Size: 10px
  - Line Height: 14px
  - Weight: 600
  - Letter Spacing: 1.2px
  - Text Transform: Uppercase
  - Color: `text.subtle` (rgba(245,245,245,0.38))

### Q/A Typography (Editorial Style)

- **Questions**:
  - Font: System Semibold (Ideally: Serif/Display font like Playfair Display or similar)
  - Size: 11px
  - Line Height: 16px
  - Weight: 600
  - Letter Spacing: 1.5px
  - Text Transform: Uppercase
  - Color: `text.muted`
  - Style: Editorial, elegant, slightly letter-spaced

- **Answers**:
  - Font: System Regular (Humanist sans-serif)
  - Size: 14px
  - Line Height: 22px
  - Weight: 400
  - Color: `text.primary`
  - Style: Clean, readable, conversational

### Chip & Badge Typography

- **Vibe Chips** (Known for):
  - Font: System Bold
  - Size: 11px
  - Line Height: 14px
  - Weight: 700
  - Color: `text.primary`

- **Pill Text** (ACTIVE NOW, MATCH %):
  - Font: System Bold
  - Size: 10px
  - Line Height: 14px
  - Weight: 700
  - Letter Spacing: 0.6-0.8px
  - Color: `text.primary`

- **Social Style Card**:
  - Title: System Semibold, 20px, Weight 600
  - Description: System Regular, 14px, Weight 400
  - Match Badge: System Bold, 9px, Weight 700

## Color & Elevation Tokens

### Glass Effects
```typescript
overlay.glassLight: "rgba(255,255,255,0.05)"  // Subtle glass
overlay.glassMedium: "rgba(255,255,255,0.08)" // Medium glass
overlay.glassStrong: "rgba(255,255,255,0.12)" // Strong glass
overlay.scrim: "rgba(0,0,0,0.3)"              // Hero scrim start
overlay.scrimStrong: "rgba(0,0,0,0.6)"        // Hero scrim end
```

### Glow Effects
```typescript
primary.glowSoft: "rgba(255,45,45,0.2)"   // Soft chip glow
primary.glow: "rgba(255,45,45,0.4)"       // Medium glow
primary.glowStrong: "rgba(255,45,45,0.6)" // Strong glow
success.glow: "rgba(74,222,128,0.4)"      // Active indicator glow
```

### Shadow Tokens
```typescript
shadows.glow.soft: {
  shadowColor: "#FF2D2D",
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4
}

shadows.glow.medium: {
  shadowColor: "#FF2D2D",
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 6
}

shadows.glass: {
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4
}
```

### Radius Tokens
```typescript
radius.cardPremium: 24  // Premium cards (18-24px range)
```

## Example Content

### Headline Examples
1. "Here for authentic connections and spontaneous rooftop sunsets"
2. "Building meaningful friendships, one deep conversation at a time"
3. "Seeking genuine connections in this city—coffee, conversations, and good vibes"
4. "I'm the friend who curates rooftop sunsets and insists on a late-night chai"
5. "Passionate about creating memorable experiences with people who get it"

### Paragraph Examples (First-Person)

**Example 1:**
"I'm passionate about creating memorable experiences and connecting with people who share similar values. Whether it's exploring new spots in the city or deep conversations over coffee, I'm always up for authentic moments. I believe the best connections happen when you're genuinely yourself."

**Example 2:**
"I'm the friend who curates rooftop sunsets and insists on a late-night chai. I value quality over quantity—in friendships, conversations, and experiences. When I'm not exploring the city's hidden gems, you'll find me at a cozy café with a good book or planning the next spontaneous adventure."

**Example 3:**
"I'm here for the real talk and the real vibes. I believe in showing up authentically and creating spaces where people feel seen and heard. Whether it's a house party or a quiet coffee date, I'm all about meaningful connections and good energy."

### Q/A Pair Examples

**Q/A Pair 1:**
- **Question:** "THE VIBE I BRING TO A GROUP IS…"
- **Answer:** "I'm the friend who curates rooftop sunsets and insists on a late-night chai. I bring warmth, authenticity, and a knack for making everyone feel included. Expect good music, better conversations, and memories that stick."

**Q/A Pair 2:**
- **Question:** "A NIGHT OUT WITH ME USUALLY ENDS WITH…"
- **Answer:** "Deep conversations at 3am, finding a new favorite spot, or making plans for next weekend. I'm all about extending the moment and creating connections that last beyond the night."

**Q/A Pair 3:**
- **Question:** "MY PEOPLE WOULD DESCRIBE ME AS…"
- **Answer:** "The listener and advice giver, the planner who somehow makes everything feel spontaneous, and the friend who always knows the best spots. I'm equal parts thoughtful and adventurous."

**Q/A Pair 4:**
- **Question:** "THE QUICKEST WAY TO GET ME TALKING IS…"
- **Answer:** "Ask me about my latest travel adventure, a book that changed my perspective, or the best rooftop spot I've discovered. I light up when conversations go beyond surface level."

**Q/A Pair 5:**
- **Question:** "MY IDEAL PARTY LOOKS LIKE…"
- **Answer:** "Intimate house party with good music, great people, and conversations that flow naturally. I prefer quality connections over crowded spaces—give me a rooftop, good vibes, and people who are genuinely present."

## Design Principles

1. **Cinematic Hero**: Full-bleed image with subtle scrim gradient (black to transparent) for depth
2. **Glassy Panels**: Semi-transparent backgrounds with subtle borders for premium feel
3. **Soft Neon Glow**: Red accent glows on chips and badges for intimacy and warmth
4. **Editorial Typography**: Questions use uppercase, letter-spaced styling; answers are clean and readable
5. **8pt Grid System**: All spacing follows 8pt multiples (4, 8, 12, 16, 24, 32px)
6. **Rounded Corners**: 18-24px radius for premium, modern feel
7. **Dark Background**: Pure black (#000000) base with subtle surface elevations
8. **Red Accent**: Maintains existing #FF2D2D primary color throughout

## Layout Structure

1. **Hero Image** (420px height)
   - Full-bleed with scrim gradient
   - Two floating pills (ACTIVE NOW, MATCH %)

2. **Content Section** (padding: 16px)
   - Name + Age (28px, bold)
   - Location (13px, muted)
   - Headline (16px, semibold)
   - Paragraph (14px, regular)
   - Known for chips (2-3 with glow)
   - Social Style card (glass panel)
   - Interests section (label + 4-6 chips)
   - Q/A section (editorial style, 2-column grid)
   - Photo grid (2-column, rounded thumbnails)

## Spacing System

- **Section Gap**: 16px (tokens.spacing.lg)
- **Item Gap**: 8-12px (tokens.spacing.sm-md)
- **Content Padding**: 16px (tokens.spacing.lg)
- **Card Radius**: 24px (tokens.radius.cardPremium)
- **Hero Height**: 420px
- **Photo Grid Gap**: 8px



