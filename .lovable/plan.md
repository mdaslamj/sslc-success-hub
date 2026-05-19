# KTBS Textbook Link Library

Reuse the existing `libraryResources` collection (already supports `category`, `subjectId`, `chapterId`, `url`, `language`). No new schema, no new backend logic — just seed KTBS URLs and add a focused browsing page.

## Scope

- Browse KTBS textbooks by **Subject → Chapter**
- Open chapter PDFs directly via stored KTBS URLs (new tab)
- English + Kannada medium toggle
- Mobile-first, lightweight — no redesign of existing pages

## What gets built

### 1. Seed data (low credit cost)
`src/lib/ktbs-textbook-seed.ts` — a static array of `LibraryResourceDoc` entries with:
- `category: "textbook"`
- `resourceType: "pdf"`
- `isOfficial: true`, `tags: ["ktbs", "sslc"]`
- `subjectId`, `chapterId` (matching existing chapters)
- `url` → KTBS public PDF link
- `language: "en" | "kn"`

Seeded for SSLC Class 10 subjects already in the app (Math, Science, Social, English, Kannada, Hindi). One entry per chapter per medium. URLs sourced from https://ktbs.kar.nic.in.

A one-time admin seed action exposed at `/admin/import` (existing route) calls `bulkUpsertLibraryResources(KTBS_SEED)`.

### 2. Browsing UI
`src/routes/textbooks.tsx` — a new dedicated page:

```text
┌─────────────────────────────────────────┐
│ KTBS Textbooks       [English | Kannada]│
├─────────────────────────────────────────┤
│ Subject pills: [Math][Science][Social].. │
├─────────────────────────────────────────┤
│ Chapter 1 — Real Numbers      [Open ↗] │
│ Chapter 2 — Polynomials       [Open ↗] │
│ Chapter 3 — Pair of Linear …  [Open ↗] │
└─────────────────────────────────────────┘
```

- Uses existing `useLibraryResources({ category: "textbook", subjectId, language })`
- Groups results by `chapterId`, sorts by chapter number (joined with `fetchChapters`)
- Each row = chapter name + "Open" button that opens `url` in a new tab and fires `incrementLibraryResourceViews(id)`
- Empty state: "No textbook linked yet for this chapter."

### 3. Nav entry
Add **Textbooks** item to `src/components/app-sidebar.tsx` (BookOpen icon) linking to `/textbooks`. No other UI changes.

### 4. Light integration (optional, zero risk)
On `subjects.$subjectId.tsx`, surface a small "📘 Open KTBS textbook" link per chapter when a matching `libraryResources` entry exists. Reuses the same query — no new fetch path.

## Out of scope (to keep credits low)

- No in-app PDF viewer — links open KTBS URLs in a new tab (KTBS PDFs are public)
- No upload UI — textbooks are URL-only
- No new Firestore collections, types, services, or hooks
- No redesign of `/resources` page (it already lists textbooks alongside other categories; this new page is a focused subset)

## Files

**New (3):**
- `src/lib/ktbs-textbook-seed.ts`
- `src/routes/textbooks.tsx`
- `src/components/textbooks/chapter-link-row.tsx` (small presentational)

**Edited (2):**
- `src/components/app-sidebar.tsx` (1 nav item)
- `src/routes/admin.import.tsx` (1 button to seed KTBS links)

## Credit-saving notes

- Reuses all existing services/types — no new architecture
- Seed file is plain data — I'll start with **Math (15 chapters × 2 media = 30 entries)** as a sample, then you can paste URLs for other subjects yourself, or ask me to add them in a follow-up message
- If you already have a CSV/spreadsheet of KTBS URLs, share it and I'll convert it into the seed file in one cheap message
