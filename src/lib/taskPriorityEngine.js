/**
 * Task priority engine — ranks SSLC chapters for today's planner.
 * Formula: (Marks At Risk × Probability Impact × Exam Weight) ÷ Cognitive Load
 */

/** @typedef {'Easy'|'Medium'|'Hard'} Difficulty */

/**
 * @typedef {Object} PlannerSubject
 * @property {string} id
 * @property {string} name
 * @property {string} [color]
 * @property {number} target
 * @property {number} predicted
 * @property {number} [mastery]
 * @property {string} [emoji]
 */

/**
 * @typedef {Object} PlannerChapter
 * @property {string} id
 * @property {string} title
 * @property {string} subjectId
 * @property {number} mastery
 * @property {number} [blueprintMarks]
 * @property {Difficulty} [difficulty]
 */

import { getWhyText, masteryToLevel } from "./whyTextCache";

const STATUS_BANDS = {
  critical: { key: "critical", label: "Critical", color: "#F87171", bg: "rgba(248,113,113,0.15)" },
  fragile: { key: "fragile", label: "Fragile", color: "#FBBF24", bg: "rgba(251,191,36,0.15)" },
  recoverable: { key: "recoverable", label: "Recoverable", color: "#38BDF8", bg: "rgba(56,189,248,0.15)" },
  stable: { key: "stable", label: "Stable", color: "#4ADE80", bg: "rgba(74,222,128,0.15)" },
  strong: { key: "strong", label: "Strong", color: "#C084FC", bg: "rgba(192,132,252,0.15)" },
};

const COGNITIVE_LOAD = { Easy: 1, Medium: 1.5, Hard: 2.2 };

export const SAMPLE_SUBJECTS = [
  { id: "math", name: "Mathematics", color: "oklch(0.6 0.18 250)", target: 85, predicted: 88, mastery: 74, emoji: "📐" },
  { id: "science", name: "Science", color: "oklch(0.65 0.16 145)", target: 80, predicted: 84, mastery: 69, emoji: "🧪" },
  { id: "social", name: "Social Science", color: "oklch(0.68 0.15 60)", target: 75, predicted: 82, mastery: 78, emoji: "🌍" },
  { id: "english", name: "English", color: "oklch(0.6 0.17 310)", target: 85, predicted: 86, mastery: 80, emoji: "📘" },
  { id: "kannada", name: "Kannada", color: "oklch(0.62 0.18 25)", target: 82, predicted: 86, mastery: 72, emoji: "ಕ" },
  { id: "hindi", name: "Hindi", color: "oklch(0.65 0.16 20)", target: 72, predicted: 74, mastery: 60, emoji: "ह" },
];

export const SAMPLE_CHAPTERS = [
  { id: "quadratic-equations", title: "Quadratic Equations", subjectId: "math", mastery: 54, blueprintMarks: 8, difficulty: "Hard" },
  { id: "electricity", title: "Electricity", subjectId: "science", mastery: 44, blueprintMarks: 8, difficulty: "Hard" },
  { id: "carbon-and-its-compounds", title: "Carbon and its Compounds", subjectId: "science", mastery: 65, blueprintMarks: 8, difficulty: "Hard" },
  { id: "triangles", title: "Triangles", subjectId: "math", mastery: 76, blueprintMarks: 10, difficulty: "Hard" },
  { id: "introduction-to-trigonometry", title: "Introduction to Trigonometry", subjectId: "math", mastery: 62, blueprintMarks: 8, difficulty: "Hard" },
  { id: "chapter_01_banking_transactions", title: "Banking Transactions", subjectId: "social", mastery: 64, blueprintMarks: 3, difficulty: "Medium" },
  { id: "real-numbers", title: "Real Numbers", subjectId: "math", mastery: 85, blueprintMarks: 6, difficulty: "Medium" },
  { id: "polynomials", title: "Polynomials", subjectId: "math", mastery: 78, blueprintMarks: 4, difficulty: "Medium" },
  { id: "chapter_07_freedom_struggle", title: "The Freedom Struggle", subjectId: "social", mastery: 82, blueprintMarks: 5, difficulty: "Medium" },
  { id: "life-processes", title: "Life Processes", subjectId: "science", mastery: 70, blueprintMarks: 8, difficulty: "Hard" },
];

/**
 * @param {number} predicted
 * @param {number} target
 */
export function getSubjectStatus(predicted, target) {
  const gap = target - predicted;
  if (gap > 15) return STATUS_BANDS.critical;
  if (gap > 10) return STATUS_BANDS.fragile;
  if (gap > 5) return STATUS_BANDS.recoverable;
  if (gap > 0) return STATUS_BANDS.stable;
  return STATUS_BANDS.strong;
}

function subjectById(subjects, subjectId) {
  return subjects.find((s) => s.id === subjectId) ?? null;
}

function probabilityImpact(subject) {
  if (!subject) return 1;
  const gap = Math.max(0, subject.target - subject.predicted);
  return 1 + gap / 25;
}

function examWeight(blueprintMarks) {
  return Math.max(1, blueprintMarks ?? 4) / 4;
}

function cognitiveLoad(difficulty) {
  return COGNITIVE_LOAD[difficulty] ?? COGNITIVE_LOAD.Medium;
}

function marksAtRisk(chapter) {
  const marks = chapter.blueprintMarks ?? 4;
  const mastery = chapter.mastery ?? 50;
  return marks * (1 - mastery / 100);
}

function buildWhyText(chapter, subject, score) {
  const marks = chapter.blueprintMarks ?? 4;
  const gap = subject ? Math.max(0, subject.target - subject.predicted) : 0;
  const mastery = chapter.mastery ?? 50;
  if (mastery < 55) {
    return `${marks} blueprint marks at risk · mastery ${mastery}% · highest ROI today (score ${score.toFixed(1)})`;
  }
  if (gap > 8) {
    return `Closes ${subject?.name ?? "subject"} target gap (+${gap} pts) · ${marks} marks weighted`;
  }
  return `${marks} marks on paper · ${mastery}% mastery · priority ${score.toFixed(1)}`;
}

function computePriorityScore(chapter, subject) {
  const marks = marksAtRisk(chapter);
  const prob = probabilityImpact(subject);
  const weight = examWeight(chapter.blueprintMarks);
  const load = cognitiveLoad(chapter.difficulty ?? "Medium");
  return (marks * prob * weight) / load;
}

/**
 * Synchronous enrichment — heuristic whyText only (no Firestore).
 * getWhyText is async; callers that need cached text should use enrichChapterAsync.
 * @param {PlannerChapter} chapter
 * @param {PlannerSubject | null} subject
 */
function enrichChapter(chapter, subject) {
  const priorityScore = computePriorityScore(chapter, subject);
  const durationMin = estimateMinutes(chapter);
  const subjectColor = subject?.color ?? "#6366f1";

  return {
    ...chapter,
    subjectName: subject?.name ?? chapter.subjectId,
    subjectColor,
    priorityScore,
    whyText: buildWhyText(chapter, subject, priorityScore),
    durationMin,
    task: taskLabel(chapter, chapter.mastery ?? 50),
  };
}

/**
 * Async enrichment — overrides whyText when a pre-computed Firestore entry exists.
 * @param {PlannerChapter} chapter
 * @param {PlannerSubject | null} subject
 */
async function enrichChapterAsync(chapter, subject) {
  const base = enrichChapter(chapter, subject);
  const level = masteryToLevel(chapter.mastery ?? 50);
  const whyText = await getWhyText(chapter.id, level, base.whyText);
  return { ...base, whyText };
}

function finalizeRankedTasks(enriched, limit) {
  enriched.sort((a, b) => b.priorityScore - a.priorityScore);

  return enriched.slice(0, limit).map((ch, index) => ({
    id: index + 1,
    subject: ch.subjectName,
    subjectId: ch.subjectId,
    task: ch.task,
    title: ch.title,
    time: `${ch.durationMin} min`,
    durationMin: ch.durationMin,
    done: false,
    whyText: ch.whyText,
    subjectColor: ch.subjectColor,
    priorityScore: ch.priorityScore,
    chapter: ch,
  }));
}

function taskLabel(chapter, mastery) {
  if (mastery < 50) return `Recover — ${chapter.title}`;
  if (mastery < 70) return `Practice — ${chapter.title}`;
  if (mastery < 85) return `Revise — ${chapter.title}`;
  return `Quick review — ${chapter.title}`;
}

function estimateMinutes(chapter) {
  const base = chapter.difficulty === "Hard" ? 45 : chapter.difficulty === "Easy" ? 25 : 35;
  const mastery = chapter.mastery ?? 50;
  if (mastery < 50) return base + 10;
  if (mastery > 80) return Math.max(20, base - 10);
  return base;
}

/**
 * Synchronous bootstrap ranking — heuristic whyText only (no Firestore).
 * @param {PlannerChapter[]} chapters
 * @param {PlannerSubject[]} subjects
 * @param {number} [limit=4]
 */
export function rankChaptersForTodaySync(chapters, subjects, limit = 4) {
  const pool = chapters?.length ? chapters : SAMPLE_CHAPTERS;
  const subjectList = subjects?.length ? subjects : SAMPLE_SUBJECTS;

  const enriched = pool.map((chapter) => {
    const subject = subjectById(subjectList, chapter.subjectId);
    return enrichChapter(chapter, subject);
  });

  return finalizeRankedTasks(enriched, limit);
}

/**
 * @param {PlannerChapter[]} chapters
 * @param {PlannerSubject[]} subjects
 * @param {number} [limit=4]
 * @returns {Promise<ReturnType<typeof finalizeRankedTasks>>}
 */
export async function rankChaptersForToday(chapters, subjects, limit = 4) {
  const pool = chapters?.length ? chapters : SAMPLE_CHAPTERS;
  const subjectList = subjects?.length ? subjects : SAMPLE_SUBJECTS;

  const enriched = await Promise.all(
    pool.map(async (chapter) => {
      const subject = subjectById(subjectList, chapter.subjectId);
      return enrichChapterAsync(chapter, subject);
    }),
  );

  return finalizeRankedTasks(enriched, limit);
}
