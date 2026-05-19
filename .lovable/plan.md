# One-tap "Add to Today's Plan" from Textbooks

Add a button next to each chapter on `/textbooks` that creates a planner task for today (kind: `study`, source: `user`) pointing at that chapter + textbook URL. No new collections, no engine changes.

## What gets built

### 1. Tiny helper — `addUserPlannerTask`
`src/lib/planner-store.ts` already exposes `writePlannerTasks` (local-first, same store the planner reads from). Add a small helper next to it:

```ts
addUserPlannerTask({
  userId, dayKey, subjectId, chapterId, title,
  durationMinutes, kind: "study", url?,
}) : PlannerTaskDoc
```

It builds a `PlannerTaskDoc` (id = `user_${dayKey}_${chapterId}_${ts}`, `source: "user"`, `priority: 60`, `xp: 20`, status `pending`, `reasons: ["Added from Textbooks"]`) and appends via `writePlannerTasks`. The chapter URL is stashed in a new optional `link?: string` field on `PlannerTaskDoc` so the planner page can show an "Open textbook ↗" affordance.

### 2. Textbooks row — add button
On `/textbooks` each chapter row currently shows `[Open]`. Add a second button:

```text
Ch 1. Real Numbers    [+ Add to today]  [Open ↗]
```

Clicking it:
- Calls `addUserPlannerTask` with today's `dayKey`, subject/chapter ids, chapter title, `durationMinutes: 35`, and the textbook URL
- Shows a `sonner` toast: "Added to today's plan" with a "View planner" action that navigates to `/planner`
- Disables briefly + flips icon to a check for ~1.5s
- If a user-added task for the same chapter already exists today, the toast says "Already on today's plan" and skips the insert (dedupe on `subjectId + chapterId + dayKey + source=user`)

Button stays visible even when no textbook URL is linked — students can still plan the chapter.

### 3. Planner page — render the link
`src/routes/planner.tsx` already lists tasks. When a task has `link`, show a small "📘 Open" anchor next to the title. No layout redesign.

## Files

**Edited (3):**
- `src/integrations/firebase/types.ts` — add optional `link?: string` to `PlannerTaskDoc`
- `src/lib/planner-store.ts` — export `addUserPlannerTask` helper (~25 lines)
- `src/routes/textbooks.tsx` — add the "Add to today" button + toast
- `src/routes/planner.tsx` — render `task.link` when present (small edit; will read file first)

No new files. No new Firestore collections. No engine changes. ~50 lines of new logic total.

## Out of scope

- No "Add to a specific date" picker (always today). A follow-up can wrap it in a small popover if needed.
- No reordering or auto-regenerating the AI plan — the user-added task simply appears alongside engine-generated ones.
- No backend persistence beyond the existing local-first planner store.
