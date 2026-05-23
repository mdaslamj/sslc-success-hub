/**
 * Aura Mock Exam Generator
 * -------------------------------------------------------------
 * Thin, lightweight layer over the Question Bank Service that
 * assembles ready-to-run exams. No UI here — pure data.
 *
 * All generators:
 *  - reuse `getQuestionBank()` (lazy-loaded + cached)
 *  - shuffle results
 *  - de-duplicate by question id
 *  - return a typed `GeneratedExam`
 */

import {
  getQuestionBank,
  normalizeSubject,
  type BankQuestion,
  type SubjectKey,
} from "./question-bank";

export type ExamKind =
  | "full-mock"
  | "chapter-test"
  | "weak-area"
  | "mixed-practice";

/** Counts keyed by question "bucket". Buckets cover both MCQs and mark-bands. */
export type QuestionBucket = "mcq" | "1-mark" | "2-mark" | "3-mark";

export type CountsByType = Partial<Record<QuestionBucket, number>>;

export interface GeneratedExam {
  kind: ExamKind;
  subject: SubjectKey;
  questions: BankQuestion[];
  totalMarks: number;
  meta: Record<string, unknown>;
}

// ---------- Public API ----------

/** A balanced board-style full mock: ~25 MCQs + spread across 1/2/3-mark. */
export async function generateFullMockExam(
  subject: SubjectKey | string,
  opts: { seed?: number } = {},
): Promise<GeneratedExam> {
  const key = normalizeSubject(subject);
  const bank = await getQuestionBank(key);
  const picks: BankQuestion[] = [];
  const seen = new Set<string>();

  const blueprint: CountsByType = {
    mcq: 15,
    "1-mark": 5,
    "2-mark": 6,
    "3-mark": 5,
  };

  for (const [bucket, n] of Object.entries(blueprint) as [
    QuestionBucket,
    number,
  ][]) {
    const pool = filterByBucket(bank.questions, bucket);
    pushUnique(picks, seen, sample(pool, n, opts.seed));
  }

  const shuffled = shuffle(picks, opts.seed);
  return {
    kind: "full-mock",
    subject: key,
    questions: shuffled,
    totalMarks: sumMarks(shuffled),
    meta: { blueprint },
  };
}

/** All questions belonging to one chapter (shuffled, de-duped). */
export async function generateChapterTest(
  subject: SubjectKey | string,
  chapterNumber: number,
  opts: { limit?: number; seed?: number } = {},
): Promise<GeneratedExam> {
  const key = normalizeSubject(subject);
  const bank = await getQuestionBank(key);
  const pool = bank.questions.filter((q) => q.chapter === chapterNumber);
  const unique = dedupe(pool);
  const shuffled = shuffle(unique, opts.seed);
  const questions = opts.limit ? shuffled.slice(0, opts.limit) : shuffled;
  return {
    kind: "chapter-test",
    subject: key,
    questions,
    totalMarks: sumMarks(questions),
    meta: { chapterNumber, chapterName: questions[0]?.chapter_name },
  };
}

/** Targeted practice across the learner's weak concepts / chapter names. */
export async function generateWeakAreaTest(
  subject: SubjectKey | string,
  weakTopics: string[],
  opts: { limit?: number; seed?: number } = {},
): Promise<GeneratedExam> {
  const key = normalizeSubject(subject);
  const bank = await getQuestionBank(key);
  const needles = (weakTopics ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const scored = bank.questions
    .map((q) => {
      const hay = [q.chapter_name ?? "", ...(q.concepts ?? [])]
        .join(" | ")
        .toLowerCase();
      let score = 0;
      for (const n of needles) if (hay.includes(n)) score += 1;
      return { q, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.q);

  const unique = dedupe(scored);
  const shuffled = shuffle(unique, opts.seed);
  const limit = opts.limit ?? 20;
  const questions = shuffled.slice(0, limit);
  return {
    kind: "weak-area",
    subject: key,
    questions,
    totalMarks: sumMarks(questions),
    meta: { weakTopics: needles },
  };
}

/** Custom mix: caller specifies how many of each bucket they want. */
export async function generateMixedPractice(
  subject: SubjectKey | string,
  countsByType: CountsByType,
  opts: { seed?: number } = {},
): Promise<GeneratedExam> {
  const key = normalizeSubject(subject);
  const bank = await getQuestionBank(key);

  const picks: BankQuestion[] = [];
  const seen = new Set<string>();
  for (const [bucket, n] of Object.entries(countsByType) as [
    QuestionBucket,
    number,
  ][]) {
    if (!n || n <= 0) continue;
    const pool = filterByBucket(bank.questions, bucket);
    pushUnique(picks, seen, sample(pool, n, opts.seed));
  }

  const shuffled = shuffle(picks, opts.seed);
  return {
    kind: "mixed-practice",
    subject: key,
    questions: shuffled,
    totalMarks: sumMarks(shuffled),
    meta: { countsByType },
  };
}

// ---------- Internals ----------

function filterByBucket(
  qs: BankQuestion[],
  bucket: QuestionBucket,
): BankQuestion[] {
  if (bucket === "mcq") {
    return qs.filter(
      (q) =>
        (q.type ?? "").toLowerCase() === "mcq" ||
        (Array.isArray(q.options) && q.options.length > 0),
    );
  }
  const marks = bucket === "1-mark" ? 1 : bucket === "2-mark" ? 2 : 3;
  return qs.filter((q) => q.marks === marks);
}

function dedupe(qs: BankQuestion[]): BankQuestion[] {
  const seen = new Set<string>();
  const out: BankQuestion[] = [];
  for (const q of qs) {
    if (!q?.id || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

function pushUnique(
  into: BankQuestion[],
  seen: Set<string>,
  add: BankQuestion[],
) {
  for (const q of add) {
    if (!q?.id || seen.has(q.id)) continue;
    seen.add(q.id);
    into.push(q);
  }
}

function sumMarks(qs: BankQuestion[]): number {
  return qs.reduce((s, q) => s + (Number(q.marks) || 0), 0);
}

function sample<T>(arr: T[], n: number, seed?: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  if (n >= arr.length) return shuffle(arr.slice(), seed);
  return shuffle(arr.slice(), seed).slice(0, n);
}

function shuffle<T>(a: T[], seed?: number): T[] {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}