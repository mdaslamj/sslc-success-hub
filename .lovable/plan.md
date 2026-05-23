# Aura mobile production fix plan

## What I’ll fix

1. **Planner mobile breakage**
   - Remove the remaining unsafe width/overflow points in the planner header, task rows, add-task form, calendar controls, and focus timer.
   - Tighten the mobile app shell header so the title, notification button, and sign-in/profile controls cannot overlap or clip on narrow screens.
   - Verify no horizontal overflow remains on planner and dashboard-adjacent mobile routes.

2. **Chapter test flow that doesn’t reliably function**
   - Replace the hardcoded `/chapter-test` page behavior with a route-safe chapter test flow that uses the actual selected chapter/test data rather than always loading one fixed chapter.
   - Ensure chapter tests open from the existing quiz/test entry points, render questions consistently, and expose clear back/retry paths without dead ends.
   - Keep it lightweight and local-only.

3. **Maps interaction flow on mobile**
   - Fix remaining mobile issues in the Social Science maps dialog and chapter detail view: viewport-safe modal sizing, scroll containment, tap targets, and any clipped content.
   - Check the chapter picker/detail panes for narrow-screen usability so the user can open a map, read the explanation, practice related questions, and exit cleanly.

4. **Stability cleanup tied to these screens only**
   - Remove duplicate or stale logic uncovered in these flows.
   - Clean any console/runtime issues surfaced by the audited planner, chapter test, and maps paths.
   - Update `docs/dev-status.md` with the concrete production fixes and verification notes.

## Verification after implementation

- Planner fully aligned on mobile
- No clipped UI or hidden controls in planner header/actions
- No horizontal overflow on audited screens
- Chapter test opens and questions render correctly
- Maps flow opens, scrolls, practices, and closes correctly on mobile
- No dead-end navigation on the audited flows
- No console/runtime errors on the fixed paths

## Technical notes

- I’ll keep this as a **surgical frontend pass** only: no redesigns, no new dependencies, no architecture rewrite.
- Main files likely affected:
  - `src/components/dashboard-layout.tsx`
  - `src/routes/planner.tsx`
  - `src/components/planner/planner-calendar.tsx`
  - `src/routes/chapter-test.tsx` and/or `src/pages/ChapterTest.tsx`
  - `src/routes/quizzes.tsx` if the chapter-test entry path needs correcting
  - `src/routes/subjects.$subjectId.tsx`
  - `docs/dev-status.md`

```text
Audit actual mobile breakpoints
-> patch layout/flow bugs only
-> verify route + interaction paths
-> document shipped fixes
```