# Profile Card Data Wiring - Real User Data Only

## Data Source

### Prompts Data Flow
1. **Onboarding**: User selects 2-3 prompts and provides answers during `PromptsScreen`
2. **Storage**: Saved to Firestore `users/{uid}` document under `prompts` field
3. **Retrieval**: Loaded from Firestore when viewing profile
4. **Display**: Only real prompts from user's profile are shown

### Data Structure
```typescript
type ProfilePrompt = {
  id: string;        // Prompt ID (e.g., "core_1", "social_3")
  category: string;  // Category (e.g., "core", "social", "depth")
  question: string;  // Question text
  answer: string;    // User's answer (120-200 chars recommended)
};

type Profile = {
  // ... other fields ...
  prompts?: ProfilePrompt[]; // 2-3 prompts with answers
};
```

## Component Logic

### Prompt Filtering
```typescript
// Only use real user data - no fallbacks
const validPrompts = (prompts || []).filter(
  (p) => p && p.question && p.answer && p.answer.trim().length > 0
);
```

### Conditional Rendering
```typescript
// Only show prompts section if user has real prompts
{validPrompts.length > 0 && (
  <View style={styles.promptsSection}>
    {validPrompts.map((prompt, idx) => (
      <View key={prompt.id || `qa_${idx}`} style={styles.promptItem}>
        <Text style={styles.promptQuestion}>{prompt.question}</Text>
        <Text style={styles.promptAnswer}>{prompt.answer}</Text>
      </View>
    ))}
  </View>
)}
```

## Removed Features

### ❌ Removed Fallback Logic
- ❌ `ensureQAPairs()` function - removed
- ❌ `generateAnswer()` function - removed
- ❌ `allPrompts` import - removed
- ❌ Default question generation - removed
- ❌ Answer generation from bio/tags/interests - removed

### ✅ Current Behavior
- ✅ Only displays prompts from user's profile data
- ✅ Hides prompts section entirely if no prompts exist
- ✅ No placeholder text or dummy data
- ✅ No fallback generation

## Edge Cases Handled

### No Prompts
- **Behavior**: Prompts section is completely hidden
- **No blank space**: Section doesn't render at all
- **No placeholder**: No "No prompts yet" text

### Empty Prompts Array
- **Behavior**: Treated as no prompts (section hidden)
- **Filter**: Empty arrays filtered out

### Invalid Prompts
- **Missing question**: Filtered out
- **Missing answer**: Filtered out
- **Empty answer**: Filtered out (trimmed length check)

### Partial Prompts
- **Behavior**: Only valid prompts are shown
- **Example**: If user has 2 valid prompts, only those 2 are displayed
- **No minimum**: No requirement for minimum 3 prompts

## Data Validation

### On Profile Load
```typescript
// In PeopleScreen or wherever profile is loaded
const prompts = user.prompts || [];
// Passed directly to ProfileCard - no modification
```

### In ProfileCard
```typescript
// Filter for valid prompts only
const validPrompts = (prompts || []).filter(
  (p) => p && p.question && p.answer && p.answer.trim().length > 0
);

// Only render if valid prompts exist
{validPrompts.length > 0 && (
  // Render prompts section
)}
```

## Backward Compatibility

### Users Without Prompts
- **Old users**: May not have `prompts` field
- **Behavior**: Prompts section hidden (no error)
- **No breaking**: Component handles undefined/null gracefully

### Legacy Data
- **Empty arrays**: Handled as no prompts
- **Null/undefined**: Handled as no prompts
- **Invalid structure**: Filtered out safely

## Testing Scenarios

1. **User with 3 prompts**: All 3 display correctly
2. **User with 2 prompts**: Both display correctly
3. **User with 1 prompt**: Single prompt displays
4. **User with 0 prompts**: Section hidden completely
5. **User with null prompts**: Section hidden
6. **User with invalid prompts**: Only valid ones display
7. **User with empty answer**: Prompt filtered out



