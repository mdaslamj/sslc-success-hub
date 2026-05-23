/**
 * Aura Question Bank Service
 * -------------------------------------------------------------
 * Unified, lazy-loaded access to the three subject question banks:
 *
 *   math           -> /content/question-banks/math_question_bank_v2.json
 *   science        -> /content/question-banks/science_question_bank.json
 *   social-science -> /content/question-banks/social_science_question_bank_v2.json
 *
 * Each bank ships in the same shape: { meta, blueprint, questions[] }.
 * Subject ids are normalized internally so callers can pass any of the
 * common variants (e.g. "mathematics", "math", "social_science").
 *
 * Public API (kept stable for backward compatibility):
 *   - getQuestionBank(subject)
 *   - getQuestionsByChapter(subject, chapter)
 *   - getQuestionsByType(subject, type)
 *   - getRandomQuestions(subject, count, opts?)
 *   - getWeakAreaQuestions(subject, weakConcepts, opts?)
 */

export type SubjectKey = "math" | "science" | "social-science";

export type Difficulty = "easy" | "medium" | "hard" | string;

export interface BankQuestion {
  id: string;
  chapter: number;
  chapter_name: string;
  /** Social Science only: History | Geography | Civics | Economics | Business Studies */
  subject?: string;
  /** Science only: Physics | Chemistry | Biology */
  part?: string;
  source?: string;
  section?: string;
  marks: number;
  type: string; // mcq | direct | calculation | ...
  difficulty: Difficulty;
  question: string;
  options?: string[];
  answer?: string;
  concepts?: string[];
  [k: string]: unknown;
}

export interface QuestionBank {
  meta: Record<string, unknown>;
  blueprint: Record<string, unknown>;
  questions: BankQuestion[];
}

const FILE_MAP: Record<SubjectKey, string> = {
  math: "/content/question-banks/math_question_bank_v2.json",
  science: "/content/question-banks/science_question_bank.json",
  "social-science": "/content/question-banks/social_science_question_bank_v2.json",
};

/** Accept common aliases and return the canonical subject key. */
export function normalizeSubject(input: string): SubjectKey {
  const s = input.trim().toLowerCase().replace(/_/g, "-");
  if (s === "math" || s === "maths" || s === "mathematics") return "math";
  if (s === "science" || s === "sci") return "science";
  if (
    s === "social-science" ||
    s === "social-studies" ||
    s === "socialscience" ||
    s === "social" ||
    s === "ss"
  )
    return "social-science";
  throw new Error(`Unknown subject for question bank: "${input}"`);
}

// ---------- Lazy in-memory cache ----------
const cache = new Map<SubjectKey, QuestionBank>();
const inflight = new Map<SubjectKey, Promise<QuestionBank>>();

/** Lazy-load a subject's question bank. Cached after first call. */
export async function getQuestionBank(
  subject: SubjectKey | string,
): Promise<QuestionBank> {
  const key = normalizeSubject(subject);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(FILE_MAP[key]);
    if (!res.ok) {
      throw new Error(
        `Failed to load question bank for ${key} (${res.status})`,
      );
    }
    const data = (await res.json()) as QuestionBank;
    if (!data || !Array.isArray(data.questions)) {
      throw new Error(`Malformed question bank for ${key}`);
    }
    cache.set(key, data);
    inflight.delete(key);
    return data;
  })();

  inflight.set(key, p);
  return p;
}

/** Questions belonging to a single chapter (by number or by name, case-insensitive). */
export async function getQuestionsByChapter(
  subject: SubjectKey | string,
  chapter: number | string,
): Promise<BankQuestion[]> {
  const bank = await getQuestionBank(subject);
  if (typeof chapter === "number") {
    return bank.questions.filter((q) => q.chapter === chapter);
  }
  const needle = chapter.trim().toLowerCase();
  return bank.questions.filter(
    (q) => (q.chapter_name ?? "").toLowerCase() === needle,
  );
}

/** Questions filtered by question type (mcq, direct, calculation, ...). */
export async function getQuestionsByType(
  subject: SubjectKey | string,
  type: string,
): Promise<BankQuestion[]> {
  const bank = await getQuestionBank(subject);
  const t = type.trim().toLowerCase();
  return bank.questions.filter((q) => (q.type ?? "").toLowerCase() === t);
}

export interface RandomOptions {
  chapter?: number | string;
  type?: string;
  difficulty?: Difficulty;
  /** Optional deterministic seed for reproducible picks. */
  seed?: number;
}

/** Random sample of N questions with optional filters. */
export async function getRandomQuestions(
  subject: SubjectKey | string,
  count: number,
  opts: RandomOptions = {},
): Promise<BankQuestion[]> {
  const bank = await getQuestionBank(subject);
  let pool = bank.questions;
  if (opts.chapter !== undefined) {
    pool =
      typeof opts.chapter === "number"
        ? pool.filter((q) => q.chapter === opts.chapter)
        : pool.filter(
            (q) =>
              (q.chapter_name ?? "").toLowerCase() ===
              String(opts.chapter).toLowerCase(),
          );
  }
  if (opts.type) {
    const t = opts.type.toLowerCase();
    pool = pool.filter((q) => (q.type ?? "").toLowerCase() === t);
  }
  if (opts.difficulty) {
    const d = opts.difficulty.toLowerCase();
    pool = pool.filter((q) => (q.difficulty ?? "").toLowerCase() === d);
  }
  return sampleN(pool, count, opts.seed);
}

/**
 * Questions matched against weak concepts/chapters/topics for the learner.
 * Matches on `concepts[]` and `chapter_name`, case-insensitive substring.
 */
export async function getWeakAreaQuestions(
  subject: SubjectKey | string,
  weakAreas: string[],
  opts: { limit?: number } = {},
): Promise<BankQuestion[]> {
  if (!weakAreas?.length) return [];
  const bank = await getQuestionBank(subject);
  const needles = weakAreas
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  const scored = bank.questions
    .map((q) => {
      const hay = [
        q.chapter_name ?? "",
        ...(q.concepts ?? []),
      ]
        .join(" | ")
        .toLowerCase();
      let score = 0;
      for (const n of needles) if (hay.includes(n)) score += 1;
      return { q, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.q);

  return opts.limit ? scored.slice(0, opts.limit) : scored;
}

// ---------- internals ----------
function sampleN<T>(arr: T[], n: number, seed?: number): T[] {
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

/** Test-only: clear caches. */
export function __resetQuestionBankCache() {
  cache.clear();
  inflight.clear();
}