## Goal

Polish the Math ChapterView so it loads cleanly, recovers from "not seeded" by triggering an actual one-click seed, stays guest-safe, and matches the rest of the design system. Most pieces from the previous turn are already in place — this round closes the remaining gaps.

## Current state (verified)

- `useChapterMastery` already gates per-user analytics/evals/mocks behind `authedUserId` and returns `isChapterLoading`, `isChapterMissing`, `isAuthenticated`. ✅
- `/subjects/math/$chapterId` already renders a skeleton only while `isChapterLoading`, an empty state when missing, and a "Sign in to track mastery" badge for guests. ✅
- Firestore rules already make `mathChapters` (+ siblings) public read / admin write, and `mathChapterAnalytics`, `evaluations`, etc. owner-gated. ✅
- `importMathFromSeed()` in `services/math-import.ts` already writes `SSLC_MATH_CHAPTERS` (Arithmetic Progressions, Triangles, Quadratic Equations) plus formulas/questions/etc. into Firestore, gated by Firestore admin rules + `AdminGate`. ✅

## Gaps to fix

1. **One-click seed from the empty state.** Today the "Seed Math data" button only links to `/admin/import`. Wire it to actually call a seeding flow.
2. **Math-only seed helper.** Add `seedMathData()` wrapper in `services/math-import.ts` that calls `importMathFromSeed()` and returns counts — explicit, named entry point matching the brief.
3. **Empty-state UX.** When the user clicks Seed:
   - If not admin-unlocked → route to `/admin/import` (existing AdminGate handles auth).
   - If admin-unlocked → call `seedMathData()` inline, toast success, then `queryClient.invalidateQueries({ queryKey: ["math"] })` so the page re-renders with the seeded chapter.
   - Show inline spinner + disabled state while seeding.
4. **Navigation polish.** Add a small breadcrumb row above the intelligence header: `Dashboard › Math › {chapter.title}` using `<Link>` to `/` and `/subjects/math`. Replaces the standalone "All Math chapters" back button. Keep the existing route path (`/subjects/math`, not `/math` — that route doesn't exist and changing it would touch app structure).
5. **Design-token pass on empty state + guest badge.** Use `border-border/60 bg-card`, `rounded-3xl` container, `text-warning` icon, same type scale as other empty cards (e.g. analytics empty state). Mobile-first: max-w-sm on phone, padded.
6. **`useAllChapterMastery` cleanup.** Drop the now-unused `useCurrentUserId()` call.

## Out of scope

- No new routes, no schema changes, no Firestore rules changes (already correct).
- No redesign of the hub tabs or intelligence header.
- No change to admin import panel itself.

## Files to touch

- `src/integrations/firebase/services/math-import.ts` — export `seedMathData()` wrapper.
- `src/routes/subjects.math.$chapterId.tsx` — wire empty-state Seed button to `seedMathData` mutation + AdminGate fallback; add breadcrumb; tighten empty-state styling.
- `src/hooks/use-math-mastery.ts` — remove unused `useCurrentUserId` import in `useAllChapterMastery`.

## Verification

- Visit `/subjects/math/math_ap` with empty Firestore as guest → see empty state + "Sign in to track mastery" badge + working Back/Seed buttons.
- As admin (unlocked), click "Seed Math data" → toast + page re-renders with chapter content; subsequent reload skips skeleton flash.
- As signed-in non-admin → click routes to `/admin/import`.
- Resize preview to 360px width → header, breadcrumb, empty state and stat grid wrap cleanly.
