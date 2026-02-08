# Prompt: Fix “Outing title not showing on cards / other users” (React Native + Firestore)

You are working in a React Native (Expo) app that uses Firebase Firestore. Users create “Outings” that appear in:

- Discover feed cards (other users)
- Outing details screen (host + other users)
- Host dashboard (“My Active Outings”)
- Search bar in Discover (client-side search filters by `outing.title`)

## Problem statement (what is broken)

The title entered by the host while creating an outing is not reliably appearing:

- The outing card title renders blank (or generic).
- The outing details page shows the type pill (“Outing”) but no title text.
- Other users cannot search by title because the title is missing/empty.

This strongly suggests the Firestore document for the outing sometimes has `title` missing/empty (not just a UI rendering issue).

## Constraints

- Do **not** break existing production data or flows.
- Maintain backward compatibility with any legacy schema where `title` might be absent.
- Ensure new outings always persist a non-empty `title`.
- Ensure existing outings that have *lost* `title` can be restored safely (best-effort) without risky migrations.

## Current data model (target)

Firestore collection:

- `outings/{outingId}`:
  - `title: string` (required for UI + search)
  - other fields (hostId, hostName, coverImageUrl, typeId, vibeMode, dateTime, etc.)

Host indices (already exist and can be used for recovery if the outing doc lost fields):

- `users/{hostId}/activeOutings/{outingId}`: contains `title` and metadata
- `users/{hostId}/hostedOutings/{outingId}`: contains `title` and metadata

## Likely root causes to investigate

1. **Publish path allows empty title**:
   - The “Publish” handler may not enforce step-1 validation (title required) at publish-time.
   - A placeholder fallback like `"Untitled Outing"` may be used, masking a real issue.

2. **Outing document overwritten later**:
   - Some write path (possibly external tooling / Cloud Function / admin update) might overwrite `outings/{outingId}` with a partial object using `set()` without merge, dropping fields like `title`.
   - Even if that overwrite isn’t in the repo, the client should be resilient and able to repair missing title when the host is present.

## What “fixed” looks like (acceptance criteria)

### UI + data

- Any newly created outing always writes `outings/{outingId}.title` as the trimmed user-entered value.
- Outing card shows the correct title for other users.
- Outing details screen shows the correct title.
- Discover search bar can filter by title (client-side).

### Backward compatibility

- If an outing doc is missing `title`, the UI does not render a blank heading; it should show a safe fallback (e.g., `"Outing"`).
- If the current user is the host and the outing doc is missing `title`, the app should attempt a best-effort **backfill**:
  - Read `users/{hostId}/hostedOutings/{outingId}` and `users/{hostId}/activeOutings/{outingId}`
  - If a non-empty title is found, `update` the outing doc to restore `title` (and update `updatedAt`)
  - Update local UI state so the title appears immediately

## Implementation plan (step-by-step)

### Step 1 — Identify all title write paths

Search for Firestore writes to `outings` and confirm `title` is always included on create.

Checklist:

- `CreateOuting` publish handler:
  - Must compute `trimmedTitle = title.trim()`
  - Must **block publish** if `trimmedTitle` is empty
  - Must write `title: trimmedTitle` to:
    - `outings/{outingId}`
    - `users/{hostId}/activeOutings/{outingId}`
    - `users/{hostId}/hostedOutings/{outingId}`

### Step 2 — Add publish-time guard (prevents new bad documents)

In the publish handler:

- If `trimmedTitle` is empty:
  - Show an error message: “Outing title is required.”
  - Navigate user back to Step 1
  - Return early (no Firestore writes)

Do **not** silently write `"Untitled Outing"` for production data quality; it breaks search and user trust.

### Step 3 — Add UI fallbacks (prevents blank UI)

Where the title is displayed:

- In `OutingCard`: render `outing.title?.trim() || "Outing"`
- In `OutingDetailsScreen`: render `outing.title?.trim() || "Outing"`
- In share text: use `outing.title?.trim() || "this outing"`

This ensures the UI never renders blank when legacy data is missing.

### Step 4 — Add host-only title backfill (repairs existing broken docs safely)

Create a small utility:

- `backfillOutingTitleForHost({ outingId, hostId, currentTitle })`

Behavior:

- If `currentTitle` is already non-empty → do nothing.
- Else:
  - Read:
    - `users/{hostId}/hostedOutings/{outingId}`
    - `users/{hostId}/activeOutings/{outingId}`
  - Extract `title`, trim it, and if non-empty:
    - `updateDoc(outings/{outingId}, { title, updatedAt: serverTimestamp() })`
  - Log success/failure (non-fatal)

Integrate backfill in host-facing entry points:

- `OutingDetailsScreen` after loading outing:
  - If `user.id === outing.hostId` and `outing.title` is empty → run backfill and update local state.
- `HostDashboardScreen` after loading host outings:
  - For each outing with missing title → run backfill (best-effort) and update local state array.

Important:

- Only attempt backfill when the viewer is the **host** to avoid security rule issues.
- Use `updateDoc` (never `setDoc` without merge) so you don’t wipe other fields.

### Step 5 — Verify behavior (manual)

Create a new outing with a title like:

- `“House party at Bandra”`

Verify:

- Outing doc in Firestore has `title` set correctly.
- Discover feed shows the title.
- Outing details shows the title.
- Search bar filtering by “Bandra” returns the outing.

Backfill verification:

- Temporarily remove `title` from an existing outing doc (in a test environment).
- Open HostDashboard (as the host) and confirm:
  - Title gets restored on the outing doc.
  - Title appears in UI after refresh.

## Implementation notes / guardrails

- Keep changes minimal and local to:
  - `src/screens/CreateOutingScreen.tsx`
  - `src/screens/OutingDetailsScreen.tsx`
  - `src/screens/HostDashboardScreen.tsx`
  - `src/components/OutingCard.tsx`
  - `src/utils/outingTitleBackfill.ts` (new helper)
- Avoid schema migrations that touch many documents at once.
- Prefer best-effort repair on host sessions.
- Don’t add breaking changes to Firestore rules unless absolutely required.

