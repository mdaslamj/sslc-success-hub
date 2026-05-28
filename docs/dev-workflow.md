# Aura — Development Workflow

> **Lovable = visual generation · Cursor = engineering + refinement · GitHub = source of truth**

This project uses a three-layer workflow:

| Layer | Role |
|-------|------|
| **Cursor** | Engineering, architecture, engine logic, data integration, copy/spacing/formula tuning |
| **GitHub** | Source of truth — every stable change lands here |
| **Lovable** | One-time visual generation for new screens / major components; deployment preview |

Keep these layers synchronized continuously. Do not let large untracked local work accumulate.

---

## Lovable vs Cursor — strict generation rules

### Use Lovable ONLY when:

- Generating a **completely new screen**
- Creating a **major new visual component**
- Exploring a **new design direction / pivot**

### Use Cursor for everything else:

- Wording, copy, and spacing tweaks
- Formula values and layout refinements
- Animation timing and state logic
- Responsiveness and mobile polish
- Data integration and engine wiring
- Bug fixes and route behavior
- Academic content (subjects, chapters, planner tasks, mock exams)

**Do not** send copy tweaks, spacing, or data refactors back through Lovable.

### New-screen workflow (mandatory)

1. Write a concise **visual / product spec** in Cursor or docs.
2. Generate **once** in Lovable.
3. **Immediately copy** generated code into the repo.
4. Continue **all** edits, wiring, fixes, and refinements in Cursor.
5. Commit and push to GitHub; let Lovable sync from Git.

Avoid repeated Lovable regeneration cycles for the same screen.

### Academic data source

Karnataka SSLC subject/chapter metadata lives in `src/data/sslc-academic-catalog.ts`.  
Content JSON slugs under `public/content/chapters/` are authoritative for mock exams and resources.

---

## Branch workflow

- **`main`** — production-ready branch synced with Lovable deployment.
- **Feature branches** — use for risky or multi-day work:
  - `feat/planner-trajectory`
  - `fix/subject-resources`
  - `refactor/academic-state`
- Merge or rebase into `main` only after local validation passes.
- Avoid long-lived branches with hundreds of unstaged files.

---

## Commit frequency

Commit after **every meaningful completed task**, not at the end of a long session.

Good stopping points:

- A feature integrates and renders correctly
- A bug fix is verified on affected routes
- An engine or adapter layer is wired and typechecks
- A refactor leaves behavior unchanged and tests/build pass

Do **not** wait until “everything is done” if independent pieces are already stable.

---

## Commit naming convention

Use [Conventional Commits](https://www.conventionalcommits.org/) with an Aura scope:

```
<type>(<scope>): <short imperative summary>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Scopes:** `aura`, `planner`, `targets`, `subjects`, `exams`, `engine`, `content`

**Examples:**

```
feat(aura): integrate adaptive execution system with live trajectory feedback
fix(planner): resolve task state sync with localStorage
feat(targets): add trajectory gap compression animation
refactor(engine): centralize academic state adapters
fix(subjects): restore formulas tab chapter binding
docs: add dev workflow guidance
```

### Commit discipline rules

Commits should be:

- **Feature-based** — one logical change per commit when possible
- **Reversible** — easy to `git revert` without collateral damage
- **Descriptive** — explain *why*, not just *what*
- **Small enough** — isolate bugs to a single commit when something breaks

Prefer a 2–4 sentence commit body for non-trivial changes.

---

## When to push

Push to `origin` immediately after each stable commit on `main` (or after merging a verified feature branch).

**Always push when:**

- Integration work is approved
- Build and typecheck pass locally
- No temporary debug logs or WIP comments remain
- Routes affected by the change have been smoke-tested

**Do not push when:**

- `tsc` or `npm run build` fails
- Known broken routes or blank screens exist
- Debug-only logging was left unguarded

---

## Pre-commit validation checklist

Before every commit, verify:

- [ ] `npm run typecheck` (or `npx tsc --noEmit`) passes
- [ ] `npm run build` passes for significant UI/routing changes
- [ ] Routes still work — especially `/planner`, `/targets`, `/subjects/*`
- [ ] Mobile layout stable at ~375px width
- [ ] No console errors on affected pages
- [ ] Subject pages: Formulas / Topics / Resources tabs render content
- [ ] No temporary `console.log` / debug hooks left behind
- [ ] No secrets (`.env`, credentials) staged

Quick smoke routes:

```
/                  → dashboard loads
/planner           → trajectory panel + task list
/targets           → target gap + probability
/subjects/mathematics → chapters, formulas, topics
/exams/mock_*      → mock exam player opens
```

---

## Deployment validation (Lovable)

After pushing to GitHub:

1. Confirm the latest commit appears on `origin/main` (`git log origin/main -1`).
2. Open the Lovable project and verify it synced the new commit (Lovable pulls from GitHub).
3. Wait for the Lovable preview build to finish without errors.
4. Validate `/planner` in Lovable preview:
   - Execution trajectory panel renders
   - Task checkbox updates readiness / mastery / gap in real time
   - No hydration warnings or runtime errors in the browser console
5. Spot-check `/subjects/mathematics` formulas/topics if subject files changed.

If Lovable build fails, fix on a branch or locally, commit, push again — do not patch only in Lovable without syncing back to GitHub.

---

## Rollback guidance

### Revert a bad commit (safest)

```bash
git log --oneline -5          # find the bad SHA
git revert <sha>              # creates a new inverse commit
git push origin main
```

### Restore a single file from last good commit

```bash
git checkout origin/main -- path/to/file
```

### Emergency local reset (use carefully)

Only if the bad commit was **not** pushed:

```bash
git reset --hard HEAD~1
```

Never `git push --force` to `main` unless explicitly coordinated.

---

## Day-to-day loop

```
1. Complete task in Cursor
2. Run typecheck (+ build if routing/UI changed)
3. Smoke-test affected routes
4. git add <relevant files>
5. git commit -m "type(scope): summary" -m "Optional body"
6. git push origin main
7. Confirm Lovable sync + preview build
```

---

## Architecture reminder

- UI reads engine output through adapters (`src/core/academic-state/`, `src/hooks/useAuraEngines.ts`).
- Engines stay pure TypeScript — no React in `src/engines/`.
- Planner task completion should visibly shift trajectory via the execution adapter until AI prediction is fully wired.
- Parent route files with nested children **must** render `<Outlet />`.

---

## Related docs

- `docs/dev-status.md` — shipped fixes and verification history
- `docs/aura/AURA_PROMPT.txt` — product context for Aura features
