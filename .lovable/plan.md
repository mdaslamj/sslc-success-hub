## Scope

Surgical reliability fixes for chapter-test + mock-exam launch flows. No redesigns, no logic changes outside navigation/recovery. Four files touched.

---

## 1. `src/routes/quizzes.tsx` — single-click chapter test launch

Current `StartChapterTestButton` already calls `ensureId()` + `navigate()` in one handler, but the perceived two-click bug comes from two real edge cases:

- When the content catalog is still loading for the active subject, `chapters` is `[]` so the button never renders — but for chapters whose JSON loads after first paint, the row renders with stale closure. Click → `ensureChapterQuizId` runs against the live chapter but the navigate fires before `cacheQuiz` flushes synchronously, and on slow mobile the route mounts before localStorage is visible to the next read.
- Button is rendered inside the card; without `type="button"` and `e.preventDefault()` it can interact with parent click handlers in some layouts.

Changes:
- Add `type="button"` to `StartChapterTestButton`.
- Inline the build+cache+navigate flow so it runs in a single synchronous handler with one localStorage write, then navigate. Add a brief `isLaunching` state to disable the button after click (prevents double-tap creating two attempts on slow mobile).
- Add a console log: `console.debug("[quizzes] launch", { quizId, chapterId, level })`.
- Disable the Start button (with subtle "Loading…" label) while `catalog.isLoading` is true for that subject row.

No styling changes — reuse existing `Button` variant.

## 2. `src/routes/quiz.$quizId.tsx` — verify rebuild fallback + instrument

Rebuild fallback already exists (lines 43–71). Only additions:
- Console instrumentation: log `[quiz] cache-hit`, `[quiz] rebuild-hit`, `[quiz] waiting-catalog`, `[quiz] missing` at the matching branches.
- The existing skeleton loader already covers the rebuilding state; tweak the helper text to read "Restoring quiz…" consistently when `rebuilding || content.isLoading`.

No structural changes.

## 3. `src/routes/exams.tsx` — Start Exam button pending state

`ExamCard` currently wraps `<Button>` in `<Link>` with `onClick={cacheExam}`. On slow devices the user sees no feedback between tap and route mount.

Changes:
- Convert the card CTA from `<Link><Button/></Link>` to a controlled `<Button>` that:
  1. sets local `isPreparing = true`
  2. calls `cacheExam(exam)`
  3. logs `console.debug("[exams] launch", { examId: exam.id, kind: exam.kind })`
  4. `navigate({ to: "/exams/$examId", params: { examId: exam.id } })`
- While `isPreparing`, render `<Loader2 className="animate-spin" /> Preparing…` and `disabled`.
- Preserve the card layout, full-width rounded button, spacing, and existing classes exactly.

Filters, hero card, recent attempts list — untouched.

## 4. `src/routes/exams.$examId.tsx` — loading skeleton + instrumentation

Current "Loading exam…" fallback is a bare card. Replace with a small skeleton (header bar + 4 option rows) using the existing `Skeleton` primitive when `!exam && !missing`. Keep layout identical to player to avoid layout shift on resolve.

Console instrumentation in the resolve effect:
- `[exam] cache-hit` when `readCachedExam` hits
- `[exam] rebuild-hit` when `rebuildContentExamById` succeeds
- `[exam] seed-hit` for `SEED_MOCK_EXAMS`
- `[exam] waiting-catalog` when deferring
- `[exam] remote-hit` / `[exam] missing` for the final fetch branch

No changes to player, timer, navigator, or submit dialog.

---

## Explicit non-goals

- No edits to planner, onboarding, analytics, gamification, styling tokens, exam grading logic, question-bank architecture, or `useMockExam` / `useQuiz` hooks.
- No new files, no dependency changes.
- `src/routeTree.gen.ts` is auto-generated — not touched.

## Verification checklist

- `Start` on `/quizzes` navigates to `/quiz/$quizId` on the first click (desktop + mobile viewport 798×611).
- Hard refresh on `/quiz/$quizId` for a chapter-test id rebuilds and renders the player.
- Hard refresh on `/exams/$examId` for a content-built id rebuilds; skeleton visible during rebuild.
- `Start exam` on `/exams` shows "Preparing…" then navigates.
- Console shows the new `[quizzes] / [quiz] / [exams] / [exam]` debug lines at expected branches.
- No layout shift on cards, no new console errors, build passes.
