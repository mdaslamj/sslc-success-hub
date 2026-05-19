import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  MathChapterDoc,
  MathCommonMistakeDoc,
  MathFormulaDoc,
  MathImportCounts,
  MathImportDraftDoc,
  MathImportIssue,
  MathImportPayload,
  MathImportSource,
  MathKeywordDoc,
  MathModelAnswerDoc,
  MathQuestionDoc,
  MathQuestionType,
  MathRubricDoc,
} from "../types";
import { SSLC_MATH_INTELLIGENCE_SEED } from "../syllabus/sslc-math-intelligence";

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

const KINDS = [
  "chapters",
  "questions",
  "modelAnswers",
  "formulas",
  "rubrics",
  "keywords",
  "commonMistakes",
] as const;

export type MathImportKind = (typeof KINDS)[number];

export function parseMathImportJson(text: string): {
  payload: MathImportPayload;
  issues: MathImportIssue[];
} {
  const issues: MathImportIssue[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Expected an object with one or more of: " + KINDS.join(", "));
  const obj = raw as Record<string, unknown>;
  const payload: MathImportPayload = {};
  for (const k of KINDS) {
    if (obj[k] === undefined) continue;
    if (!Array.isArray(obj[k])) {
      issues.push({ level: "error", message: `${k} must be an array`, path: k });
      continue;
    }
    // Trust the shape; validateMathImport runs stronger checks below.
    (payload as Record<MathImportKind, unknown>)[k] = obj[k] as never;
  }
  return { payload, issues };
}

// ---------------------------------------------------------------------------
// CSV parsing — header-driven, pipe-separated arrays.
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const arr = (s: string): string[] =>
  s ? s.split("|").map((x) => x.trim()).filter(Boolean) : [];
const num = (s: string, fallback = 0): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (s: string): boolean => /^(true|1|yes|y)$/i.test(s.trim());
const now = () => Date.now();

export function parseMathImportCsv(
  text: string,
  kind: MathImportKind,
): { payload: MathImportPayload; issues: MathImportIssue[] } {
  const rows = parseCsv(text);
  const issues: MathImportIssue[] = [];
  const t = now();

  switch (kind) {
    case "questions": {
      const questions: MathQuestionDoc[] = rows.map((r, idx) => {
        const qType = (r.questionType || "1mark") as MathQuestionType;
        return {
          id: r.id || `q_${idx}_${t}`,
          chapterId: r.chapterId,
          subjectId: "math",
          questionType: qType,
          marks: num(r.marks, 1),
          difficulty: ((r.difficulty || "medium").toLowerCase()) as MathQuestionDoc["difficulty"],
          statement: r.statement,
          options: r.options ? arr(r.options) : undefined,
          correctOption: r.correctOption !== "" ? num(r.correctOption, 0) : undefined,
          requiredFormulaIds: arr(r.requiredFormulaIds),
          keywordIds: arr(r.keywordIds),
          rubricId: r.rubricId || undefined,
          metadata: {
            boardFrequency: num(r.boardFrequency, 0),
            isRepeatedBoardQ: num(r.boardFrequency, 0) >= 2,
            lastAppearedYears: arr(r.lastAppearedYears).map((y) => num(y, 0)).filter(Boolean),
            isImportant: bool(r.isImportant),
            commonMistakeIds: arr(r.commonMistakeIds),
            estimatedSolvingTime: num(r.estimatedSolvingTime, 60),
          },
          source: r.source || undefined,
          tags: arr(r.tags),
          updatedAt: t,
        };
      });
      return { payload: { questions }, issues };
    }
    case "formulas": {
      const formulas: MathFormulaDoc[] = rows.map((r, idx) => ({
        id: r.id || `f_${idx}_${t}`,
        chapterIds: arr(r.chapterIds),
        label: r.label,
        expression: r.expression,
        description: r.description || undefined,
        category: (r.category || "other") as MathFormulaDoc["category"],
        commonUsageNotes: r.commonUsageNotes || undefined,
        updatedAt: t,
      }));
      return { payload: { formulas }, issues };
    }
    case "modelAnswers": {
      const modelAnswers: MathModelAnswerDoc[] = rows.map((r, idx) => {
        let steps: MathModelAnswerDoc["steps"] = [];
        try {
          steps = r.steps ? JSON.parse(r.steps) : [];
        } catch {
          issues.push({
            level: "error",
            message: `Row ${idx + 1}: invalid JSON in 'steps' column`,
            path: `modelAnswers[${idx}].steps`,
          });
        }
        return {
          id: r.questionId,
          questionId: r.questionId,
          chapterId: r.chapterId,
          steps,
          finalAnswer: r.finalAnswer,
          totalMarks: num(r.totalMarks, 0),
          updatedAt: t,
        };
      });
      return { payload: { modelAnswers }, issues };
    }
    case "keywords": {
      const keywords: MathKeywordDoc[] = rows.map((r, idx) => ({
        id: r.id || `kw_${idx}_${t}`,
        term: r.term,
        synonyms: arr(r.synonyms),
        chapterIds: arr(r.chapterIds),
        weight: r.weight ? num(r.weight, 0.5) : 0.5,
        updatedAt: t,
      }));
      return { payload: { keywords }, issues };
    }
    case "commonMistakes": {
      const commonMistakes: MathCommonMistakeDoc[] = rows.map((r, idx) => ({
        id: r.id || `cm_${idx}_${t}`,
        chapterId: r.chapterId,
        title: r.title,
        description: r.description,
        triggerKeywords: arr(r.triggerKeywords),
        correction: r.correction,
        updatedAt: t,
      }));
      return { payload: { commonMistakes }, issues };
    }
    default:
      throw new Error(`Unsupported CSV kind: ${kind}`);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const Q_TYPES: MathQuestionType[] = [
  "mcq",
  "1mark",
  "2mark",
  "3mark",
  "5mark",
  "hots",
  "competency",
];

const DEFAULT_MARKS: Record<MathQuestionType, number> = {
  mcq: 1,
  "1mark": 1,
  "2mark": 2,
  "3mark": 3,
  "5mark": 5,
  hots: 4,
  competency: 4,
};

export function validateMathImport(
  payload: MathImportPayload,
  existingChapterIds: Set<string> = new Set(),
): MathImportIssue[] {
  const issues: MathImportIssue[] = [];
  const allChapterIds = new Set<string>(existingChapterIds);
  (payload.chapters ?? []).forEach((c) => allChapterIds.add(c.id));

  // Duplicate id detection per collection.
  for (const k of KINDS) {
    const list = (payload[k] ?? []) as { id?: string }[];
    const seen = new Set<string>();
    list.forEach((row, idx) => {
      const id = row.id;
      if (!id) {
        issues.push({ level: "error", message: `${k}[${idx}] missing id`, path: `${k}[${idx}].id` });
        return;
      }
      if (seen.has(id))
        issues.push({
          level: "error",
          message: `${k}[${idx}] duplicate id "${id}" in payload`,
          path: `${k}[${idx}].id`,
        });
      seen.add(id);
    });
  }

  // Question-specific rules.
  (payload.questions ?? []).forEach((q, i) => {
    if (!q.chapterId)
      issues.push({ level: "error", message: `questions[${i}] missing chapterId` });
    else if (allChapterIds.size > 0 && !allChapterIds.has(q.chapterId))
      issues.push({
        level: "warning",
        message: `questions[${i}] references unknown chapter "${q.chapterId}"`,
      });
    if (!Q_TYPES.includes(q.questionType))
      issues.push({ level: "error", message: `questions[${i}] invalid questionType` });
    if (q.questionType === "mcq") {
      if (!q.options || q.options.length < 2)
        issues.push({ level: "error", message: `questions[${i}] MCQ needs 2+ options` });
      else if (
        q.correctOption === undefined ||
        q.correctOption < 0 ||
        q.correctOption >= q.options.length
      )
        issues.push({
          level: "error",
          message: `questions[${i}] correctOption out of range`,
        });
    }
    const expected = DEFAULT_MARKS[q.questionType];
    if (expected && q.marks !== expected && q.questionType !== "hots" && q.questionType !== "competency")
      issues.push({
        level: "warning",
        message: `questions[${i}] marks=${q.marks} differs from default ${expected} for ${q.questionType}`,
      });
    if (!q.statement || q.statement.trim().length === 0)
      issues.push({ level: "error", message: `questions[${i}] empty statement` });
  });

  // Model answers reference questions.
  const qIds = new Set((payload.questions ?? []).map((q) => q.id));
  (payload.modelAnswers ?? []).forEach((m, i) => {
    if (qIds.size > 0 && !qIds.has(m.questionId))
      issues.push({
        level: "warning",
        message: `modelAnswers[${i}] questionId "${m.questionId}" not in payload questions`,
      });
    if (!m.finalAnswer)
      issues.push({ level: "error", message: `modelAnswers[${i}] missing finalAnswer` });
  });

  // Formulas reference chapters.
  (payload.formulas ?? []).forEach((f, i) => {
    if (!f.label || !f.expression)
      issues.push({ level: "error", message: `formulas[${i}] needs label and expression` });
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Auto-tagging
// ---------------------------------------------------------------------------

export function applyAutoTags(payload: MathImportPayload): MathImportPayload {
  const importantFormulaIds = new Set<string>();
  (payload.formulas ?? []).forEach((f) => {
    const notes = (f.commonUsageNotes ?? "").toLowerCase();
    if (notes.includes("must-know") || notes.includes("important"))
      importantFormulaIds.add(f.id);
  });

  const questions = (payload.questions ?? []).map((q) => {
    const tags = new Set<string>(q.tags ?? []);
    if (q.metadata.boardFrequency >= 2) tags.add("repeated-board");
    if (q.questionType === "competency") tags.add("competency");
    if (q.questionType === "hots") tags.add("hots");
    if (q.requiredFormulaIds?.some((id) => importantFormulaIds.has(id)))
      tags.add("important-formula");
    if (q.metadata.isImportant) tags.add("important");
    return {
      ...q,
      tags: Array.from(tags),
      metadata: {
        ...q.metadata,
        isRepeatedBoardQ:
          q.metadata.isRepeatedBoardQ || q.metadata.boardFrequency >= 2,
      },
    };
  });

  return { ...payload, questions };
}

// ---------------------------------------------------------------------------
// Counts helper
// ---------------------------------------------------------------------------

export function countPayload(p: MathImportPayload): MathImportCounts {
  return {
    chapters: p.chapters?.length ?? 0,
    questions: p.questions?.length ?? 0,
    modelAnswers: p.modelAnswers?.length ?? 0,
    formulas: p.formulas?.length ?? 0,
    rubrics: p.rubrics?.length ?? 0,
    keywords: p.keywords?.length ?? 0,
    commonMistakes: p.commonMistakes?.length ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Batched writes
// ---------------------------------------------------------------------------

const COLL_FOR: Record<MathImportKind, string> = {
  chapters: COLLECTIONS.MATH_CHAPTERS,
  questions: COLLECTIONS.MATH_QUESTIONS,
  modelAnswers: COLLECTIONS.MATH_MODEL_ANSWERS,
  formulas: COLLECTIONS.MATH_FORMULAS,
  rubrics: COLLECTIONS.MATH_RUBRICS,
  keywords: COLLECTIONS.MATH_KEYWORDS,
  commonMistakes: COLLECTIONS.MATH_COMMON_MISTAKES,
};

async function batchWrite<T extends { id: string }>(
  collName: string,
  rows: T[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = rows.slice(i, i + CHUNK);
    for (const row of slice) {
      batch.set(doc(db, collName, row.id), {
        ...row,
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
    written += slice.length;
  }
  return written;
}

export async function importMath(
  rawPayload: MathImportPayload,
  opts: { dryRun?: boolean; autoTag?: boolean } = {},
): Promise<MathImportCounts> {
  const payload = opts.autoTag === false ? rawPayload : applyAutoTags(rawPayload);
  const counts = countPayload(payload);
  if (opts.dryRun) return counts;
  for (const k of KINDS) {
    const rows = (payload[k] ?? []) as { id: string }[];
    await batchWrite(COLL_FOR[k], rows);
  }
  return counts;
}

export async function importMathFromSeed(): Promise<MathImportCounts> {
  return importMath(SSLC_MATH_INTELLIGENCE_SEED as MathImportPayload);
}

/**
 * Named entry point for the empty-state "Seed Math data" button.
 * Writes the bundled SSLC Math intelligence seed (chapters, formulas,
 * questions, model answers, rubrics, keywords, common mistakes) into
 * Firestore. Admin-only — enforced by Firestore Security Rules.
 */
export async function seedMathData(): Promise<MathImportCounts> {
  return importMathFromSeed();
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export async function saveMathImportDraft(
  draft: Omit<MathImportDraftDoc, "id" | "createdAt" | "status"> & {
    id?: string;
    status?: MathImportDraftDoc["status"];
  },
): Promise<string> {
  const id = draft.id ?? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: MathImportDraftDoc = {
    id,
    createdAt: Date.now(),
    status: draft.status ?? "pending",
    source: draft.source,
    createdBy: draft.createdBy,
    payload: draft.payload,
    counts: draft.counts,
    validationIssues: draft.validationIssues,
    notes: draft.notes,
  };
  await setDoc(doc(db, COLLECTIONS.MATH_IMPORT_DRAFTS, id), full);
  return id;
}

export async function listMathImportDrafts(): Promise<MathImportDraftDoc[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MATH_IMPORT_DRAFTS), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MathImportDraftDoc, "id">) }));
}

export async function deleteMathImportDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.MATH_IMPORT_DRAFTS, id));
}

export async function publishMathImportDraft(
  draft: MathImportDraftDoc,
): Promise<MathImportCounts> {
  const counts = await importMath(draft.payload);
  await setDoc(
    doc(db, COLLECTIONS.MATH_IMPORT_DRAFTS, draft.id),
    { ...draft, status: "approved", publishedAt: Date.now() },
  );
  return counts;
}

export async function rejectMathImportDraft(id: string): Promise<void> {
  const drafts = await listMathImportDrafts();
  const d = drafts.find((x) => x.id === id);
  if (!d) return;
  await setDoc(doc(db, COLLECTIONS.MATH_IMPORT_DRAFTS, id), {
    ...d,
    status: "rejected",
  });
}

export const CSV_HEADER_HINTS: Record<MathImportKind, string> = {
  chapters: "(use JSON tab for chapters)",
  rubrics: "(use JSON tab for rubrics)",
  questions:
    "id,chapterId,questionType,marks,difficulty,statement,options,correctOption,requiredFormulaIds,keywordIds,rubricId,boardFrequency,lastAppearedYears,isImportant,commonMistakeIds,estimatedSolvingTime,source,tags",
  formulas: "id,chapterIds,label,expression,description,category,commonUsageNotes",
  modelAnswers: "questionId,chapterId,finalAnswer,totalMarks,steps",
  keywords: "id,term,synonyms,chapterIds,weight",
  commonMistakes: "id,chapterId,title,description,triggerKeywords,correction",
};