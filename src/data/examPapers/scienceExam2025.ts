import { SCIENCE_CHAPTER_SEED_SCHEMES } from "@/data/markSchemes/scienceSeed";
import type { MarkSchemeQuestion } from "@/types/markScheme";
import type { ExamPaper, ExamQuestion, ExamSection } from "@/types/examSimulation";

function findSeedQuestion(id: string): MarkSchemeQuestion | undefined {
  for (const scheme of SCIENCE_CHAPTER_SEED_SCHEMES) {
    const match = scheme.questions.find((q) => q.id === id);
    if (match) return match;
  }
  return undefined;
}

function modelAnswerFromScheme(q: MarkSchemeQuestion): string {
  return q.markPoints.map((mp) => `• ${mp.description} (${mp.marks} mark${mp.marks === 1 ? "" : "s"})`).join("\n");
}

function fromScheme(
  schemeId: string,
  number: string,
  part: ExamQuestion["part"],
  type: ExamQuestion["type"],
  overrides?: Partial<ExamQuestion>,
): ExamQuestion {
  const seed = findSeedQuestion(schemeId);
  const chapterId = seed?.chapterIds[0] ?? "general";
  return {
    id: `${part}-${number.replace(/\W/g, "")}`,
    number,
    text: seed?.questionText ?? `Answer the following question about ${chapterId}.`,
    marks: seed?.totalMarks ?? overrides?.marks ?? 2,
    type: seed?.requiresDiagram ? "diagram" : type,
    part,
    chapterId,
    hasChoice: false,
    ...overrides,
  };
}

function placeholder(
  number: string,
  part: ExamQuestion["part"],
  chapterId: string,
  marks: number,
  type: ExamQuestion["type"] = "short",
): ExamQuestion {
  return {
    id: `${part}-${number.replace(/\W/g, "")}`,
    number,
    text: `Answer the following question about ${chapterId.replace(/-/g, " ")}.`,
    marks,
    type,
    part,
    chapterId,
    hasChoice: false,
  };
}

function mcq(
  number: string,
  part: ExamQuestion["part"],
  chapterId: string,
  text: string,
): ExamQuestion {
  return {
    id: `${part}-${number.replace(/\W/g, "")}`,
    number,
    text,
    marks: 1,
    type: "mcq",
    part,
    chapterId,
    hasChoice: false,
  };
}

const physicsQuestions: ExamQuestion[] = [
  mcq(
    "Q1",
    "A",
    "electricity",
    "Which device protects a domestic circuit from overload?",
  ),
  mcq(
    "Q2",
    "A",
    "light-reflection-and-refraction",
    "The angle of incidence is equal to the angle of reflection. This is a law of:",
  ),
  fromScheme("ELEC_Q1_OVERLOAD", "Q3", "A", "short"),
  fromScheme("LIGHT_Q3_MIRROR_MAGNIFICATION", "Q4", "A", "short"),
  fromScheme("ELEC_Q2_RESISTANCE_FACTORS", "Q5", "A", "short"),
  fromScheme("ELEC_Q3_OHMS_LAW_FACTORS", "Q6", "A", "short"),
  fromScheme("LIGHT_Q1_REFLECTION_LAWS", "Q7", "A", "short"),
  fromScheme("ELEC_Q5_JOULES_LAW", "Q8", "A", "long"),
  fromScheme("LIGHT_Q2_PRESBYOPIA", "Q9", "A", "long"),
  {
    ...fromScheme("ELEC_Q4_MOTOR_POWER", "Q10", "A", "long", { marks: 4 }),
    hasChoice: true,
    choiceWith: "A-Q10b",
  },
  {
    id: "A-Q10b",
    number: "Q10 (OR)",
    text: "Derive the expression for heat produced in a resistor using Joule's law. State the SI unit of heat.",
    marks: 4,
    type: "long",
    part: "A",
    chapterId: "electricity",
    hasChoice: true,
    choiceWith: "A-Q10",
  },
];

const chemistryQuestions: ExamQuestion[] = [
  mcq("Q1", "B", "carbon-and-its-compounds", "The functional group in ethanol is:"),
  mcq("Q2", "B", "acids-bases-and-salts", "The pH of a neutral solution at 298 K is:"),
  placeholder("Q3", "B", "chemical-reactions", 1, "short"),
  placeholder("Q4", "B", "metals-and-non-metals", 1, "short"),
  placeholder("Q5", "B", "carbon-and-its-compounds", 2, "short"),
  placeholder("Q6", "B", "periodic-classification", 2, "short"),
  placeholder("Q7", "B", "acids-bases-and-salts", 2, "short"),
  placeholder("Q8", "B", "carbon-and-its-compounds", 3, "long"),
  placeholder("Q9", "B", "chemical-reactions", 3, "long"),
  placeholder("Q10", "B", "metals-and-non-metals", 3, "long"),
  {
    id: "B-Q11",
    number: "Q11",
    text: "Describe functional groups in carbon compounds and explain one characteristic reaction with nomenclature.",
    marks: 4,
    type: "long",
    part: "B",
    chapterId: "carbon-and-its-compounds",
    hasChoice: true,
    choiceWith: "B-Q11b",
  },
  {
    id: "B-Q11b",
    number: "Q11 (OR)",
    text: "Explain saponification with a balanced equation. Why are micelles formed in soap solution?",
    marks: 4,
    type: "long",
    part: "B",
    chapterId: "carbon-and-its-compounds",
    hasChoice: true,
    choiceWith: "B-Q11",
  },
  placeholder("Q12", "B", "periodic-classification", 7, "long"),
];

// Fix Q8 from carbon - use actual seed id Q1 from carbon scheme
const carbonQ = findSeedQuestion("Q1");
if (carbonQ && chemistryQuestions[7]) {
  chemistryQuestions[7] = {
    ...chemistryQuestions[7],
    text: carbonQ.questionText,
    marks: 3,
  };
}

// Fix Q11 from carbon chapter seed
const carbonLong = SCIENCE_CHAPTER_SEED_SCHEMES.find((s) => s.id === "SEED_SCIENCE_CARBON")?.questions[0];
if (carbonLong && chemistryQuestions[10]) {
  chemistryQuestions[10] = {
    ...chemistryQuestions[10],
    text: carbonLong.questionText,
    marks: 4,
    id: "B-Q11",
    number: "Q11",
  };
}

const biologyQuestions: ExamQuestion[] = [
  mcq("Q1", "C", "life-processes", "The site of photosynthesis in a plant cell is:"),
  mcq("Q2", "C", "control-and-coordination", "The chemical messengers in the human body are called:"),
  placeholder("Q3", "C", "life-processes", 1, "short"),
  placeholder("Q4", "C", "heredity", 1, "short"),
  placeholder("Q5", "C", "life-processes", 2, "short"),
  placeholder("Q6", "C", "how-do-organisms-reproduce", 2, "short"),
  placeholder("Q7", "C", "control-and-coordination", 2, "short"),
  placeholder("Q8", "C", "heredity", 3, "long"),
  placeholder("Q9", "C", "environment", 3, "long"),
  placeholder("Q10", "C", "life-processes", 3, "long"),
  {
    id: "C-Q11",
    number: "Q11",
    text:
      SCIENCE_CHAPTER_SEED_SCHEMES.find((s) => s.id === "SEED_SCIENCE_LIFE_PROCESSES")?.questions[0]
        ?.questionText ??
      "Explain nutrition, respiration, transportation, and excretion in living organisms with one example each.",
    marks: 4,
    type: "long",
    part: "C",
    chapterId: "life-processes",
    hasChoice: true,
    choiceWith: "C-Q11b",
  },
  {
    id: "C-Q11b",
    number: "Q11 (OR)",
    text: "Describe the structure and function of the human heart with a labelled diagram.",
    marks: 4,
    type: "diagram",
    part: "C",
    chapterId: "life-processes",
    hasChoice: true,
    choiceWith: "C-Q11",
  },
  placeholder("Q12", "C", "environment", 7, "long"),
];

function sumMarks(questions: ExamQuestion[]): number {
  // For OR pairs, count only one branch per pair
  const seen = new Set<string>();
  let total = 0;
  for (const q of questions) {
    if (q.hasChoice && q.choiceWith) {
      const pairKey = [q.id, q.choiceWith].sort().join("|");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
    }
    total += q.marks;
  }
  return total;
}

function buildSections(part: ExamQuestion["part"], label: string, ids: string[]): ExamSection {
  const partQuestions = ids
    .map((id) => [...physicsQuestions, ...chemistryQuestions, ...biologyQuestions].find((q) => q.id === id))
    .filter(Boolean) as ExamQuestion[];
  return {
    id: `part-${part}`,
    name: label,
    marks: sumMarks(partQuestions),
    questionIds: ids,
  };
}

/** Active question set — one branch per OR pair for navigation. */
export function getActiveQuestions(paper: ExamPaper, choices: Record<string, string>): ExamQuestion[] {
  const skipped = new Set<string>();
  for (const q of paper.questions) {
    if (!q.hasChoice || !q.choiceWith) continue;
    const selected = choices[q.id] ?? choices[q.choiceWith] ?? q.id;
    if (selected === q.id) skipped.add(q.choiceWith);
    else skipped.add(q.id);
  }
  return paper.questions.filter((q) => !skipped.has(q.id));
}

const physicsIds = physicsQuestions.map((q) => q.id);
const chemistryIds = chemistryQuestions.map((q) => q.id);
const biologyIds = biologyQuestions.map((q) => q.id);

export const SCIENCE_EXAM_2025: ExamPaper = {
  id: "science_board_2025_26",
  subject: "science",
  year: 2026,
  totalMarks: 80,
  duration: 195,
  sections: [
    buildSections("A", "Part A — Physics", physicsIds),
    buildSections("B", "Part B — Chemistry", chemistryIds),
    buildSections("C", "Part C — Biology", biologyIds),
  ],
  questions: [...physicsQuestions, ...chemistryQuestions, ...biologyQuestions],
};

/** Model answers keyed by question id — from mark schemes where available. */
export const SCIENCE_EXAM_MODEL_ANSWERS: Record<string, string> = {};

for (const q of SCIENCE_EXAM_2025.questions) {
  const seed = SCIENCE_CHAPTER_SEED_SCHEMES.flatMap((s) => s.questions).find(
    (sq) => sq.questionText === q.text || sq.id.includes(q.number.replace(/\W/g, "")),
  );
  if (seed) {
    SCIENCE_EXAM_MODEL_ANSWERS[q.id] = modelAnswerFromScheme(seed);
    continue;
  }
  if (q.type === "mcq") {
    SCIENCE_EXAM_MODEL_ANSWERS[q.id] = "Refer to Karnataka SSLC Science textbook for the correct option.";
  } else {
    SCIENCE_EXAM_MODEL_ANSWERS[q.id] =
      "Refer to the official model answer paper. Award marks for correct concepts, steps, and keywords.";
  }
}

// Map known seed ids explicitly
const seedMap: Record<string, string> = {
  "A-Q3": "ELEC_Q1_OVERLOAD",
  "A-Q4": "LIGHT_Q3_MIRROR_MAGNIFICATION",
  "A-Q5": "ELEC_Q2_RESISTANCE_FACTORS",
  "A-Q6": "ELEC_Q3_OHMS_LAW_FACTORS",
  "A-Q7": "LIGHT_Q1_REFLECTION_LAWS",
  "A-Q8": "ELEC_Q5_JOULES_LAW",
  "A-Q9": "LIGHT_Q2_PRESBYOPIA",
  "A-Q10": "ELEC_Q4_MOTOR_POWER",
  "B-Q8": "Q1",
  "B-Q11": "Q1",
  "C-Q11": "Q1",
};

for (const [qId, seedId] of Object.entries(seedMap)) {
  const seed = findSeedQuestion(seedId);
  if (seed) SCIENCE_EXAM_MODEL_ANSWERS[qId] = modelAnswerFromScheme(seed);
}

export const EXAM_PAPERS = {
  science_2025_26: SCIENCE_EXAM_2025,
} as const;

export function getExamPaper(paperId: string): ExamPaper | undefined {
  return Object.values(EXAM_PAPERS).find((p) => p.id === paperId);
}

export const MCQ_OPTIONS: Record<string, string[]> = {
  "A-Q1": ["Fuse", "Ammeter", "Galvanometer", "Rheostat"],
  "A-Q2": ["Refraction", "Reflection", "Dispersion", "Scattering"],
  "B-Q1": ["—OH", "—COOH", "—CHO", "—Cl"],
  "B-Q2": ["0", "7", "14", "1"],
  "C-Q1": ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"],
  "C-Q2": ["Enzymes", "Hormones", "Neurons", "Antibodies"],
};
