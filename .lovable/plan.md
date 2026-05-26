## Build failure — root cause

The preview 404 (`Worker bundle not found: dwl:pre:…:12601537:_worker_bundle.json`) is downstream of a failed Worker build. `bunx tsc --noEmit` reports ~120 compile errors all stemming from three breakages:

### 1. `src/hooks/use-analytics.ts` was rewritten (PRIMARY CAUSE)

The file now exports a new `AnalyticsEngine` shape:

```
{ data, recordAttempt, getChapterStats, getSubjectStats, getWeakChapters, clearData }
```

But ~10 consumers still import `useAnalytics()` expecting the previous snapshot shape with these fields/methods:

`userId`, `loading`, `streak`, `recentSessions`, `weekly`, `bySubject`, `todayMinutes`, `overallProgress`, `completedChapters`, `totalChapters`, `totalStudyHours`, `totalStudyMinutes`, `focusSessions`, `consistency`, `logSession()`, `refresh()`.

Affected files (all failing typecheck):

- `src/components/revision-planner-card.tsx`
- `src/hooks/use-achievements.ts`
- `src/hooks/use-gamification.ts`
- `src/hooks/use-planner.ts`
- `src/hooks/use-recommendations.ts`
- `src/routes/achievements.tsx`
- `src/routes/analytics.tsx`
- `src/routes/focus.tsx`
- `src/routes/log.tsx`
- `src/routes/planner.tsx`
- `src/routes/profile.tsx`

### 2. `src/lib/mockExamGenerator.ts` — missing exports

Imports that don't exist on `./question-bank`:

```
getQuestionBank, normalizeSubject, BankQuestion, SubjectKey
```

Plus several implicit-`any` parameters inside the file.

### 3. `src/components/practice/PracticePage.tsx:124`

Prop callback typed as `(score, total: number) => void` is being passed `(score, results: QuestionResult[]) => void`.

---

## Fix plan (surgical, restore the build)

**Step 1 — Restore the legacy `useAnalytics` snapshot shape.**

Rewrite `src/hooks/use-analytics.ts` to additionally expose all fields the rest of the codebase depends on, while keeping the new `data` / `recordAttempt` / `getChapterStats` / `getSubjectStats` / `getWeakChapters` / `clearData` API so the new analytics-tracking call sites also keep compiling.

Concretely, the returned object becomes a superset:

- Keep: `data, recordAttempt, getChapterStats, getSubjectStats, getWeakChapters, clearData`
- Add back (derived from sessions in `aura_sessions_v1` localStorage + the new `data.attempts`):
  - `userId` (from `useCurrentUserId`)
  - `loading: boolean`
  - `streak: { current: number; longest: number }`
  - `recentSessions: SessionDoc[]`
  - `weekly: Array<{ day: string; minutes: number }>` (last 7 days)
  - `bySubject: Array<{ subjectId: string; minutes: number; sessions: number }>`
  - `todayMinutes: number`
  - `overallProgress: number` (0–100)
  - `completedChapters: number`, `totalChapters: number`
  - `totalStudyHours: number`, `totalStudyMinutes: number`
  - `focusSessions: number`
  - `consistency: number` (0–100)
  - `logSession(session)` — append to session store + refresh
  - `refresh()` — bump internal tick

Source the legacy fields from the existing `src/integrations/firebase/services/analytics.ts` helpers (`toDayKey`, session aggregation) and `src/lib/mock-data.ts` (subjects/total chapters), matching how `use-recommendations.ts` and `use-planner.ts` already consume them. This avoids touching the 11 consumer files.

**Step 2 — Fix `src/lib/mockExamGenerator.ts` imports.**

Inspect `src/lib/question-bank.ts` to find the actual export names and types, then update the imports + parameter type annotations in `mockExamGenerator.ts` accordingly (no behavior change). Add explicit types on the implicit-`any` lambdas.

**Step 3 — Fix `src/components/practice/PracticePage.tsx:124`.**

Either widen the prop type on the receiving component to accept `(score: number, results: QuestionResult[]) => void`, or adapt the handler at the call site to match the current prop signature — whichever requires the smaller diff once the file is read.

**Step 4 — Verify.**

Re-run `bunx tsc --noEmit` until clean, then the Worker build will succeed and the preview SHA will resolve instead of returning 404.

---

## Out of scope

- No redesigns, no route changes, no analytics-feature changes beyond restoring the hook surface.
- No edits to `routeTree.gen.ts` or Supabase clients.
- No publish/visibility changes — once the build is green, republish will hydrate the preview bundle.
