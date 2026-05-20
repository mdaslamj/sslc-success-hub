
# Project Aura — Premium Mobile Redesign

A full UI/UX transformation into a calm, native-feeling student companion. Backend intelligence (planner, tutoring, OCR, remediation, memory tracking, predictions, semantic reasoning) is left untouched — only presentation, navigation, and onboarding/log/profile flows change.

## Design language

- **Palette (Sage & Cream)**: cream surface `#f5f0e8`, soft sage card `#dce5d4`, sage accent `#a8c0a0`, deep sage primary `#7d9b76`. Dark mode mirrors with warm charcoal + muted sage.
- **Type**: Outfit (display/headings), Figtree (body/UI). Scale: 32 / 24 / 20 / 17 / 15 / 13.
- **Surfaces**: rounded-2xl/3xl cards, soft shadows, generous padding, no harsh borders.
- **Motion**: gentle 200–300ms ease, subtle scale-on-press for native feel.

## Information architecture

Replace sidebar shell with a **native bottom tab bar** (6 tabs): Home · Planner · Subjects · Exams · Analytics · Profile. Top app bar becomes minimal (greeting + avatar + notification).

## Screens

### 1. Onboarding (new flow `/onboarding`)
Multi-step, one question per screen, progress dots:
1. Welcome + name
2. Target marks (slider)
3. Weak subjects (chip multi-select)
4. Daily study capacity (slider, minutes)
5. Preferred language
6. Weekend study preference (toggle + intensity)
7. Revision intensity (light / balanced / intense)
8. Generating plan… → reveal AI-generated adaptive plan summary → "Start"
Persists to existing user profile + adaptive planner services.

### 2. Home (`/`) — single column
Sections, top to bottom:
- Calm greeting ("Good morning, Aanya 🌱") + tiny streak chip
- **Today's Focus** hero card (one chapter/task from planner)
- Revision reminders (due cards, swipeable list)
- Weak-topic interventions (2–3 cards from diagnosis engine)
- Board readiness summary (compact ring + delta)
- Motivational streak card (week dots + quote)

### 3. Analytics (`/analytics`)
- Mastery radar (subjects)
- Weak-topic heatmap
- Mastery progression line
- Study consistency calendar strip
- All wired to existing analytics/math-analytics hooks

### 4. Study Log (new `/log`, surfaced via Profile or Planner)
- Daily log entry (subject, chapter, minutes, mood)
- Streak ring + month calendar
- Spaced-repetition due overlays on calendar dates
- "Revision due today" list

### 5. Profile & Settings (`/profile`)
Grouped, iOS-style sections:
- Account (name, email, target marks, language)
- Appearance (theme: system/light/dark, accent picker)
- Study preferences (capacity, weekend, intensity)
- Privacy & data (export, deletion request)
- Subscription (placeholder)
- About / Sign out

### 6. Planner / Subjects / Exams
Keep existing logic; restyle into the new card system + bottom-nav layout.

## Technical plan

### Design system
- Rewrite `src/styles.css` tokens: cream/sage palette in `oklch`, new typography stack, radius (`--radius: 1.25rem`), spacing scale, accent CSS var (`--accent-personal`) for personalization.
- Add Outfit + Figtree via Google Fonts in `__root.tsx` head.
- Update `tailwind` semantic tokens (already token-driven via styles.css).

### Shell
- New `src/components/mobile-shell.tsx`: top bar + `<Outlet/>` + bottom tab bar.
- New `src/components/bottom-nav.tsx`: 6 tabs with active indicator, safe-area inset padding.
- Retire `DashboardLayout` usage on mobile (keep available, but routes adopt `MobileShell`).
- Add accent personalization via `ThemeContext` extension (writes `--accent-personal`).

### New routes / files
- `src/routes/onboarding.tsx` (+ step components in `src/components/onboarding/`)
- `src/routes/log.tsx` + `src/components/study-log/*`
- Redesigned `src/routes/index.tsx`, `analytics.tsx`, `profile.tsx`
- Restyled `planner.tsx`, `subjects.index.tsx`, `exams.tsx`

### New components
- `home/greeting-card`, `home/today-focus`, `home/revision-reminders`, `home/weak-topic-card`, `home/readiness-summary`, `home/streak-card`
- `analytics/mastery-radar`, `analytics/weak-heatmap`, `analytics/consistency-strip`
- `study-log/log-entry-form`, `study-log/calendar-grid`, `study-log/streak-ring`
- `settings/section-group`, `settings/accent-picker`, `settings/theme-toggle`
- `ui/bottom-sheet` (radix Drawer wrapper) for native-feeling forms

### Backend integration
- Onboarding writes to existing `users` profile service + seeds adaptive plan via existing planner.
- Study Log uses existing `study-sessions` + `revision-queue` services; add thin `study-log` service only if a dedicated collection is needed (otherwise reuse).
- All redesigned cards consume existing hooks: `useAdaptivePlanner`, `useBoardReadiness`, `useWeaknessDiagnosis`, `useMemoryTracking`, `useAnalytics`, `useMathMastery`, `useRecommendations`.
- No changes to: tutoring, OCR evaluation, remediation, semantic reasoning, prediction engines.

### Routing / first-run
- `__root.tsx` checks profile `onboardingComplete`; redirects authenticated users without it to `/onboarding`.
- Bottom nav hidden on `/login`, `/onboarding`, `/forgot-password`.

### Mobile hardening
- `pb-[max(env(safe-area-inset-bottom),0.75rem)]` on bottom nav and scroll containers.
- All new touch targets ≥ 44px.
- Lazy-load analytics charts (already chunked by route).

## Out of scope (explicitly)
- No changes to AI engines, evaluation pipelines, Firestore rules, or service-function logic.
- No PWA service worker (separate roadmap item).
- No Play Store packaging — UX prep only.

## Deliverables
1. Updated design tokens + fonts
2. `MobileShell` + `BottomNav`
3. Onboarding flow (8 steps)
4. Redesigned Home, Analytics, Profile
5. Study Log screen + components
6. Restyled Planner / Subjects / Exams to new system
7. Accent personalization wired through ThemeContext

Approve to start implementing in this order: tokens → shell+nav → home → onboarding → study log → analytics → profile → restyle remaining tabs.
