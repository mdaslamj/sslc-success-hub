# Fix `/subjects/math/$chapterId` stuck on Loading

## Root cause

`MathChapterHub` renders the skeleton whenever `chapter` or `mastery` is missing, with no branch for "chapter doc not found" or "query errored". On the live preview:

- `fetchMathChapter("m1")` returns `null` because the Math intelligence collections have never been seeded in Firestore. Result: `chapter === null` → infinite skeleton.
- The guest viewer is not signed in, so `useCurrentUserId()` returns a local id. The analytics query is enabled, Firestore rules reject it (`mathChapterAnalytics` requires `isSignedIn()`), the query goes to `isError`, but the loading guard ignores errors.

## Changes

### 1. `src/hooks/use-math-mastery.ts`
- Only enable the per-user queries (analytics, evaluations, mock results) when the user is actually authenticated (use `useAuthOptional().user?.uid` directly instead of the local-fallback id). This stops `permission-denied` spam on the guest path.
- Expose a separate `isChapterLoading` (just the chapter doc) alongside `isLoading`, and an `isChapterMissing` flag (`chapterQ.isSuccess && chapterQ.data == null`).
- Still build `mastery` from whatever signals are available; for guests it just collapses to a zero-signal baseline instead of `null`.

### 2. `src/routes/subjects.math.$chapterId.tsx`
- Replace the single `if (isLoading || !chapter || !mastery)` branch with three explicit states:
  - **Loading** — only while the chapter doc is still fetching.
  - **Not found** — when `isChapterMissing` is true: render a friendly empty state with a "Seed Math data" hint linking to `/admin/import` and a Back to Math button. (Reuse the existing `notFoundComponent` markup.)
  - **Loaded** — render the hub. Mastery is always non-null now.
- Keep `errorComponent` for hard failures; surface analytics errors inline in the Improve tab instead of blocking the page.

### 3. (Optional, same file) Sign-in nudge
- In the intelligence header, if the viewer is anonymous, show a small "Sign in to track mastery" badge instead of zeroed stats. No new routes.

## Out of scope
- No schema or rules changes.
- No new data — admin still seeds via the existing `/admin/import` panel.
- No changes to other subjects or to the Math chapter list page.

## Verification
- Visit `/subjects/math/m1` as a guest with empty Firestore → "Chapter not found" empty state appears (no infinite skeleton).
- Seed math via `/admin/import` → page renders with real chapter + zero-signal mastery for guests.
- Sign in → analytics query runs, mastery reflects real signals.
