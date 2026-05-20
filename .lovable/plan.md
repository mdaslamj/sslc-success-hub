# Plan: AI Scan & Solve Experience

Build a signature mobile-first scan flow that becomes Aura's headline AI feature. We **reuse** existing OCR / answer-upload infra, semantic reasoning serverFn, adaptive planner, memory tracking, and weakness diagnosis — wrapping them in a dedicated Scan & Solve workflow with new Firestore collections for scan history and AI solutions.

## 1. Navigation & entry points

- Add a floating premium **Scan FAB** (camera icon, gradient glow, soft press animation) anchored above the bottom nav, visible on Home, Subjects, Planner, Exams.
  - New component: `src/components/scan/scan-fab.tsx`
  - Tap → navigates to `/scan`
- Add "Scan a problem" quick-action card to Home's Today's Focus section.

## 2. New routes

| Route | Purpose |
|---|---|
| `/scan` | Capture / upload entry (camera, gallery, PDF, handwritten answer toggle) |
| `/scan/$scanId` | Solve workspace: OCR result + mode tabs + AI output + post-solve actions |
| `/scan/history` | Past scans, filter by subject/chapter, re-open or practice |

All mobile-first, safe-area aware, page-transition wrapped.

## 3. Capture UX

`/scan` flow stages:
1. **Mode toggle** — *Solve a question* vs *Evaluate my answer* (routes to existing `AnswerUploadDialog` flow when "evaluate").
2. **Capture surface** — camera input (`<input capture="environment">`), gallery picker, or PDF picker. Live "scan glow" animation while preprocessing.
3. **Preview + retake** — uses existing `preprocessImage` (auto-enhance, rotate, crop).
4. **Confirm** → creates a `ScanDoc` and navigates to `/scan/$scanId`.

Components:
- `src/components/scan/scan-capture.tsx`
- `src/components/scan/scan-glow.tsx` (animated overlay; reused on FAB press too)
- `src/components/scan/mode-toggle.tsx`

## 4. OCR + Understanding

- Reuse `runOcrExtraction` pipeline (already wired for vision LLM). Add a sibling `runScanUnderstanding(scanId)` that:
  - Calls `runSemanticReasoning` with OCR text to classify: subject, chapter, difficulty (easy/medium/hard), board relevance %, concept tags, detected entities (formulas, diagrams, keywords).
  - Stores result on `ScanDoc.understanding`.
- Display: skeleton chips → animated chip reveal once classified.

New file: `src/lib/scan-engine/understanding.ts`

## 5. Solve modes

Tabs in `/scan/$scanId` (sticky, segmented control):
- **Quick Answer** — concise final answer + key formula.
- **Step-by-Step** — numbered steps with reveal animation.
- **Hint Mode** — Socratic hints, one at a time (reuses `study-session/ai-coach` pattern).
- **Board Method** — answer in SSLC marking-scheme structure (Given / To Find / Solution / Answer).
- **Kannada Explanation** — same content, Kannada language toggle.

Each mode is a server call through `runSemanticReasoning` with a mode-specific prompt template. Outputs cached per `(scanId, mode, language)` in `solvedQuestions` so re-tapping a tab is instant.

New files:
- `src/lib/scan-engine/solve-modes.ts` — prompt templates + dispatcher
- `src/hooks/use-scan-solve.ts` — lifecycle hook (load scan, request mode, cache, errors)
- `src/components/scan/solve-tabs.tsx`
- `src/components/scan/solution-view.tsx` (markdown + math friendly)

## 6. Handwritten evaluation

Reuse existing `/answer-uploads` infra. Add a deep entry from `/scan` ("Evaluate my answer") that pre-fills `AnswerAttemptContext` and opens the dialog. After submission, evaluation panel (`evaluation-panel.tsx`) already shows rubric/marks; extend it with:
- Missing-step detection (`mistake-detector` reuse)
- Formula misuse flags (`formula-tracker` reuse)
- Improvement suggestions list (semantic reasoning)

Wire results into new `aiEvaluations` collection (lightweight pointer doc keyed by attempt + scan).

## 7. Post-solve action bar

Sticky bottom action bar on `/scan/$scanId`:
- **Practice similar** → generates 3 questions via `question-selector` + opens quiz.
- **Add to revision** → writes to `revisionQueue` (existing service).
- **Save weak concept** → patches `weaknessProfiles` for the detected chapter/concept.
- **Adaptive quiz** → seeds a quick quiz via `adaptive-planner`.
- **Schedule revision** → SM-2 spacing trigger via `study-session/spacing`.

New file: `src/components/scan/post-solve-actions.tsx`, `src/lib/scan-engine/post-solve.ts`.

## 8. Firestore schema (new)

Add to `types.ts` + `config.ts` + `firestore.rules` (owner-gated):

- `scans` (`ScanDoc`): `{ id, userId, createdAt, source: 'camera'|'gallery'|'pdf', imageIds[], ocr: {text, confidence, language}, understanding: {subject, chapterId?, difficulty, boardRelevance, concepts[], formulas[]}, status }`
- `solvedQuestions` (`SolvedQuestionDoc`): `{ id, userId, scanId, mode, language, content, model, createdAt }`
- `aiEvaluations` (`AiEvaluationDoc`): `{ id, userId, scanId?, attemptId, rubricScores, predictedMarks, missingSteps[], formulaIssues[], suggestions[] }`
- `practiceRecommendations` (`PracticeRecDoc`): `{ id, userId, scanId, questionIds[], reason, createdAt }`
- `scanHistory` view — derived from `scans` (no separate doc).

Guest-mode mirror in `src/lib/scan-engine/local-store.ts` (localStorage, same shape).

## 9. Loading & motion

- Scan glow: animated gradient ring + scanline using framer-motion (already in use in session UI).
- Mode tab switch: cross-fade + skeleton.
- Solution reveal: per-step stagger animation in Step-by-Step.
- Empty/error states use existing `empty-state.tsx`.

## 10. Files to add / change

**Add**
```
src/routes/scan.tsx
src/routes/scan.$scanId.tsx
src/routes/scan.history.tsx
src/components/scan/scan-fab.tsx
src/components/scan/scan-capture.tsx
src/components/scan/scan-glow.tsx
src/components/scan/mode-toggle.tsx
src/components/scan/solve-tabs.tsx
src/components/scan/solution-view.tsx
src/components/scan/post-solve-actions.tsx
src/hooks/use-scan-solve.ts
src/hooks/use-scan-capture.ts
src/lib/scan-engine/understanding.ts
src/lib/scan-engine/solve-modes.ts
src/lib/scan-engine/post-solve.ts
src/lib/scan-engine/local-store.ts
src/lib/scan-engine/index.ts
src/integrations/firebase/services/scans.ts
src/integrations/firebase/services/solved-questions.ts
src/integrations/firebase/services/ai-evaluations.ts
src/integrations/firebase/services/practice-recommendations.ts
```

**Edit**
```
src/integrations/firebase/types.ts        # new doc types
src/integrations/firebase/config.ts       # new collection names
firestore.rules                           # owner-gated rules
src/components/dashboard-layout.tsx       # mount ScanFab
src/components/answer-upload/evaluation-panel.tsx  # add missing-step + formula + suggestions blocks
src/routes/index.tsx                      # scan quick-action card
```

## 11. Constraints honored

- No backend redesign: OCR + semantic reasoning serverFn + adaptive/memory/weakness layers are reused as-is.
- Mobile-first only — all new components are stacked, safe-area aware, FAB anchored above bottom-nav.
- Existing architecture (TanStack routes, owner-gated Firestore, guest local store, `useDailyEngine`, `useStudySession`) is unchanged.

After approval I'll implement in one pass.
