
## Goal

In `src/routes/subjects.$subjectId.tsx` (Math subject page), make the **Chapters, Resources, Formulas, Topics, and Practice MCQs** tabs render entirely from the uploaded JSON in `public/content/`. Keep all current UI (markup, classes, spacing, colors, layout, tab order) byte-for-byte equivalent — only the data layer changes.

## Files

### New
- `src/lib/normalizeChapterData.ts` — single adapter consumed by every tab.

### Edited
- `src/routes/subjects.$subjectId.tsx` — swap mock/firebase data sources for normalized JSON.

### Untouched
- `src/lib/contentLoader.ts` (already correct: `loadManifest`, `loadChapter`).
- `src/routes/subjects.math.$chapterId.tsx` (separate hub, out of scope).
- All UI components (`Tabs`, `Badge`, `Progress`, `ContentResourcesGrid`, `FormulasSection`, `ChapterContentOverview`, `ManifestChaptersGrid`, `TopicsSection`, `PracticeQuiz`, `DifficultyBadge`).

## `normalizeChapterData()` shape

```ts
export type NormalizedChapter = {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  difficulty: "easy" | "medium" | "hard";
  learningPoints: string[];
  formulas: ContentFormula[];   // ?? []
  resources: ContentResource[]; // ?? []
  mcqs: ContentMCQ[];           // ?? []
  exercises: ContentExercise[]; // ?? []
  mcqCount: number;             // mcqs.length or raw.mcqCount ?? 0
  exerciseCount: number;        // exercises.length or raw.exerciseCount ?? 0
};

export function normalizeChapterData(raw: unknown): NormalizedChapter
```

All array fields default to `[]`, strings default to `""`, numbers default to `0`. Accepts both a manifest entry (skeleton) and a full chapter JSON, merging where both exist. The Practice tab's MCQ-to-quiz mapping (`mapContentMcqs`) is moved here as a helper but kept identical in behavior.

## Data flow changes in `subjects.$subjectId.tsx`

1. `manifestQuery` — unchanged (already loads `/content/manifest.json`).
2. Replace the single-chapter `contentChapterQuery` with a `useQueries` batch that loads **every chapter with `status: "ready"`** via `loadChapter("mathematics", id)` in parallel (already cached by `loadChapter`).
3. Map each loaded chapter through `normalizeChapterData`, indexed by id.
4. Remove the `subjectMCQs` import and the `subjectMCQs[subject.id] ?? []` fallback. If no JSON MCQs exist for the selected chapter, render the existing empty state ("MCQs for this subject coming soon."). No mock fallback.

## Per-tab wiring

- **Chapters** — already manifest-driven via `ManifestChaptersGrid`; no markup change. Drop the firebase `ChaptersSection` fallback for `isMath` (manifest is the source of truth on Math). Non-math subjects keep the existing firebase path.
- **Resources** — replace `ResourcesSection` (firebase `ChapterResources` picker) on the Math path with a chapter picker (same two-column layout, same classes) that renders `ContentResourcesGrid` for `normalized[selectedId].resources ?? []`. Non-math subjects keep the existing path.
- **Formulas** — add the same chapter picker; pass `normalized[selectedId].formulas ?? []` to the existing `FormulasSection`. No styling change.
- **Topics** — drive from the selected normalized chapter: `summary` + `learningPoints` via the existing `ChapterContentOverview` markup. Keep the existing weak/strong/AI band beneath it unchanged (it already comes from `subject.weakTopics`/`strongTopics`).
- **Practice MCQs** — chapter picker drives `normalized[selectedId].mcqs ?? []` through `mapContentMcqs` into the existing `PracticeQuiz`. Empty state unchanged.

The chapter picker is the same visual element already used in `ResourcesSection` (left rail + content), so no new design.

## Safe fallbacks

Every tab reads through `?? []` / `?? ""` from the normalized object — a missing/late-loading JSON file shows the existing empty-state markup, never a crash. A skeleton state is shown while the manifest or the selected chapter JSON is loading.

## Out of scope

- No changes to routing, theme tokens, spacing, typography, responsiveness, or any component visuals.
- No changes to `subjects.math.$chapterId.tsx`, firebase services, or non-math subject pages.
- No new dependencies.
