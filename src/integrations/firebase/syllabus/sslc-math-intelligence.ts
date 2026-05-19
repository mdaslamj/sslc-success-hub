/**
 * Karnataka SSLC Mathematics — intelligence seed.
 *
 * Reference data for the Mathematics Intelligence System. Three chapters
 * fully populated (Arithmetic Progressions, Triangles, Quadratic Equations)
 * across all question types, formulas, rubrics, common mistakes, and board
 * frequency. Run from `/admin/import` (or a one-off importer) to populate
 * the `mathChapters`, `mathQuestions`, `mathModelAnswers`, `mathFormulas`,
 * `mathRubrics`, `mathKeywords`, and `mathCommonMistakes` collections.
 */
import type {
  MathChapterDoc,
  MathCommonMistakeDoc,
  MathFormulaDoc,
  MathKeywordDoc,
  MathModelAnswerDoc,
  MathQuestionDoc,
  MathRubricDoc,
} from "../types";
import { DEFAULT_MATH_RUBRICS } from "../services/math-rubrics";

const now = Date.now();

export const SSLC_MATH_CHAPTERS: MathChapterDoc[] = [
  {
    id: "math_ap",
    subjectId: "math",
    chapterNumber: 5,
    title: "Arithmetic Progressions",
    titleKn: "ಸಮಾಂತರ ಶ್ರೇಣಿಗಳು",
    keyConcepts: [
      "common difference",
      "nth term",
      "sum of n terms",
      "finite vs infinite AP",
    ],
    formulaIds: ["f_ap_nth", "f_ap_sum"],
    boardWeight: 12,
    difficultyMix: { easy: 0.35, medium: 0.45, hard: 0.15, hots: 0.05 },
    estimatedStudyTime: 240,
    masteryThreshold: 75,
    prerequisites: [],
    updatedAt: now,
  },
  {
    id: "math_triangles",
    subjectId: "math",
    chapterNumber: 2,
    title: "Triangles",
    titleKn: "ತ್ರಿಭುಜಗಳು",
    keyConcepts: [
      "similarity criteria",
      "basic proportionality theorem",
      "Pythagoras theorem",
      "area ratios",
    ],
    formulaIds: ["f_tri_bpt", "f_tri_pythagoras"],
    boardWeight: 14,
    difficultyMix: { easy: 0.3, medium: 0.45, hard: 0.2, hots: 0.05 },
    estimatedStudyTime: 300,
    masteryThreshold: 70,
    prerequisites: [],
    updatedAt: now,
  },
  {
    id: "math_quadratic",
    subjectId: "math",
    chapterNumber: 4,
    title: "Quadratic Equations",
    titleKn: "ವರ್ಗ ಸಮೀಕರಣಗಳು",
    keyConcepts: [
      "standard form",
      "factorisation",
      "quadratic formula",
      "discriminant",
      "nature of roots",
    ],
    formulaIds: ["f_qe_formula", "f_qe_discriminant"],
    boardWeight: 13,
    difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.15, hots: 0.05 },
    estimatedStudyTime: 270,
    masteryThreshold: 72,
    prerequisites: [],
    updatedAt: now,
  },
];

export const SSLC_MATH_FORMULAS: MathFormulaDoc[] = [
  {
    id: "f_ap_nth",
    chapterIds: ["math_ap"],
    label: "nth term of an AP",
    expression: "a_n = a + (n - 1) d",
    description: "First term a, common difference d.",
    category: "algebra",
    commonUsageNotes: "Always identify a and d before substituting n.",
    updatedAt: now,
  },
  {
    id: "f_ap_sum",
    chapterIds: ["math_ap"],
    label: "Sum of first n terms (AP)",
    expression: "S_n = n/2 [2a + (n - 1) d]",
    description: "Equivalent form: S_n = n/2 (a + l), where l is the last term.",
    category: "algebra",
    updatedAt: now,
  },
  {
    id: "f_tri_bpt",
    chapterIds: ["math_triangles"],
    label: "Basic Proportionality Theorem",
    expression: "AD/DB = AE/EC",
    description: "A line parallel to one side of a triangle divides the other two sides proportionally.",
    category: "geometry",
    updatedAt: now,
  },
  {
    id: "f_tri_pythagoras",
    chapterIds: ["math_triangles"],
    label: "Pythagoras Theorem",
    expression: "a^2 + b^2 = c^2",
    description: "Hypotenuse c is opposite the right angle.",
    category: "geometry",
    updatedAt: now,
  },
  {
    id: "f_qe_formula",
    chapterIds: ["math_quadratic"],
    label: "Quadratic formula",
    expression: "x = (-b ± √(b^2 - 4ac)) / 2a",
    description: "Roots of ax² + bx + c = 0 (a ≠ 0).",
    category: "algebra",
    updatedAt: now,
  },
  {
    id: "f_qe_discriminant",
    chapterIds: ["math_quadratic"],
    label: "Discriminant",
    expression: "D = b^2 - 4ac",
    description: "D > 0 → real & distinct, D = 0 → real & equal, D < 0 → no real roots.",
    category: "algebra",
    updatedAt: now,
  },
];

export const SSLC_MATH_KEYWORDS: MathKeywordDoc[] = [
  {
    id: "kw_common_difference",
    term: "common difference",
    synonyms: ["d value", "difference d"],
    chapterIds: ["math_ap"],
    weight: 1,
    updatedAt: now,
  },
  {
    id: "kw_first_term",
    term: "first term",
    synonyms: ["a value"],
    chapterIds: ["math_ap"],
    weight: 0.8,
    updatedAt: now,
  },
  {
    id: "kw_similar_triangles",
    term: "similar triangles",
    synonyms: ["similarity", "AA criterion", "SAS similarity"],
    chapterIds: ["math_triangles"],
    weight: 1,
    updatedAt: now,
  },
  {
    id: "kw_discriminant",
    term: "discriminant",
    synonyms: ["b^2-4ac", "delta"],
    chapterIds: ["math_quadratic"],
    weight: 1,
    updatedAt: now,
  },
];

export const SSLC_MATH_COMMON_MISTAKES: MathCommonMistakeDoc[] = [
  {
    id: "mistake_ap_n_off_by_one",
    chapterId: "math_ap",
    title: "Using n instead of (n-1) in nth-term formula",
    description: "Students often write a_n = a + n·d, missing the −1.",
    triggerKeywords: ["a + nd", "a+n*d"],
    correction: "Always use a_n = a + (n − 1) d.",
    updatedAt: now,
  },
  {
    id: "mistake_qe_sign_error",
    chapterId: "math_quadratic",
    title: "Sign error in the quadratic formula",
    description: "Dropping the ± or mis-signing b.",
    triggerKeywords: ["+b ±", "- b - "],
    correction: "Write x = (−b ± √(b² − 4ac))/2a and evaluate both roots.",
    updatedAt: now,
  },
  {
    id: "mistake_tri_corresponding_sides",
    chapterId: "math_triangles",
    title: "Wrong correspondence in similarity",
    description: "Pairing non-corresponding sides when writing the ratio.",
    triggerKeywords: ["AB/EF", "BC/DE"],
    correction: "Match vertices in the named order, e.g. ΔABC ~ ΔDEF → AB/DE = BC/EF = CA/FD.",
    updatedAt: now,
  },
];

export const SSLC_MATH_QUESTIONS: MathQuestionDoc[] = [
  {
    id: "q_ap_mcq_1",
    chapterId: "math_ap",
    subjectId: "math",
    questionType: "mcq",
    marks: 1,
    difficulty: "easy",
    statement: "The 10th term of the AP 2, 7, 12, … is",
    options: ["45", "47", "50", "52"],
    correctOption: 1,
    requiredFormulaIds: ["f_ap_nth"],
    keywordIds: ["kw_common_difference", "kw_first_term"],
    metadata: {
      boardFrequency: 3,
      isRepeatedBoardQ: true,
      lastAppearedYears: [2019, 2022, 2024],
      isImportant: true,
      commonMistakeIds: ["mistake_ap_n_off_by_one"],
      estimatedSolvingTime: 60,
    },
    source: "KSEEB 2024",
    tags: ["nth-term"],
    updatedAt: now,
  },
  {
    id: "q_ap_3mark_1",
    chapterId: "math_ap",
    subjectId: "math",
    questionType: "3mark",
    marks: 3,
    difficulty: "medium",
    statement: "Find the sum of the first 30 terms of the AP 3, 7, 11, 15, …",
    requiredFormulaIds: ["f_ap_sum"],
    keywordIds: ["kw_common_difference", "kw_first_term"],
    metadata: {
      boardFrequency: 4,
      isRepeatedBoardQ: true,
      lastAppearedYears: [2018, 2020, 2021, 2023],
      isImportant: true,
      commonMistakeIds: ["mistake_ap_n_off_by_one"],
      estimatedSolvingTime: 240,
    },
    source: "KSEEB blueprint",
    updatedAt: now,
  },
  {
    id: "q_qe_5mark_1",
    chapterId: "math_quadratic",
    subjectId: "math",
    questionType: "5mark",
    marks: 5,
    difficulty: "hard",
    statement:
      "Solve 2x² − 5x + 3 = 0 by the quadratic formula. Also state the nature of its roots.",
    requiredFormulaIds: ["f_qe_formula", "f_qe_discriminant"],
    keywordIds: ["kw_discriminant"],
    metadata: {
      boardFrequency: 5,
      isRepeatedBoardQ: true,
      lastAppearedYears: [2017, 2019, 2020, 2022, 2024],
      isImportant: true,
      commonMistakeIds: ["mistake_qe_sign_error"],
      estimatedSolvingTime: 420,
    },
    source: "KSEEB 2024",
    updatedAt: now,
  },
  {
    id: "q_tri_2mark_1",
    chapterId: "math_triangles",
    subjectId: "math",
    questionType: "2mark",
    marks: 2,
    difficulty: "medium",
    statement:
      "In ΔABC, DE ∥ BC and AD/DB = 3/5. If AE = 4.5 cm, find EC.",
    requiredFormulaIds: ["f_tri_bpt"],
    keywordIds: ["kw_similar_triangles"],
    metadata: {
      boardFrequency: 3,
      isRepeatedBoardQ: true,
      lastAppearedYears: [2018, 2021, 2023],
      isImportant: true,
      commonMistakeIds: ["mistake_tri_corresponding_sides"],
      estimatedSolvingTime: 180,
    },
    source: "KSEEB",
    updatedAt: now,
  },
  {
    id: "q_qe_hots_1",
    chapterId: "math_quadratic",
    subjectId: "math",
    questionType: "hots",
    marks: 4,
    difficulty: "hard",
    statement:
      "Find the values of k for which the quadratic x² + kx + 16 = 0 has equal roots.",
    requiredFormulaIds: ["f_qe_discriminant"],
    keywordIds: ["kw_discriminant"],
    metadata: {
      boardFrequency: 2,
      isRepeatedBoardQ: true,
      lastAppearedYears: [2020, 2023],
      isImportant: true,
      commonMistakeIds: ["mistake_qe_sign_error"],
      estimatedSolvingTime: 360,
    },
    source: "KSEEB HOTS bank",
    updatedAt: now,
  },
];

export const SSLC_MATH_MODEL_ANSWERS: MathModelAnswerDoc[] = [
  {
    id: "q_ap_3mark_1",
    questionId: "q_ap_3mark_1",
    chapterId: "math_ap",
    steps: [
      { order: 1, text: "Identify a = 3, d = 4, n = 30.", marks: 1 },
      {
        order: 2,
        text: "Apply S_n = n/2 [2a + (n − 1) d].",
        formulaId: "f_ap_sum",
        marks: 1,
      },
      {
        order: 3,
        text: "S_30 = 15 × (6 + 29 × 4) = 15 × 122 = 1830.",
        marks: 1,
      },
    ],
    finalAnswer: "S_30 = 1830",
    totalMarks: 3,
    updatedAt: now,
  },
  {
    id: "q_qe_5mark_1",
    questionId: "q_qe_5mark_1",
    chapterId: "math_quadratic",
    steps: [
      { order: 1, text: "Identify a = 2, b = −5, c = 3.", marks: 1 },
      {
        order: 2,
        text: "Compute discriminant D = b² − 4ac = 25 − 24 = 1.",
        formulaId: "f_qe_discriminant",
        marks: 1,
      },
      {
        order: 3,
        text: "Apply x = (−b ± √D)/2a = (5 ± 1)/4.",
        formulaId: "f_qe_formula",
        marks: 1,
      },
      { order: 4, text: "x = 3/2 or x = 1.", marks: 1 },
      {
        order: 5,
        text: "Since D > 0, the roots are real and distinct.",
        marks: 1,
      },
    ],
    finalAnswer: "x = 3/2, 1; roots are real and distinct",
    totalMarks: 5,
    updatedAt: now,
  },
  {
    id: "q_tri_2mark_1",
    questionId: "q_tri_2mark_1",
    chapterId: "math_triangles",
    steps: [
      {
        order: 1,
        text: "By BPT, AD/DB = AE/EC ⇒ 3/5 = 4.5/EC.",
        formulaId: "f_tri_bpt",
        marks: 1,
      },
      { order: 2, text: "EC = 4.5 × 5 / 3 = 7.5 cm.", marks: 1 },
    ],
    finalAnswer: "EC = 7.5 cm",
    totalMarks: 2,
    updatedAt: now,
  },
];

/** Seed all default per-question-type rubrics (admin import). */
export const SSLC_MATH_RUBRICS: MathRubricDoc[] = Object.values(
  DEFAULT_MATH_RUBRICS,
).map((r) => ({ ...r, updatedAt: now }));

export const SSLC_MATH_INTELLIGENCE_SEED = {
  chapters: SSLC_MATH_CHAPTERS,
  formulas: SSLC_MATH_FORMULAS,
  keywords: SSLC_MATH_KEYWORDS,
  commonMistakes: SSLC_MATH_COMMON_MISTAKES,
  questions: SSLC_MATH_QUESTIONS,
  modelAnswers: SSLC_MATH_MODEL_ANSWERS,
  rubrics: SSLC_MATH_RUBRICS,
};