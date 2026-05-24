## Status: 2 of 3 fixes already shipped — 1 small follow-up left

Both Fix 1 and Fix 2 from this scope landed in the earlier turn:

- **Fix 1 — single-click chapter test launch** ✅ `src/routes/quizzes.tsx` L201–215 — `StartChapterTestButton` now calls `ensureId()` and `navigate(...)` in one `onClick`.
- **Fix 2 — quiz rebuild fallback** ✅ `src/routes/quiz.$quizId.tsx` L36–64 — recovery chain mirrors `exams.$examId.tsx`: cache → `rebuildContentQuizById` → wait while catalogue loads → `missing`.

Only one piece is genuinely missing: an explicit "rebuilding from content" indicator. Today the rebuild path falls into the same generic skeleton + "Preparing your quiz…" copy as the initial load, which is correct (no blank/dead screen) but doesn't visually distinguish a rebuild from a first load.

### Planned change — single file, presentation only

`src/routes/quiz.$quizId.tsx`:

- Track a `rebuilding` boolean alongside `quiz` / `missing`: set true when cache misses **and** `content.isLoading` is true (i.e. we're waiting on the catalogue to attempt a rebuild). Set false in every other branch.
- In the existing `if (!quiz)` skeleton block, swap the helper text:
  - `rebuilding === true` → "Restoring your quiz from chapter content…"
  - otherwise → existing "Preparing your quiz…"
- Reuse the existing skeleton markup, spacing, and classes — no layout, no new components, no design tokens.

### Explicitly NOT touched

Planner, onboarding, analytics, gamification, question-bank loaders, exam generators, styling tokens, shared components.

### Verification after build

- Single-click "Start" on `/quizzes` → `/quiz/$quizId` lands directly on Q1.
- `/exams/mock_math_blueprint` (current route) still launches with timer.
- Hard-refresh on `/quiz/ct_math_<chapter>_board` → skeleton with "Restoring…" copy, then quiz renders (no dead-end screen).
- Console clean on all three routes.

Approve to switch to build mode.
