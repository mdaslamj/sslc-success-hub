Create `src/styles/theme.ts` as a standalone, type-safe theme contract file. Export four values derived from the Aura engine contracts and existing StudentLearningProfile schema:

1. `ARCHETYPE_THEMES` — a record keyed by Archetype (`struggling`|`average`|`topper`). Each value is a full theme config containing:
   - `primary`, `accent`, `dim`, `badge`, `tone` (semantic color tokens mapped to Tailwind / oklch-compatible hex values)
   - `layoutDensity`: `simple` | `standard` | `advanced`
   - `showMetrics`: string[] (engine metrics the archetype should surface)
   Color choices follow the existing Cloud White / Deep Slate palette in `src/styles.css` and align with the archetype emotional tone from the profile JSON (reassurance for struggling, optimization for average, precision for topper).

2. `getUrgencyStyle(pct: number)` — a pure function that returns an object `{ color: string; label: string; background: string }` for four bands:
   - `0–24`: critical / destructive red tones
   - `25–49`: high / warning amber tones  
   - `50–74`: medium / info blue tones
   - `75–100`: low / success green tones
   Colors use the existing oklch semantic values from `styles.css` (success, warning, info, destructive) so dashboard cards can import them instead of hard-coding hexes.

3. `SUBJECT_COLORS` — a record mapping `math` → `#6366f1`, `science` → `#06b6d4`, `social` → `#f59e0b`. These match the engine contract colors already used in AuraFoundationViewer and the profile schema.

4. `SUBJECT_NAMES` — a record mapping `math` → `'Mathematics'`, `science` → `'Science'`, `social` → `'Social Science'`.

No engine, hook, or JSON files will be modified. The file will only be consumed by future dashboard components (not built in this task).