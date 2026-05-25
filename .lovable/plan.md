## Goal

Replace inline Formula/Topic rendering on the Mathematics subject page with dedicated route-based pages, loaded purely from JSON. Remove the legacy Firestore "Math data not seeded" path for chapter clicks.

## New routes

1. `src/routes/subjects.$subjectId.formulas.$chapterId.tsx`
   - Loads `/content/chapters/{folder}/{chapterId}.json` via existing `loadChapter()` helper (`src/lib/contentLoader`), mapping `subjectId` → folder (`mathematics`, `science`, `social-science`) using the same `contentFolderFor()` logic already in `subjects.$subjectId.tsx`.
   - Normalizes via `normalizeChapterData` and renders `<FormulasSection formulas={chapter.formulas} />` (reused from `subjects.$subjectId.tsx`, extracted into a shared component file).
   - Page chrome: DashboardLayout, back link to `/subjects/$subjectId`, chapter title header, skeleton + "Unable to load chapter. Retry." error state (same pattern used in exam/quiz routes).

2. `src/routes/subjects.$subjectId.topics.$chapterId.tsx`
   - Same loader pattern.
   - Renders the chapter's topic content: summary, learning points, key terms, exercises (i.e. the `<ChapterContentOverview chapter={ch} />` already used inline today).
   - Same chrome + skeleton/error states.

Both routes use `createFileRoute` and define `head()` with chapter-aware title/description.

## Shared extraction

Move two presentational components out of `subjects.$subjectId.tsx` into `src/components/subject/`:
- `FormulasSection` → `formulas-section.tsx`
- `ChapterContentOverview` → `chapter-content-overview.tsx`

Both are imported by the original page and the two new pages. No logic changes.

## Changes to `src/routes/subjects.$subjectId.tsx`

- Remove inline rendering of formulas/topics for non-social subjects:
  - `TabsContent value="formulas"`: replace `<ContentChapterPane>` with a simple grid of chapter cards that are `<Link to="/subjects/$subjectId/formulas/$chapterId">` links.
  - `TabsContent value="topics"`: same — grid of `<Link to="/subjects/$subjectId/topics/$chapterId">` cards. Keep the existing `<TopicsSection weak/strong/>` block below as before (it is subject-level weak/strong, not chapter content).
- Remove `selectedContentId` / `chapterDetailOpen` only from the non-social branches; the social-science branch keeps its current behavior unchanged (scope says no social changes).
- `ManifestChaptersGrid.onSelect` for math/science: navigate to the topics page (`/subjects/$subjectId/topics/$chapterId`) instead of opening inline. Social-science behavior unchanged.

## "Math data not seeded" fix

- The message originates from `src/routes/subjects.math.$chapterId.tsx` (Firestore-backed). The math chapter cards in the chapters tab currently route there.
- Repoint math chapter clicks to the new JSON-based topics page (`/subjects/mathematics/topics/$chapterId` — using `mathematics` as the canonical URL subjectId, which already matches the manifest folder and how `subjects.index.tsx` links).
- Drop the `mathChaptersQuery` / `fetchMathChapters` / math-intelligence mapping branch from `subjects.$subjectId.tsx` so the chapter list is sourced from the JSON manifest only. Do NOT delete `subjects.math.$chapterId.tsx` or `fetchMathChapters` themselves in this pass — only remove the references from the subject page so nothing links into the legacy route.

## Out of scope (explicit)

- No changes to social-science timeline/maps/civics tabs.
- No redesigns; cards reuse existing visual language.
- No edits to exam/quiz/planner/analytics flows.
- No deletion of legacy Firestore math routes/services.

## Verification

- Clicking a Formula chapter card opens `/subjects/mathematics/formulas/<id>` and renders only that chapter's formulas; nothing renders below the chapter list on the subject page.
- Clicking a Topic chapter card opens `/subjects/mathematics/topics/<id>` with summary, learning points, key terms, exercises.
- Direct URL / refresh works (JSON load + skeleton + retry).
- "Math data not seeded yet" no longer surfaces from normal chapter navigation.
- Mobile viewport (current 428px) unchanged: no horizontal scroll, cards readable.
- No console errors; build passes.
