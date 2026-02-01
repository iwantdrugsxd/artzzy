# Profile Card Example Content (Updated Layout)

## Content Block Examples

### Example 1: With Height
**Name + Age:** "Sarah, 28"
**Height:** "5'8""
**Tags:** [High Energy] [Rooftop Vibes] [Deep Conversations]

### Example 2: Without Height
**Name + Age:** "Alex, 25"
**Height:** (hidden - no blank space)
**Tags:** [Chill Vibes] [Coffee Lover] [Night Owl]

### Example 3: With Height (Metric)
**Name + Age:** "Priya, 26"
**Height:** "170 cm"
**Tags:** [Social Butterfly] [Music First] [Adventure Seeker]

## Prompts Section Examples (Vertical Stack)

### Prompt 1
**Question:** "THE VIBE I BRING TO A GROUP IS…"
**Answer:** "I'm the friend who curates rooftop sunsets and insists on a late-night chai. I bring warmth, authenticity, and a knack for making everyone feel included. Expect good music, better conversations, and memories that stick."

### Prompt 2
**Question:** "A NIGHT OUT WITH ME USUALLY ENDS WITH…"
**Answer:** "Deep conversations at 3am, finding a new favorite spot, or making plans for next weekend. I'm all about extending the moment and creating connections that last beyond the night."

### Prompt 3
**Question:** "MY PEOPLE WOULD DESCRIBE ME AS…"
**Answer:** "The listener and advice giver, the planner who somehow makes everything feel spontaneous, and the friend who always knows the best spots. I'm equal parts thoughtful and adventurous."

## Complete Profile Example

### Top Image
- Full-bleed hero image with scrim
- "ACTIVE NOW" pill (left)
- "78% MATCH" pill (right)

### Content Block
```
Sarah, 28
5'8"
[High Energy] [Rooftop Vibes] [Deep Conversations]
```

### Middle Image
- Second photo, full-bleed, 280px height

### Prompts (Vertical Stack)
```
THE VIBE I BRING TO A GROUP IS…
I'm the friend who curates rooftop sunsets and insists on a late-night chai. I bring warmth, authenticity, and a knack for making everyone feel included.

A NIGHT OUT WITH ME USUALLY ENDS WITH…
Deep conversations at 3am, finding a new favorite spot, or making plans for next weekend. I'm all about extending the moment.

MY PEOPLE WOULD DESCRIBE ME AS…
The listener and advice giver, the planner who somehow makes everything feel spontaneous, and the friend who always knows the best spots.
```

### Interests
```
INTERESTS
[Techno] [Photography] [Rooftops] [Coffee] [Art Galleries] [Travel]
```

## Fallback Examples

### When Prompts Are Missing
The system generates 3 prompts from bio/tags/interests:

**Generated Prompt 1:**
**Question:** "THE VIBE I BRING TO A GROUP IS…"
**Answer:** (Generated from tags: "High Energy") → "High-energy nights with great music and even better people. I'm the one keeping the dance floor alive and making sure everyone's having a good time."

**Generated Prompt 2:**
**Question:** "I'M THE FRIEND WHO ALWAYS…"
**Answer:** (Generated from interests: "Photography") → "I'm the friend who always brings photography to the table and makes sure everyone feels included. I value authentic connections and meaningful moments."

**Generated Prompt 3:**
**Question:** "THE QUICKEST WAY TO GET ME TALKING IS…"
**Answer:** (Generated from interests: "Techno", "Travel") → "Ask me about Techno, Travel, or the best spots in the city. I light up when conversations go beyond surface level."

## Layout Notes

- **Height**: Only displays if data exists (no blank lines)
- **Middle Image**: Only displays if second photo exists (graceful collapse)
- **Prompts**: Always 3+ prompts, vertical stack (one after another)
- **Interests**: Only displays if interests exist



