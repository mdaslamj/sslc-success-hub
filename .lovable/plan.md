## Problem

On `/resources?subjectId=math&chapterId=m1` the page shows "No resources match these filters yet" and there is nothing to open. The chapter PDFs are seeded, but they never match the chapter the user clicked.

### Root cause

Two different seeders write chapters with **different ID schemes**:

| Seeder | Route | Chapter doc IDs |
|---|---|---|
| `seedFirestore()` (uses `mock-data.subjectChapters`) | `/seed` | `m1`, `m2`, …, `s1`, `ss1`, `e1`, `k1`, `h1` |
| `importSyllabus()` (KARNATAKA_SSLC) | `/admin/import` | `math_ch01`, `science_ch01`, `social_ch01` |

The app on this device was populated via `/seed`, so Firestore has chapters with IDs `m1`, `s1`, `ss1`… But `src/lib/ktbs-textbook-seed.ts` hard-codes `chapterId: math_ch01` etc. → every textbook resource is orphaned, and `/resources?chapterId=m1` correctly returns zero matches.

`src/components/chapter-resources.tsx` passes `chapter.id` (the real Firestore doc id) into the `<Link to="/resources">`, so the link itself is correct. The only fix needed is on the seed side.

## Fix

Update `src/lib/ktbs-textbook-seed.ts` so each chapter entry emits resources for **both** ID schemes — the mock seed (`m{n}`, `s{n}`, `ss{n}`) and the syllabus importer (`math_ch01`, …). That way the textbook library works regardless of which seeder the user ran.

Concretely:

- Add a subject config: `{ subjectId: "math", chapterIds: (n) => ["m" + n, "math_ch" + pad(n)] }`, same for `science` → `["s" + n, "science_ch" + pad(n)]` and `social` → `["ss" + n, "social_ch" + pad(n)]`.
- For each chapter + language, generate one `LibraryResourceDoc` per `chapterIds[]` variant, with deterministic ids like `ktbs_math_m1_en` and `ktbs_math_math_ch01_en` so the upsert stays idempotent.
- No changes to the seeding flow, no new collections, no schema changes. Re-running "Seed KTBS textbooks" on `/admin/import` will populate both variants.

## After the change

- User goes to `/admin/import` and clicks **Seed KTBS textbooks** again (one click).
- Clicking a chapter from the subject page now lands on `/resources?subjectId=math&chapterId=m1` with the matching NCERT/KTBS PDF row, with **Open** and **Add to today** buttons working as before.
- `/textbooks` continues to work unchanged (it filters by `subjectId` only).

## Out of scope

- Reconciling the two seeders into a single canonical chapter set (separate cleanup).
- Adding per-chapter Kannada PDFs (KTBS doesn't expose them; we still link to the subject contents page).
