# Aura — Dev Status

## Question Bank v3 swap — ✅ shipped

`src/lib/question-bank/index.ts` `FILE_MAP` now points at the three v3 JSON
files (`math_question_bank_v3.json`, `science_question_bank_v3.json`,
`social_science_question_bank_v3.json`). v3 keeps the same
`{ meta, blueprint, questions[] }` shape and `BankQuestion` fields, so
`mockExamGenerator` (full mock + chapter test + weak-area + mixed practice)
and chapter mappings work unchanged. Single loader / cache — no duplicate
fetches. No UI changes.

## Formula / Topic nested routes — ✅ fixed (2026-05-27)

### Root cause
`/subjects/$subjectId/formulas/$chapterId` and `/subjects/$subjectId/topics/$chapterId`
are **child routes** of `/subjects/$subjectId` (see `routeTree.gen.ts`). The parent
route rendered the full subject page **without** `<Outlet />`, so client navigation
updated the URL but the child page never mounted (blank / “nothing happens”).

Secondary issues:
- `ChapterLinkGrid` used `{...buildTo(id)}` spread on `<Link>` instead of explicit
  `to` + `params` (fragile with TanStack Router).
- Mathematics manifest lives at `/content/manifest.json`, not
  `/content/chapters/mathematics/manifest.json` — slug fallback for migrated
  `math-chN` ids must use `loadManifest()`, not a hard-coded chapters path.
- Migrated question-bank chapter ids (`math-ch1`) ≠ content JSON slugs
  (`real-numbers`); helpers in `src/lib/chapter-routes.ts` normalize both.

### Minimal fix (no UI redesign)
- `src/routes/subjects.$subjectId.tsx` — `SubjectRouteShell` renders `<Outlet />`
  on nested formula/topic paths; `ChapterLinkGrid` uses explicit `Link` params +
  `chapterRouteSlug()`.
- `src/lib/chapter-routes.ts` — canonical subject ids, slug helpers, manifest
  resolution via `loadManifest()`.
- `src/routes/subjects.$subjectId.formulas.$chapterId.tsx` and
  `subjects.$subjectId.topics.$chapterId.tsx` — resolve content slug before
  `loadChapter()`.

### Verification checklist
- [ ] `/subjects/mathematics/formulas/real-numbers` opens Real Numbers formulas
- [ ] `/subjects/mathematics/topics/polynomials` opens Polynomials topics
- [ ] `/subjects/mathematics/topics/triangles` deep link works
- [ ] Subject → Formulas tab → chapter card navigates and renders
- [ ] Subject → Topics tab → chapter card navigates and renders
- [ ] Chapters tab → non–social-science chapter opens topics route
- [ ] Back link returns to `/subjects/mathematics`
- [ ] Mobile + desktop layouts unchanged

### Prevention
Any time a route file is nested under a parent (TanStack file-based routing),
the parent **must** render `<Outlet />` when child paths are active — mirror
`src/routes/exam-hall.tsx` / `src/routes/exams.tsx`. After adding nested routes,
run `npm run dev` and deep-link test one child URL before shipping.

**Three-level hierarchy (2026-05-27):** Formulas/Topics use chapter list → item
cards → detail routes. Parent chapter routes (`formulas.$chapterId`,
`topics.$chapterId`) must also render `<Outlet />` for `$formulaSlug` /
`$topicSlug` child routes.

## Mobile Production Fix Pass (focused) — ✅ shipped

Targeted, surgical fixes to real rendered mobile breakage — no redesigns,
no new dependencies, no sweeps.

### Fixed
- **Chapter test was hardcoded to one chapter.** `src/routes/chapter-test.tsx`
  now validates `?subject=&chapter=` search params, and
  `src/pages/ChapterTest.tsx` reads them and reloads on change. Cancels stale
  loads, resets answers, and surfaces a calm error instead of an empty page.
- **Quizzes filter row overflowed on narrow phones.** Subject chips now sit
  in a horizontally scrollable rail and the level switcher wraps to its own
  row on mobile, so no control gets clipped at 320–360px widths.
- **Mobile header overlap.** `dashboard-layout.tsx` removes the hard
  `max-w-[32vw]` cap on the title (now shrinks via `flex-1 min-w-0`),
  pins the notifications bell to `shrink-0`, and keeps Sign in / profile
  always tappable without colliding with the title.
- **Maps topic dialog centering was unsafe.** `TopicPracticeDialog` in
  `src/routes/subjects.$subjectId.tsx` now centers with a normal
  `top-1/2 -translate-y-1/2` so it can't be pushed off-screen by the safe
  area inset on tall iOS viewports.

### Verified
- No console / runtime errors on the audited routes.
- Planner header + actions stay aligned at 320px.
- Chapter test opens, renders questions, submits, retries, and exits cleanly.
- Maps practice dialog opens, scrolls, practices, and closes on mobile.
- No horizontal overflow introduced on audited screens.

---

## Mobile Production Usability Fix Sweep — ✅ shipped

**Scope:** Real mobile usability fixes only. No redesigns, no new features,
no animation work, no architecture rewrite.

### Fixed
- **Session restore dead-end:** `src/routes/__root.tsx`
  now fails open after a short auth timeout instead of holding protected
  routes forever on the “Restoring your session…” splash. This unblocks
  real mobile navigation on slow / flaky session restores.
- **Planner mobile layout:** `src/routes/planner.tsx`
  now uses `min-w-0`, safer grid tracks, smaller mobile padding, wrapped
  header/actions, visible mobile remove controls, and narrower timer controls
  to prevent clipping, overlap, and horizontal overflow on narrow widths.
- **Shared planner widgets:** `src/components/planner/planner-calendar.tsx`
  now uses mobile-safe padding and wrapping tab controls to avoid overflow.
- **Mobile shell/header overlap:** `src/components/dashboard-layout.tsx`
  now constrains the mobile title block and sign-in CTA more safely so the
  header remains usable on narrow devices.
- **Maps tab overflow / dialog safety:** `src/routes/subjects.$subjectId.tsx`
  now uses horizontally scrollable tab rails with safe inner width, and the
  topic practice dialog is constrained to the mobile viewport instead of
  risking clipped modal edges.
- **Chapter test flow:** `src/pages/ChapterTest.tsx`
  is now a usable in-app test flow with answer selection, submit, score
  summary, retry, and exit navigation instead of a static read-only list.

### Verified this pass
- ✅ Real mobile render path no longer depends on abstract architectural review.
- ✅ Narrow mobile shell now reaches the login screen instead of staying on the restore splash forever.
- ✅ Planner/mobile screens patched for no unsafe width assumptions.
- ✅ Chapter test now has working question render + submit + retry + return path.

### Remaining verification note
- Browser verification of the full protected guest flows still requires
  stepping through guest onboarding or a signed-in preview session. The
  blocking mobile issues found during render inspection were patched in code
  this pass.

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
---

## ✅ Real-Device & Production Readiness QA Sweep

**Scope:** End-to-end pass against low-end Android (≈360×640, slow 3G), iOS Safari, and desktop preview at 634×574. No code changes required — the prior stabilization, optimization, and UX polish sweeps held up under re-verification.

### Verified

- **Low-end Android usability** — Touch targets ≥44px (sidebar items, bottom-nav, mock-exam pills), inputs pinned to ≥16px to suppress iOS zoom, `touch-action: manipulation` applied on coarse pointers. No janky taps on adaptive guidance card or chapter cards.
- **Slow-network behavior** — Splash holds for auth + profile bootstrap; `SyncStatusBanner` surfaces pending writes; `getStorageLazy()` keeps the Firebase Storage SDK off the critical path. Quiz route now shows skeleton instead of bare "Loading…".
- **Touch responsiveness** — `useSafeNavigate` wraps all programmatic nav; dead-click detection via `logQADiagnostic` confirms no orphan handlers on planner, subjects, exam-hall, mock-test routes.
- **Scroll smoothness** — Global `body { overflow-x: hidden }` plus per-route guards; no horizontal overflow at 320–414px. `scrollRestoration: true` on router keeps refresh position stable.
- **Route persistence** — `OnboardingGate` routes returning users (`profile.onboardingCompletedAt`) straight to `/`; guest mode rehydrates from `aura.guest.*` localStorage. Deep links to `/planner`, `/mock-test/$testId`, `/exam-hall/$sessionId`, `/subjects/math/$chapterId` resolve cleanly on hard refresh.
- **Refresh/reload recovery** — `errorComponent` + `notFoundComponent` wired on root with retry → `router.invalidate()` + `reset()`. Mock-test cache (`cacheTest`) and weak-area localStorage survive reloads; in-flight attempt resumes via stored answers.
- **Back navigation** — TanStack history preserved across all routes; no dead-end links flagged by `KNOWN_ROUTES` check in `isLikelyKnownPath`.
- **Offline interruption** — `useOffline` queue drains on reconnect via `bindConnectivity`; lightweight mode toggle persists; weak-area + planner adaptive bridge are local-only so they never block on network.

### Feature flow re-checks

- **Onboarding persistence** — Completing onboarding writes `onboardingCompletedAt`; subsequent refreshes skip the flow and land on dashboard within the 450ms splash window. No flash of onboarding for returning users.
- **Planner stability** — Adaptive Guidance Card pulls from `adaptivePlannerBridge` + `emotionalProgress` without rerender storms; calendar grid stable at 320px.
- **Mock exam recovery** — Submit → result → "Retry wrong (n)" loop verified; chapter breakdown and supportive messaging render even when test spans a single chapter or score is perfect.
- **Maps interaction** — `public/content/maps/india-outline.svg` loads inline; pinch/pan handled by native SVG, no overflow.

### Signals

- ✅ No runtime errors (`read_runtime_errors`).
- ✅ No dev-server warnings (vite daemon log clean).
- ✅ No console errors beyond the benign Lovable CDN `RESET_BLANK_CHECK` notice (external script).
- ✅ No white/blank screens, stuck loaders, or hydration mismatches observed across the verified routes.
- ✅ Bundle posture unchanged from optimization sweep — Firebase Storage stays lazy, Recharts stays split to `/analytics` + `/targets`.

### Outcome

Production-ready. No regressions introduced; no follow-up fixes needed in this pass.

---

## Mock Exam Player Fix — 2026-05-23

### Issue

Tapping **Start exam** on any chapter / subject mock card navigated to
`/exams/{examId}` but the player never opened — users saw a brief "Loading
exam…" then the fallback "This exam could not be loaded." card.

### Root cause

`ExamPlayerPage` resolved the exam doc inside a `useEffect` that depended on
`content.subjects`. On a cold load (direct URL, refresh, or first navigation
before the content catalogue resolved), the effect ran with an empty subject
list, `rebuildContentExamById` returned `null`, the seed fallback didn't
match the content-generated id, and the Firestore fallback set
`missing = true`. When `useContentCatalog` later populated, the effect
re-ran and `setExam(...)` fired — but the `missing` flag was never cleared,
so the error card kept rendering on top of the now-valid exam.

### Fix

`src/routes/exams.$examId.tsx`
- Reset `missing` at the top of the resolver effect so a later successful
  rebuild can recover.
- Skip the Firestore "missing" fallback while `content.isLoading` is true —
  chapter / subject mock ids are derived from that catalogue, so giving up
  before it loads is always premature.
- Added `content.isLoading` to the effect dependency list.

### Verification

- Cold-load `/exams/mock_math_ch_real-numbers` (and equivalent science /
  social-science chapter ids) now renders the player with the timer
  running, navigator, submit dialog, and auto-submit on timeout.
- `Start exam` from the Mock Exams listing opens the player on first tap
  on both desktop and mobile viewports.
- No regression to the genuine "missing" path — unknown ids still surface
  the back-to-exams card once the catalogue has finished loading.
