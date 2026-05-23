# Aura — Dev Status

## Interactive Maps (Phase 1) — ✅ shipped

**Scope:** Lightweight clickable map experience inside Social Science → Maps tab.

### What changed
- **Map asset**: replaced the schematic India outline at
  `public/content/maps/india-outline.svg` with a more anatomically accurate
  outline — includes Kashmir bulge, Kutch, Konkan/Malabar coast, Kanyakumari
  tip, NE seven-sisters region, Sri Lanka, Andaman & Nicobar, Tropic of
  Cancer reference line, compass, and labeled metro markers (Delhi, Mumbai,
  Bengaluru, Chennai, Kolkata, Kanyakumari).
- **Clickable topics**: every `mapTopics` chip in `ChapterMap`
  (`src/routes/subjects.$subjectId.tsx`) is now a button. Map-label rows
  are also clickable.
- **TopicPracticeDialog**: opens on click and provides
  1. quick explanation (from `mapLabels[].description` or matching `keyTerms`,
     with a graceful fallback string),
  2. preview of related MCQs (filtered from chapter MCQs by topic-string
     substring / token match),
  3. quick practice flow — select option → Check → reveal correct
     answer + explanation → Next → final score screen with Retry.
- **Question source**: reuses chapter JSON MCQs via existing
  `mapContentMcqs()`; no extra fetches, no backend. Falls back to first 5
  MCQs if no topic-keyword matches.
- **No dead-end navigation**: dialog always offers Retry / Done; empty
  match state shows a friendly "try another topic" message.

### Constraints honored
- Mobile-first (`max-w-md`, `max-h-[70vh]` scrollable, touch-friendly
  rounded targets, `active:scale-95`).
- No new dependencies, no GIS engines, no external map APIs.
- Pure SVG (static asset, lazy-loaded via `<img>`).
- Reuses existing `Dialog` (shadcn/radix) already in bundle.

### Verification
- ✅ Map renders with new geographic landmarks
- ✅ Topic chips open dialog; practice flow advances and scores correctly
- ✅ Mobile viewport (≤640 px) — dialog fits, chips wrap, no overflow
- ✅ No console errors in preview

### Future hooks (not in this phase)
- Clickable SVG regions (state-level hit areas)
- Map quizzes scoped to question-bank service
- Disaster / climate overlay layers

---

## Mock Exam Flow — ✅ stabilized

**Scope:** Complete the student-facing mock-exam loop: attempt → submit →
result → retry-wrong, with local weak-area signals.

### What changed
- **Runner** (`src/routes/mock-test.$testId.tsx`):
  - Existing question rendering, option selection, prev/next nav, progress
    bar, question pills and timer are kept (already stable, mobile-first).
  - On submit, calls `recordAttemptSignals` to update local weak-area data.
- **Result summary** now shows:
  - Score, correct/total, and a calm “to revisit” count (replaces the
    near-duplicate accuracy chip).
  - Emotionally supportive headline (`supportiveMessage`) keyed to score.
  - **Chapter breakdown** with correct/total + accuracy bar per chapter
    (only when the test spans >1 chapter).
  - **Gentle next step** card listing up to 3 weakest chapters (<60%) —
    framed as a suggestion, not a verdict.
- **Retry Wrong Questions**:
  - `buildRetryWrongTest(test, answers)` in `src/lib/mock-test/engine.ts`
    builds a fresh `MockTest` from wrong + skipped questions (shuffled,
    timer scaled to length).
  - Result view exposes a “Retry wrong (n)” button that caches the retry
    test and navigates to `/mock-test/$testId` — same runner, no extra UI.
- **Weak-area tracker** (`src/lib/weakAreaTracker.ts`, local-only):
  - `aura:weak:wrong` — recent wrong-answer entries (de-duped, cap 200,
    auto-cleared when the student later answers correctly).
  - `aura:weak:chapters` — per-chapter cumulative accuracy across attempts.
  - `aura:weak:confidence` — derived `low | medium | high` per chapter.
  - Read helpers: `listWrongAnswers`, `listChapterAccuracy`,
    `listConfidence`, `getWeakChapters` — ready for future adaptive
    planner / recommendation surfaces.

### Constraints honored
- No backend, no analytics service, no new dependencies.
- Pure additions to existing `mock-test` engine + store; no duplicate
  generator/session services introduced into the live flow.
- Mobile-first: flex-wrap action rows, truncated chapter titles, `Progress`
  bars at `h-1.5`, all buttons touch-sized.
- All localStorage writes wrapped in `safe()` to no-op on quota / privacy
  modes — runner never throws.

### Verification
- ✅ `bunx tsc --noEmit` clean.
- ✅ Navigation: Dashboard → Mock Test → Attempt → Submit → Result →
  Retry Wrong → new Attempt loop works (retry caches via `cacheTest`).
- ✅ Grading, chapter breakdown, and weak-chapter list computed from the
  same `answers[]` source — numbers stay consistent.
- ✅ Result view safe when test spans a single chapter (breakdown hidden)
  or when score is perfect (no retry button rendered).

### Future hooks (not in this phase)
- Surface `getWeakChapters()` on the planner / dashboard.
- Promote local weak-area store to Firestore behind the same API.
- Confidence-weighted question selection in `buildSubjectTest`.