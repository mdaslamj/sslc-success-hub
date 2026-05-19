## Mathematics Intelligence System — Project Aura

Turn Mathematics into the first fully intelligent subject by building a chapter-wise academic database with rich metadata, rubrics, and analytics hooks. Backend-first; no redesign of existing pages.

### 1. Firestore collections (new)

Added to `COLLECTIONS` in `src/integrations/firebase/config.ts`:

- `mathChapters` — chapter-level academic profile (formulas, key concepts, board weight, mastery thresholds).
- `mathQuestions` — question bank with full metadata.
- `mathModelAnswers` — stepwise model solutions linked to questions.
- `mathFormulas` — central formula registry (cross-chapter searchable).
- `mathRubrics` — per-question or per-question-type rubrics for evaluation.
- `mathKeywords` — keyword/concept tags powering OCR + AI grading matches.
- `mathChapterAnalytics` — per-user rollups: mastery, formula accuracy, speed, weak topics.
- `mathCommonMistakes` — catalog of typical student errors per chapter/concept.

All owner-scoped where user-specific; reference data (`mathChapters`, `mathQuestions`, `mathModelAnswers`, `mathFormulas`, `mathRubrics`, `mathKeywords`, `mathCommonMistakes`) is read-only for authenticated users, writable only by admins via `firestore.rules`.

### 2. Type model (`src/integrations/firebase/types.ts`)

```text
MathChapterDoc
  ├─ id, subjectId='math', chapterNumber, title, titleKn
  ├─ keyConcepts: string[]
  ├─ formulaIds: string[]
  ├─ boardWeight: number          // % of board marks historically
  ├─ difficultyMix: { easy, medium, hard, hots }
  ├─ estimatedStudyTime, masteryThreshold
  └─ prerequisites: chapterId[]

MathQuestionDoc
  ├─ chapterId, questionType: 'mcq'|'1mark'|'2mark'|'3mark'|'5mark'|'hots'|'competency'
  ├─ marks, difficulty: 'easy'|'medium'|'hard'
  ├─ statement, statementKn, options? (mcq), correctOption?
  ├─ requiredFormulaIds: string[]
  ├─ keywordIds: string[]
  ├─ rubricId
  ├─ metadata:
  │    ├─ boardFrequency: number        // times appeared in board exams
  │    ├─ isRepeatedBoardQ: boolean
  │    ├─ lastAppearedYears: number[]
  │    ├─ isImportant: boolean
  │    ├─ commonMistakeIds: string[]
  │    └─ estimatedSolvingTime: seconds
  └─ source, tags

MathModelAnswerDoc
  ├─ questionId
  ├─ steps: [{ order, text, formulaId?, marks }]
  ├─ finalAnswer, alternativeMethods?
  └─ totalMarks

MathFormulaDoc
  ├─ chapterIds[], label, expression (LaTeX), description
  ├─ category: 'algebra'|'geometry'|'trig'|'mensuration'|...
  └─ commonUsageNotes

MathRubricDoc
  ├─ questionType, totalMarks
  └─ criteria: [{ label, marks, keywords[], required: bool }]
       // e.g. formula write-up, substitution, calculation, units, final answer

MathKeywordDoc { term, synonyms[], chapterIds[], weight }

MathCommonMistakeDoc
  ├─ chapterId, title, description
  ├─ triggerKeywords[]   // OCR text patterns that signal this mistake
  └─ correction

MathChapterAnalyticsDoc (per user)
  ├─ userId, chapterId
  ├─ mastery: 0..100
  ├─ formulaAccuracy: { [formulaId]: { attempts, correct } }
  ├─ speedIndex: avgSolveTime / estimatedSolvingTime
  ├─ weakConcepts: string[], strongConcepts: string[]
  ├─ questionTypeStats: { [type]: { attempts, avgScore } }
  └─ lastUpdated
```

### 3. Service layer

New files under `src/integrations/firebase/services/`:

- `math-chapters.ts` — fetch chapter profile, list chapters with board weight.
- `math-questions.ts` — query by chapter / type / difficulty / boardFrequency; helpers `pickAdaptive()`, `pickMockExamSet()`, `pickRevisionSet()`.
- `math-model-answers.ts` — fetch stepwise answers, used by review screen + evaluator.
- `math-formulas.ts` — search, list by chapter, record usage.
- `math-rubrics.ts` — fetch rubric for question/type.
- `math-keywords.ts` — fetch + match against OCR text.
- `math-common-mistakes.ts` — detect mistakes from extracted text.
- `math-chapter-analytics.ts` — read + incremental update (mastery, formula accuracy, speed).

Exported from `src/integrations/firebase/services/index.ts`.

### 4. Reusable intelligence layer (`src/lib/math-intelligence/`)

Pure functions, no UI, reusable by AI tutor, OCR evaluator, mock test, revision:

- `question-selector.ts` — adaptive selection by weak chapter, mastery, due-for-revision.
- `mock-test-builder.ts` — board-style blueprint (n × 1-mark + n × 2-mark + … + HOTS) honoring chapter weights.
- `revision-recommender.ts` — surface weak chapters + repeated-board questions + due formulas.
- `formula-tracker.ts` — update `formulaAccuracy` after each attempt.
- `speed-analyzer.ts` — compute `speedIndex`, flag slow chapters.
- `mistake-detector.ts` — match OCR/extracted text against `mathCommonMistakes`.
- `rubric-grader.ts` — score extracted text against a rubric (keyword + step coverage); plugs into existing `evaluations` pipeline as a Math-specialized evaluator.
- `tutor-context.ts` — assemble per-question context (chapter, formulas, rubric, mistakes, model answer) for the future AI tutor prompt.

### 5. Hooks (`src/hooks/`)

Thin React Query wrappers so feature pages can adopt without redesign:

- `use-math-chapter.ts`, `use-math-questions.ts`, `use-math-analytics.ts`, `use-math-formulas.ts`.

### 6. Seed data (`src/integrations/firebase/syllabus/sslc-math-intelligence.ts`)

Extend existing `sslc-math.ts` with structured intelligence seeds for Karnataka SSLC Math: 2–3 chapters fully populated (Arithmetic Progressions, Triangles, Quadratic Equations) covering all question types, formulas, rubrics, common mistakes, board frequency. Importer reused on `/admin/import` (no new page).

### 7. Integration points (existing features — minimal, additive)

- `services/evaluations.ts`: when `subjectId === 'math'`, call `rubric-grader` + `mistake-detector` instead of generic Jaccard. Stores extra fields (`formulaAccuracy`, `detectedMistakes`) in `EvaluationDoc.metadata`.
- `services/answer-uploads.ts`: pass detected keywords/formulas to analytics updater.
- `recommendation-engine.ts`: when subject is math, defer to `revision-recommender`.
- `mock-exam-engine.ts`: when subject is math, build via `mock-test-builder`.
- `quiz-engine.ts`: optional `pickAdaptive()` path for math quizzes.

No UI/page redesign — existing pages keep current layout; only the underlying data source becomes richer.

### 8. Security (`firestore.rules`)

- Reference math collections: `allow read: if request.auth != null; allow write: if isAdmin();`
- `mathChapterAnalytics/{userId}/...`: owner-only read/write.

### 9. Out of scope (future, architecture-ready)

- Actual LLM tutor call (context assembler exists, prompt + Gemini call later).
- WebGL/handwriting analysis.
- Parent / teacher dashboard reads (analytics doc shape already multi-reader friendly).

### Deliverables

New files (~15):
- 8 service files, 8 intelligence libs, 4 hooks, 1 seed file, types + config edits, rules update.

No changes to existing routes/components beyond engine-level dispatch when `subjectId === 'math'`.
