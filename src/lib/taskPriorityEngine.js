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
import { STATUS_COLORS, SUBJECT_COLORS } from "./design-tokens";

const STATUS_BG = {
  critical: "rgba(248,113,113,0.15)",
  fragile: "rgba(251,191,36,0.15)",
  recoverable: "rgba(56,189,248,0.15)",
  stable: "rgba(74,222,128,0.15)",
  strong: "rgba(192,132,252,0.15)",
};

const STATUS_LABELS = {
  critical: "Critical",
  fragile: "Fragile",
  recoverable: "Recoverable",
  stable: "Stable",
  strong: "Strong",
};

const STATUS_BANDS = Object.fromEntries(
  Object.keys(STATUS_COLORS).map((key) => [
    key,
    {
      key,
      label: STATUS_LABELS[key],
      color: STATUS_COLORS[key],
      bg: STATUS_BG[key],
    },
  ]),
);

/** @param {keyof typeof STATUS_COLORS} status */
export function getStatusColor(status) {
  return STATUS_COLORS[status] ?? "#8B5CF6";
}

/** @param {keyof typeof STATUS_COLORS} status */
export function getStatusBand(status) {
  return STATUS_BANDS[status] ?? STATUS_BANDS.strong;
}

/** Exam readiness from chapter/subject mastery %. */
export function getMasteryStatus(mastery) {
  const m = mastery ?? 0;
  if (m < 40) return STATUS_BANDS.critical;
  if (m < 55) return STATUS_BANDS.fragile;
  if (m < 70) return STATUS_BANDS.recoverable;
  if (m < 85) return STATUS_BANDS.stable;
  return STATUS_BANDS.strong;
}

/** Marks-at-risk urgency band (uses status colours, not subject colours). */
export function getMarksAtRiskStatus(marksAtRisk) {
  if (marksAtRisk > 6) return STATUS_BANDS.critical;
  if (marksAtRisk >= 4) return STATUS_BANDS.fragile;
  if (marksAtRisk >= 2) return STATUS_BANDS.recoverable;
  return STATUS_BANDS.stable;
}

function subjectColorFor(subjectId, fallback) {
  return SUBJECT_COLORS[subjectId] ?? fallback ?? "#8B5CF6";
}

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
  { id: "real-numbers", title: "Real Numbers", subjectId: "math", blueprintMarks: 6, mastery: 50 },
  { id: "polynomials", title: "Polynomials", subjectId: "math", blueprintMarks: 4, mastery: 50 },
  { id: "linear-equations", title: "Pair of Linear Equations", subjectId: "math", blueprintMarks: 8, mastery: 50 },
  { id: "quadratic-equations", title: "Quadratic Equations", subjectId: "math", blueprintMarks: 8, mastery: 50 },
  { id: "arithmetic-progressions", title: "Arithmetic Progressions", subjectId: "math", blueprintMarks: 8, mastery: 50 },
  { id: "triangles", title: "Triangles", subjectId: "math", blueprintMarks: 11, mastery: 50 },
  { id: "coordinate-geometry", title: "Coordinate Geometry", subjectId: "math", blueprintMarks: 6, mastery: 50 },
  { id: "trigonometry", title: "Introduction to Trigonometry", subjectId: "math", blueprintMarks: 8, mastery: 50 },
  { id: "applications-trigonometry", title: "Some Applications of Trigonometry", subjectId: "math", blueprintMarks: 4, mastery: 50 },
  { id: "circles", title: "Circles", subjectId: "math", blueprintMarks: 4, mastery: 50 },
  { id: "constructions", title: "Constructions", subjectId: "math", blueprintMarks: 3, mastery: 50 },
  { id: "areas-related-circles", title: "Areas Related to Circles", subjectId: "math", blueprintMarks: 4, mastery: 50 },
  { id: "surface-areas-volumes", title: "Surface Areas and Volumes", subjectId: "math", blueprintMarks: 8, mastery: 50 },
  { id: "statistics", title: "Statistics", subjectId: "math", blueprintMarks: 6, mastery: 50 },
  { id: "probability", title: "Probability", subjectId: "math", blueprintMarks: 2, mastery: 50 },
  { id: "opposition-british-rule", title: "Opposition to British Rule", subjectId: "social", blueprintMarks: 5, mastery: 50 },
  { id: "freedom-struggle", title: "The Freedom Struggle", subjectId: "social", blueprintMarks: 4, mastery: 50 },
  { id: "challenges-india", title: "Challenges of India", subjectId: "social", blueprintMarks: 4, mastery: 50 },
  { id: "india-soils", title: "India Soils", subjectId: "social", blueprintMarks: 4, mastery: 50 },
  { id: "rural-development", title: "Rural Development", subjectId: "social", blueprintMarks: 4, mastery: 50 },
  { id: "bank-transactions", title: "Bank Transactions", subjectId: "social", blueprintMarks: 4, mastery: 50 },
  { id: "india-location", title: "India Location and Physiography", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "nationalism-india", title: "Nationalism in India", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "political-parties", title: "Political Parties", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "democracy-outcomes", title: "Outcomes of Democracy", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "federalism", title: "Federalism", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "water-resources", title: "Water Resources", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "agriculture", title: "Agriculture", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "money-credit", title: "Money and Credit", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "globalisation", title: "Globalisation and Indian Economy", subjectId: "social", blueprintMarks: 3, mastery: 50 },
  { id: "chemical-reactions", title: "Chemical Reactions and Equations", subjectId: "science", blueprintMarks: 4, mastery: 50 },
  { id: "acids-bases-salts", title: "Acids Bases and Salts", subjectId: "science", blueprintMarks: 6, mastery: 50 },
  { id: "metals-non-metals", title: "Metals and Non-metals", subjectId: "science", blueprintMarks: 7, mastery: 50 },
  { id: "carbon-compounds", title: "Carbon and its Compounds", subjectId: "science", blueprintMarks: 8, mastery: 50 },
  { id: "life-processes", title: "Life Processes", subjectId: "science", blueprintMarks: 8, mastery: 50 },
  { id: "control-coordination", title: "Control and Coordination", subjectId: "science", blueprintMarks: 6, mastery: 50 },
  { id: "reproduction", title: "How do Organisms Reproduce", subjectId: "science", blueprintMarks: 7, mastery: 50 },
  { id: "heredity-evolution", title: "Heredity and Evolution", subjectId: "science", blueprintMarks: 4, mastery: 50 },
  { id: "light-reflection-refraction", title: "Light Reflection and Refraction", subjectId: "science", blueprintMarks: 8, mastery: 50 },
  { id: "human-eye", title: "The Human Eye and Colourful World", subjectId: "science", blueprintMarks: 5, mastery: 50 },
  { id: "electricity", title: "Electricity", subjectId: "science", blueprintMarks: 8, mastery: 50 },
  { id: "magnetic-effects", title: "Magnetic Effects of Electric Current", subjectId: "science", blueprintMarks: 6, mastery: 50 },
  { id: "our-environment", title: "Our Environment", subjectId: "science", blueprintMarks: 3, mastery: 50 },
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
  const subjectColor = subjectColorFor(chapter.subjectId, subject?.color);

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
