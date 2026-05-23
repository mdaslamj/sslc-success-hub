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