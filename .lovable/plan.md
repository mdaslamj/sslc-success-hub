# Mathematics: One Connected Learning System

Goal: turn the scattered Math pieces (chapters, textbooks, formulas, PYQs, mock tests, OCR evaluation, analytics) into a single chapter-centric workflow. No structural redesign — reuse existing routes, stores, and Firestore collections.

## What the user will see

A new **Math Chapter Hub** page at `/subjects/math/$chapterId` with 5 tabs, matching the existing minimal mobile-friendly style:

```text
[ Learn ] [ Practice ] [ Test ] [ Evaluate ] [ Improve ]
```

- **Learn** — KTBS + NCERT textbook links (from `library_resources`, filtered by `chapterId`), formula sheet for the chapter, key concepts.
- **Practice** — PYQs and MCQs for the chapter (from `math_questions` + existing MCQ bank), with one-tap "Add to today's plan".
- **Test** — Launch a chapter-scoped mock test built via existing `mock-test-builder.ts`.
- **Evaluate** — Upload handwritten answers → existing OCR + rubric grader pipeline; shows last evaluation.
- **Improve** — Real weak/strong concepts, formula accuracy, speed index, recommended next actions (from `math_chapter_analytics` + `revision-recommender.ts`).

Header strip on every tab shows live **chapter intelligence**:

```text
Mastery 62%   Board freq ★★★★☆   Difficulty Medium   Predicted weight 8 marks
```

The existing `/subjects/math` chapter list gets a small upgrade: each chapter row shows mastery %, predicted weightage, and a weak-concept dot if detected. Clicking a chapter goes to the new hub.

## Chapter intelligence

Read from `math_chapters` doc (`boardFrequency`, `difficulty`, `predictedWeightage` already in schema) + computed `mastery` from `math_chapter_analytics`. No new collections.

## Real analytics (replaces placeholders)

A new pure helper `src/lib/math-intelligence/mastery-aggregator.ts` computes per-chapter mastery as a weighted blend of signals already in the DB:

- 40% `math_chapter_analytics.mastery` (quiz + MCQ attempts via `applyAttempt`)
- 25% mock-exam chapter score (from existing `mock_exam_attempts`, filtered by `chapterId` tags on questions)
- 25% OCR evaluation average (from `answer_uploads` / `evaluations` joined by `chapterId`)
- 10% formula accuracy from `formulaAccuracy` map

Output: `{ mastery, breakdown, weakConcepts, strongConcepts, lastUpdated }`. Same shape used by the Improve tab, the chapter list, and the prediction engine.

## Prediction engine hookup

`/predictions` route already exists. Feed it the aggregator output so per-chapter predicted-weightage × (1 − mastery) drives the "focus next" ranking. No UI rewrite — just swap the data source from mock to aggregator.

## Mastery progression

Add 5 named tiers derived from mastery %: Novice (0–20) · Learner (20–40) · Practitioner (40–60) · Proficient (60–80) · Mastered (80–100). Rendered as a thin progress bar + label in the chapter hub header and chapter list. Pure presentational helper in `src/lib/math-intelligence/mastery-tiers.ts`.

## Files

New
- `src/routes/subjects.math.$chapterId.tsx` — the 5-tab hub
- `src/lib/math-intelligence/mastery-aggregator.ts`
- `src/lib/math-intelligence/mastery-tiers.ts`
- `src/hooks/use-math-mastery.ts` — react-query wrapper around the aggregator

Edited
- `src/routes/subjects.$subjectId.tsx` — math-specific row enrichments (mastery %, weak dot, tier badge) when `subjectId === "math"`; route to the new hub on click
- `src/routes/predictions.tsx` — swap mock ranking for aggregator-driven ranking (math only)
- `src/integrations/firebase/services/index.ts` — export aggregator query if needed

Untouched
- Firestore schema, auth, sidebar, planner, textbooks page, all non-math subjects.

## Out of scope

- New collections or migrations
- Redesigning the global sidebar or dashboard
- Non-math subjects (same patterns can be applied later)
- AI tutor chat UI (existing tutor-context helper is wired into the Improve tab's "Ask AI" button but no new chat surface is built)
