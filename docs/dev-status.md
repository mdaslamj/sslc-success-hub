# Aura — Dev Status

## UX Trust & Polish Sweep — ✅ shipped

**Scope:** Targeted polish on loading, empty, and fallback states. No
redesigns, no new dependencies, no gamification.

### Loading states
- `quiz/$quizId` no longer flashes a bare "Loading…" line while the cached
  quiz hydrates — replaced with a calm skeleton (title / body / options
  rows) and a supportive "Preparing your quiz…" caption.
- Verified all other major routes already use proper animate-pulse
  skeletons (`index`, `quizzes`, `predictions`, `subjects`, `mock-test`).
- `Splash` in `__root.tsx` keeps an `aria-live="polite"` "Loading…" label
  for screen readers.

### Empty / fallback messaging
- `quizzes` empty state no longer leaks developer text
  ("Add a chapter JSON under public/content/chapters/…"). Replaced with
  a calm message: "No quizzes are available yet for {subject}. New
  chapters appear here automatically as they're added."
- All other empty surfaces already route through `EmptyState` /
  adaptive-guidance copy (supportive tone, no failure framing).

### Transitions
- `PageTransition` keeps the soft 320ms `page-in` fade-up — calm and
  GPU-cheap. Honoured by the global `prefers-reduced-motion` rule in
  `src/styles.css` (animations collapse to 0.001ms).

### Mobile readability / touch
- Inputs remain ≥16px on mobile (blocks iOS zoom).
- `touch-action: manipulation` on coarse pointers stays in place.
- No new dense layouts introduced this pass.

### Slow network
- `SyncStatusBanner` still mounted in the shell.
- The lazy Firebase Storage chunk from the previous sweep means cold
  starts on slow networks ship less JS upfront.

### Verified
- ✅ No console errors.
- ✅ No abrupt blank states on the audited routes.
- ✅ No visual clutter introduced (only one skeleton + one copy change).

---

## Deployment Optimization Sweep — ✅ shipped

**Scope:** Bundle / lazy-load / Firebase cleanup pass. No behaviour changes.

### Bundle
- **Firebase Storage SDK now lazy-loaded** (`src/integrations/firebase/config.ts`).
  Replaced the eager `getStorage()` export with `getStorageLazy()` which
  dynamically imports `firebase/storage` only when the handwritten-answer
  upload or account-delete flow runs. Most sessions never touch storage,
  so the SDK chunk no longer ships in the initial bundle.
  - Call sites updated: `services/answer-uploads.ts`,
    `lib/production/account-lifecycle.ts`.
- **Recharts** stays scoped to `/analytics` and `/targets` only —
  TanStack auto code-splitting keeps it out of the initial bundle.
- No `framer-motion`, no `three`, no other heavy libs in the tree.

### Firebase usage
- Confirmed all service modules use granular `firebase/firestore` imports
  (`doc`, `getDoc`, `setDoc`, `collection`, `query`, …) so tree-shaking
  drops unused Firestore surface area.
- `firebase/auth` persistence is `browserLocalPersistence` with a silent
  fallback to in-memory — survives reload without blocking startup.

### Rerenders / memory
- Adaptive + emotional layers remain pure functions over existing
  localStorage signals — no new subscriptions, no new React contexts.
- `OnboardingGate` early-returns on `loading` and only navigates inside a
  `useEffect` keyed on `(user, profile, loading, pathname)` — no render loop.

### Offline resilience
- `SyncStatusBanner` already mounted in the shell.
- Storage-backed flows degrade gracefully: lazy import failures are caught
  by the existing try/catch in `deleteAnswerImage` and
  `deleteStorageFolder` so an offline session can't crash the UI.

### Low-end Android
- Global `body { overflow-x: hidden; overscroll-behavior-y: contain }` and
  `touch-action: manipulation` on coarse pointers remain in place.
- Initial JS payload is smaller (no storage SDK), helping cold-start on
  slow networks.

### Verified
- ✅ No console errors, no runtime errors, no dev-server warnings.
- ✅ Production build remains clean (no stale `storage` imports).
- ✅ `getStorageLazy()` is idempotent — caches the instance after first call.

---

## Production Stabilization Sweep — ✅ shipped

**Scope:** Verification pass across onboarding/session persistence, route
navigation, mobile overflow, loading/empty states, and console hygiene. No
behaviour changes beyond cleanup.

### Verified
- **Session persistence**: `OnboardingGate` in `src/routes/__root.tsx` already
  routes returning authenticated users with `profile.onboardingCompletedAt`
  straight to `/` and pulls them off `/login` and `/onboarding`. Guest mode
  rehydrates from `aura.guest.*` localStorage keys. A 450ms splash hold
  prevents the dashboard from flashing before auth restores.
- **Routes / navigation**: `notFoundComponent` and `errorComponent` are wired
  on the root route with retry → `router.invalidate()` + `reset()`. No
  dead-end links found in the audited routes; the public allow-list covers
  `/login`, `/forgot-password`, `/onboarding`, `/seed`, `/privacy`.
- **Mobile overflow**: Global `body { overflow-x: hidden }` in
  `src/styles.css` plus the earlier Planner / Subjects fixes hold up at
  320–414px. Inputs are pinned to ≥16px to block iOS zoom; `pointer: coarse`
  enables `touch-action: manipulation` for snappier taps on low-end Android.
- **Loading / empty states**: `Splash` covers auth + profile bootstrap;
  `SyncStatusBanner` covers offline sync; adaptive cards degrade to gentle
  empty messages when no signals exist.
- **Console**: No runtime errors. No dev-server warnings. Verified via
  `runtime_errors` and the `vite` daemon log.

### Cleaned
- Silenced chatty production `console.log` lines in
  `src/integrations/firebase/subjects.ts` (auto-seed, subjects loaded,
  per-row chapter counts) behind `import.meta.env.DEV`. Warnings on real
  errors are preserved.

### Bundle / rerenders
- No new deps. No new components. No new storage keys.
- Adaptive / emotional layers remain pure functions reading existing
  `aura:weak:*` and `mt:attempts` entries — no extra subscriptions.

---

## Emotional Progress Layer — ✅ shipped

**Scope:** Lightweight emotional reflections derived from existing learning
signals (weakAreaTracker, adaptiveRevision, mock exam attempts). Local-only,
no new storage keys, no streaks/rankings/gamification.

### What changed
- New module `src/lib/emotionalProgress.ts` exposes pure helpers:
  - `getEmotionalSummary()` — `{ headline, consistency, confidence, progress, recovery, label }`
  - `getConsistencyReflection()` — calm consistency-focused message
  - `getConfidenceEncouragement()` — confidence-building encouragement
  - `getGentleProgressSummary()` — short kind overall summary
  - `getRecoveryEncouragement()` — recovery-oriented encouragement (empty when no weak areas)
- Tone: supportive and calm — e.g. "You’re building steady progress." /
  "Consistency matters more than speed." / "You’re improving chapter by chapter."
  No pressure, streak obsession, rankings, or gamification.
- Reads existing `aura:weak:*` and `mt:attempts` entries only; no new storage keys.

### Integration points
- **Planner** (`src/routes/planner.tsx`): `mentorMessage` now blends emotional
  signals with task-completion coaching. When learning data exists, the strip
  shows the emotional headline + confidence/recovery message instead of generic
  task coaching.
- **Mock Test Result** (`src/routes/mock-test.$testId.tsx`): ReviewView now
  renders a small emotional note below the score cards — e.g.
  "You’re building steady progress. You’re growing more confident chapter by chapter."
- **Adaptive Guidance Card** (`src/components/planner/adaptive-guidance-card.tsx`):
  Adds a subtle emotional progress line below the plan message, using the same
  calm `emotional.headline`.

### Verification
- ✅ Pure functions; deterministic for a given snapshot.
- ✅ No new `localStorage` keys.
- ✅ Empty-state safe — returns gentle welcome messages with no signals.
- ✅ Mobile-friendly — uses existing card padding and text sizes; no layout shifts.
- ✅ No console errors.

### Future hooks
- Emotional progress summaries can feed parent-friendly dashboards.
- `label` field is ready for dashboard chips / profile badges.
- Can be extended with emotional trend detection (e.g. accuracy improving over time).

---

## Adaptive Planner Integration — ✅ shipped

**Scope:** Transform the Planner from a static schedule into a calm,
adaptive daily guidance layer powered by `adaptiveRevision`. Local-only,
no backend/cron/notifications, no new storage keys.

### What changed
- New bridge `src/lib/adaptivePlannerBridge.ts` — pure
  `buildAdaptiveDailyPlan({ subjectId? })` returning `dailyFocus`,
  `revision[]` (≤3), `recovery[]` (≤2), `practice[]` (≤2), a calm
  `message`, and `totalMinutes` capped at 60 min/day. De-duplicates
  chapters across buckets.
- New `src/components/planner/adaptive-guidance-card.tsx` — mobile-first
  card surfacing the daily plan with per-item "Add to today" buttons.
- Wired into `src/routes/planner.tsx`: renders above the legacy
  `RevisionPlannerCard`; `addAdaptiveItem` appends to the existing task
  list (skips duplicates, preserves the highlight-pulse UX).
- Calm supportive copy only — e.g. "A short revision session today may
  strengthen confidence." / "You’re maintaining steady progress." / "Let’s
  revisit a few important chapters today." No pressure language, streak
  obsession, aggressive targets, or overload indicators.

### Workload guardrails
- Hard caps per bucket; total minutes ≤ 60/day with trim order
  practice → recovery → revision (least urgent first).

### Future hooks
- Emotional progress layer can read `plan.message` + item tone.
- Personalized mock exams can consume `item.practice.questionIds`.
- Parent-friendly summaries can re-use the headline + bucket counts.

### Verification
- ✅ Planner pulls adaptive suggestions through the bridge.
- ✅ Workload stays balanced via hard caps and minute trimming.
- ✅ No duplicate logic — bridge re-uses `adaptiveRevision` exclusively.
- ✅ Mobile layout uses existing column grid; card is `flex-wrap`-safe
  and uses semantic tokens only.
- ✅ No new `localStorage` keys, backend, cron, or notifications.

## Adaptive Revision Engine — ✅ shipped

**Scope:** Lightweight, local-only revision suggestions derived from
`weakAreaTracker` signals. No backend, no new storage keys.

### What changed
- New module `src/lib/adaptiveRevision.ts` exposes pure helpers:
  - `getTodaysRevision({ subjectId?, limit? })` — mix of high/medium
    priority chapter picks for today.
  - `getRecoveryChapters({ subjectId?, limit? })` — high-priority only,
    sorted by lowest accuracy.
  - `getRevisionPriority(chapterId)` — `"high" | "medium" | "low"` for
    a single chapter; defaults to `"low"` for unseen chapters.
  - `getSuggestedPractice({ subjectId?, limit? })` — wrong-answer-driven
    topic clusters with `questionIds[]` ready for the retry/practice flow.
  - `getRevisionSummary()` — `{ total, high, medium, low, message }` for
    dashboard widgets.
- Priority logic (lightweight):
  - **High** — ≥3 repeated wrong answers, low confidence, or recently
    failed (≤2d & <60% accuracy).
  - **Medium** — not revised in ≥5d, or medium confidence.
  - **Low** — consistently correct chapters.
- Calm messaging — supportive copy only, e.g. "A quick revision of this
  chapter may help strengthen confidence." / "You’re improving steadily
  chapter by chapter." No pressure or failure wording, no gamification.
- Inputs reused as-is: `listChapterAccuracy`, `listConfidence`,
  `listWrongAnswers` from `weakAreaTracker`. No duplicate records written.

### Future hooks
- Planner integration — `getTodaysRevision()` can feed daily plan cards.
- Emotional progress summaries — `getRevisionSummary().message` is the
  seed string for tone-aware summaries.
- Personalized mock exams — `getSuggestedPractice().questionIds` feeds
  directly into `mockExamGenerator.generateWeakAreaTest`.

### Verification
- ✅ Pure functions; deterministic for a given snapshot.
- ✅ No new `localStorage` keys; reads existing `aura:weak:*` entries.
- ✅ Empty-state safe — returns `[]` with no signals.
- ✅ No UI changes; bundle impact ~1 KB gzipped.

---

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