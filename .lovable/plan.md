## Update question-bank references to v3

Single source of truth: `src/lib/question-bank/index.ts` `FILE_MAP`. Everything (mock exam generator, chapter tests, weak-area picks) loads through `getQuestionBank()`, so updating the three paths is sufficient — no duplicate loaders exist.

### Changes
1. `src/lib/question-bank/index.ts`
   - `FILE_MAP.math` → `/content/question-banks/math_question_bank_v3.json`
   - `FILE_MAP.science` → `/content/question-banks/science_question_bank_v3.json`
   - `FILE_MAP["social-science"]` → `/content/question-banks/social_science_question_bank_v3.json`
   - Update the matching paths in the file-header doc comment.

2. `docs/dev-status.md` — note the v3 swap.

### Why it's safe
- v3 files keep the same `{ meta, blueprint, questions[] }` shape and `BankQuestion` field names (`id`, `chapter`, `chapter_name`, `marks`, `type`, `difficulty`, `concepts`, `options`, `answer`). Verified for all three subjects.
- Chapter mappings are preserved (`chapter` number + `chapter_name` still present).
- Mock exam blueprint (`mcq` / 1/2/3-mark buckets in `mockExamGenerator.ts`) filters by `type` + `marks` — both present in v3.
- In-memory cache + inflight guard already prevent duplicate loads.

### Verification
- Grep confirms no other code path references the old v2/v1 filenames.
- After the swap: open a chapter test and a mock exam to confirm questions render and submission works. No UI changes.

### Out of scope
No UI, no business-logic, no schema changes.