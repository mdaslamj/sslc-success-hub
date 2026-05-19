# Mathematics Academic Data Import & Population

Goal: make `/admin/import` the single place to load all Mathematics academic data into Firestore (questions, model answers, formulas, rubrics, keywords, common mistakes, PYQs/board papers). Student-facing UI stays unchanged — only admin tooling and back-end helpers are added.

## What already exists (reuse, don't rebuild)

- Firestore types & collections: `mathChapters`, `mathQuestions`, `mathModelAnswers`, `mathFormulas`, `mathRubrics`, `mathKeywords`, `mathCommonMistakes` (all in `src/integrations/firebase/config.ts` + `types.ts`).
- Per-doc upsert helpers in `src/integrations/firebase/services/math-*.ts`.
- A fully-populated 3-chapter seed bundle in `src/integrations/firebase/syllabus/sslc-math-intelligence.ts`.
- Admin-gated `/admin/import` route with JSON-upload pattern (syllabus + library).

What's missing is the bulk/CSV pipeline, auto-tagging, validation, manual entry, and a draft→publish gate.

## What to build

### 1. Bulk math import service

New `src/integrations/firebase/services/math-import.ts`:

- `MathImportPayload` — single typed envelope:
  ```ts
  { chapters?, questions?, modelAnswers?, formulas?, rubrics?, keywords?, commonMistakes? }
  ```
- `parseMathImportJson(text)` — validates with zod, returns the typed payload + `issues[]`.
- `parseMathImportCsv(text, kind)` — CSV → rows for one kind at a time (`questions`, `formulas`, `modelAnswers`, `keywords`, `commonMistakes`). Header-driven, tolerant of missing optional columns. Pipe-separated cells for arrays (`tags`, `lastAppearedYears`, `options`).
- `validateMathImport(payload)` — pure function returning `{ errors, warnings }`:
  - chapter ids referenced by questions/formulas exist (either in payload or already in DB; pass an existing-id set in)
  - MCQ has `options` + `correctOption` in range
  - `marks` consistent with `questionType` default rubric (warning)
  - duplicate ids inside the payload (error)
- `applyAutoTags(payload)` — pure: sets `metadata.isRepeatedBoardQ` if `boardFrequency >= 2`, appends `tags`:
  - `repeated-board` (freq ≥ 2)
  - `competency` (questionType `competency`)
  - `hots` (questionType `hots`)
  - `important-formula` (any `requiredFormulaIds` flagged in formulas list as `category` important / `tags` include `must-know`)
- `importMath(payload, { dryRun })` — batched writes via `writeBatch` (chunks of 400), idempotent (uses doc ids). Returns counts per collection.
- `importMathFromSeed()` — wrapper that calls `importMath(SSLC_MATH_INTELLIGENCE)` using the existing seed bundle (the bundle is already exported; today nothing in the UI runs it).

### 2. Admin UI — new "Mathematics" section in `/admin/import`

Reuse existing card styling. Add one card with internal tabs (Tabs from `@/components/ui/tabs`):

```text
[ Seed ] [ JSON ] [ CSV ] [ Manual ] [ Review ]
```

- **Seed** — one-click "Import Mathematics intelligence preset" (calls `importMathFromSeed`). Shows counts on success.
- **JSON** — paste `MathImportPayload` JSON or upload a `.json` file (`<input type="file">`). Runs `parseMathImportJson` + `validateMathImport`; renders the issues list; "Save as draft" / "Publish" buttons.
- **CSV** — kind selector (`questions | formulas | keywords | commonMistakes | modelAnswers`) + textarea / file upload. Renders parsed row count and a preview table (first 5). Same validate → draft → publish flow.
- **Manual** — small form for a single question (chapter, type, marks, difficulty, statement, options, correctOption, boardFrequency, source). Same validate pipeline; submits as a 1-item payload.
- **Review** — list of pending drafts (see §3) with Approve / Reject / Edit-JSON / Delete.

All tabs feed the same `validate → preview → publish` pipeline so behavior is consistent.

### 3. Draft → publish workflow (no extra collection design churn)

New Firestore collection `mathImportDrafts`:
```ts
type MathImportDraftDoc = {
  id: string; createdAt: number; createdBy: string;
  source: "json" | "csv" | "manual" | "seed";
  status: "pending" | "approved" | "rejected";
  payload: MathImportPayload;
  counts: { questions: number; formulas: number; ... };
  validationIssues: { level: "error" | "warning"; message: string }[];
  notes?: string;
};
```
- "Save as draft" writes here. "Publish" runs `importMath(payload)` and flips status to `approved` (or deletes — config-flag, default keep for audit).
- Admin-only RLS via existing `admin-gate` pattern; rule: `request.auth.token.admin == true` (matches current admin gate).

Drafts let the import be reviewed/edited before touching live student-facing collections — that is the only behavior change to existing data flow.

### 4. Auto-tagging at import time

Applied inside `importMath` (after `applyAutoTags`), so manual/JSON/CSV/seed all get consistent tags. No new tag collection — tags live on `MathQuestionDoc.tags` and `metadata.isRepeatedBoardQ`, already in schema.

### 5. Wire-up with downstream systems (already in place — verify only)

No new code needed; confirm imports flow through:
- Mock exams → `mock-test-builder.ts` already pulls from `mathQuestions`.
- Analytics & mastery → `math-chapter-analytics.ts` + `mastery-aggregator.ts` already read `mathQuestions` results.
- Predictions → `rankChaptersByImpact()` already reads `mathChapters.boardWeight`.
- AI evaluation → `rubric-grader.ts` already reads `mathRubrics` + `mathModelAnswers` + `mathKeywords`.
- Chapter hub → `/subjects/math/$chapterId` already reads all of the above.

So importing data via this pipeline automatically lights up exams, analytics, predictions, evaluation, and the chapter hub. No student UI changes.

## Files

New
- `src/integrations/firebase/services/math-import.ts` — payload type, parsers, validator, auto-tagger, batched importer, drafts CRUD.
- `src/components/admin/math-import-panel.tsx` — the tabbed panel mounted inside `admin.import.tsx`.

Edited
- `src/routes/admin.import.tsx` — add `<MathImportPanel />` card under the existing two cards.
- `src/integrations/firebase/services/index.ts` — re-export the new service.
- `firestore.rules` — add admin-only rule for `mathImportDrafts`.

Untouched
- All student-facing routes, the math chapter hub, schema for the seven math collections, syllabus/library importers.

## CSV header contracts (for `parseMathImportCsv`)

```text
questions:        id,chapterId,questionType,marks,difficulty,statement,options,correctOption,requiredFormulaIds,keywordIds,rubricId,boardFrequency,lastAppearedYears,isImportant,commonMistakeIds,estimatedSolvingTime,source,tags
formulas:         id,chapterIds,label,expression,description,category,commonUsageNotes
modelAnswers:     questionId,chapterId,finalAnswer,totalMarks,steps   (steps = JSON inline)
keywords:         id,term,synonyms,chapterIds,weight
commonMistakes:   id,chapterId,title,description,triggerKeywords,correction
```

Array cells use `|` as separator. Booleans accept `true/false/1/0`. Unknown columns are ignored with a warning.

## Out of scope

- No new student-facing UI.
- No changes to non-math import flows.
- No background Cloud Functions — all writes happen client-side under the admin gate, same as today's syllabus import.
- No XLSX upload (CSV covers spreadsheet exports).
