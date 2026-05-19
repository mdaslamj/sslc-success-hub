## Resources Hub — Plan

A centralized digital academic library accessible from the sidebar. Built on top of the existing `chapterResources` / `textbookLinks` / `chapterNotes` collections (already in `config.ts`) plus one new `resources` collection for top-level items that aren't tied to a single chapter (e.g. full textbooks, board papers, formula sheets).

### 1. Sidebar
Add **Resources** entry in the **Study** group of `src/components/app-sidebar.tsx`, icon `Library` (lucide), route `/resources`.

### 2. Routes
- `src/routes/resources.tsx` — main library page (list + filters + category tabs)
- `src/routes/resources.$resourceId.tsx` — optional detail view (defer if external link only — open in new tab instead)

### 3. Data model
**New collection `resources`** (top-level items, chapter-optional):
```
ResourceDoc {
  id, title, titleKn?,            // Kannada title
  description?, descriptionKn?,
  category: ResourceCategory,     // textbook | pyq | notes | worksheet | video | formula | qbank | revision
  subjectId?, chapterId?,         // both optional → enables subject-wide / global resources
  resourceType: ResourceKind,     // reuse existing ResourceKind enum
  url?,                           // external link (preferred)
  pdfPath?,                       // optional Firebase Storage path
  thumbnailUrl?, icon?,
  language: "en" | "kn" | "bilingual",
  tags: string[],
  isFeatured: boolean,            // for quick-access cards
  isOfficial: boolean,            // Karnataka board / NCERT
  year?: number,                  // for PYQs / board papers
  createdAt, updatedAt, createdBy
}
```
**New collection `resourceCategories`** (admin-curated category metadata: label, labelKn, icon, order, description). Seeded with the 8 categories above.

Add both to `COLLECTIONS` in `src/integrations/firebase/config.ts`.

### 4. Service layer
`src/integrations/firebase/services/resources.ts`:
- `fetchResources({ category?, subjectId?, chapterId?, language?, featured?, year? })`
- `fetchFeaturedResources(limit)`
- `fetchResourceCategories()`
- `upsertResource`, `bulkUpsertResources`
- `incrementResourceViews(id)` (lightweight usage tracking)

Export from `src/integrations/firebase/services/index.ts`.

### 5. UI — `/resources` page

```text
┌─────────────────────────────────────────────┐
│  Resources                                  │
│  Search ▢   Subject ▼   Chapter ▼   Lang ▼  │
├─────────────────────────────────────────────┤
│  Quick access                                │
│  [Karnataka Textbooks] [Board Papers]        │
│  [Formula Bank]        [Important PDFs]      │
├─────────────────────────────────────────────┤
│  Tabs: All | Textbooks | PYQs | Notes |     │
│        Worksheets | Videos | Formulas |      │
│        Question Banks | Revision             │
├─────────────────────────────────────────────┤
│  Grid of resource cards (icon, title,        │
│  subject chip, language chip, open ↗)        │
└─────────────────────────────────────────────┘
```
Mobile: filters collapse into a Sheet; tabs become a horizontal scroll row; grid becomes 1-col.

Components:
- `src/components/resources/resource-card.tsx` — compact card, opens external URL in new tab or downloads PDF
- `src/components/resources/resource-filters.tsx` — subject/chapter/language/year selects, responsive
- `src/components/resources/quick-access.tsx` — featured shortcuts

### 6. Integrations (lightweight, no redesign)
- **Chapters**: existing `ChapterResources` component (`src/components/chapter-resources.tsx`) gains a "View all in library" link → `/resources?subjectId=X&chapterId=Y`.
- **Quizzes**: in quiz result screen, suggest matching `revision` / `notes` resources via `fetchResources({ chapterId, category: 'notes' })`.
- **Planner**: when creating a task for a chapter, attach resource links (read-only display).
- **AI recommendations**: extend `recommendation-engine.ts` to emit a `resource` recommendation kind pointing to a resource id (data only, surfaced in existing recommendation widget — no new widget).

### 7. Admin import
Extend `src/routes/admin.import.tsx` with a "Resources" tab accepting JSON array of `ResourceDoc`. Reuses existing admin gate.

### 8. Security (`firestore.rules`)
- `resources`, `resourceCategories`: public read, admin-only write (mirrors existing pattern for `chapterResources`).

### 9. Out of scope
- No PDF upload UI in this pass (schema supports `pdfPath`, but uploads come later when Storage is wired).
- No app redesign, no new design tokens.
- No PYQ engine / frequency scoring (deferred to later PYQ system).
- No detail route — external links open in new tab.

### Files to create
- `src/routes/resources.tsx`
- `src/components/resources/resource-card.tsx`
- `src/components/resources/resource-filters.tsx`
- `src/components/resources/quick-access.tsx`
- `src/integrations/firebase/services/resources.ts`
- `src/hooks/use-resources.ts`
- `src/lib/resource-seed.ts` (default categories + a few Karnataka textbook entries)

### Files to edit
- `src/components/app-sidebar.tsx` (add Resources entry)
- `src/integrations/firebase/config.ts` (RESOURCES, RESOURCE_CATEGORIES constants)
- `src/integrations/firebase/types.ts` (`ResourceDoc`, `ResourceCategoryDoc`, `ResourceCategory` enum)
- `src/integrations/firebase/services/index.ts` (re-export)
- `src/components/chapter-resources.tsx` ("View all" link)
- `src/routes/admin.import.tsx` (Resources import tab)
- `src/lib/recommendation-engine.ts` (resource recommendation kind)
- `firestore.rules` (rules for new collections)
