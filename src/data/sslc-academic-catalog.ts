/**
 * Karnataka SSLC academic catalog — single source for subject metadata,
 * chapter order/slugs, planner seeds, and mastery references.
 *
 * Chapter slugs align with `public/content/chapters/{subject}/` JSON files.
 * Lovable = visual generation · Cursor = engineering · GitHub = source of truth.
 */

export type CatalogChapter = {
  id: string;
  title: string;
  titleKn?: string;
  chapterNumber: number;
  difficulty: "Easy" | "Medium" | "Hard";
  /** Seed mastery 0–100 for dashboards without profile load. */
  mastery: number;
  blueprintMarks?: number;
  section?: string;
};

export type CatalogSubject = {
  id: string;
  name: string;
  nameKn?: string;
  emoji: string;
  color: string;
  completion: number;
  mastery: number;
  target: number;
  predicted: number;
  chapters: number;
  chaptersDone: number;
  weakTopics: string[];
  strongTopics: string[];
};

export type PlannerTaskSeed = {
  id: number;
  subject: string;
  task: string;
  time: string;
  done: boolean;
};

/** Core SSLC board subjects with content under `public/content/`. */
export const SSLC_CORE_SUBJECTS: CatalogSubject[] = [
  {
    id: "math",
    name: "Mathematics",
    nameKn: "ಗಣಿತ",
    emoji: "📐",
    color: "oklch(0.6 0.18 250)",
    completion: 73,
    mastery: 74,
    target: 95,
    predicted: 88,
    chapters: 15,
    chaptersDone: 11,
    weakTopics: ["Quadratic Equations", "Introduction to Trigonometry", "Some Applications of Trigonometry"],
    strongTopics: ["Real Numbers", "Constructions", "Statistics"],
  },
  {
    id: "science",
    name: "Science",
    nameKn: "ವಿಜ್ಞಾನ",
    emoji: "🧪",
    color: "oklch(0.65 0.16 145)",
    completion: 68,
    mastery: 69,
    target: 92,
    predicted: 84,
    chapters: 13,
    chaptersDone: 9,
    weakTopics: ["Electricity", "Carbon and its Compounds", "Magnetic Effects of Electric Current"],
    strongTopics: ["Life Processes", "Our Environment", "Light - Reflection and Refraction"],
  },
  {
    id: "social",
    name: "Social Science",
    nameKn: "ಸಮಾಜ ವಿಜ್ಞಾನ",
    emoji: "🌍",
    color: "oklch(0.68 0.15 60)",
    completion: 62,
    mastery: 78,
    target: 90,
    predicted: 82,
    chapters: 33,
    chaptersDone: 18,
    weakTopics: ["Banking Transactions", "India – Mineral and Power Resources"],
    strongTopics: ["The Freedom Struggle", "India Forest Resources", "Public Administration – An Introduction"],
  },
];

/** Language papers — planner + dashboard; content JSON not yet unified. */
export const SSLC_LANGUAGE_SUBJECTS: CatalogSubject[] = [
  {
    id: "english",
    name: "English",
    nameKn: "ಇಂಗ್ಲಿಷ್",
    emoji: "📘",
    color: "oklch(0.6 0.17 310)",
    completion: 78,
    mastery: 80,
    target: 90,
    predicted: 86,
    chapters: 12,
    chaptersDone: 9,
    weakTopics: ["Grammar — Tenses", "Reported Speech"],
    strongTopics: ["Nelson Mandela: Long Walk to Freedom", "Letter Writing"],
  },
  {
    id: "kannada",
    name: "Kannada",
    nameKn: "ಕನ್ನಡ",
    emoji: "ಕ",
    color: "oklch(0.62 0.18 25)",
    completion: 70,
    mastery: 72,
    target: 95,
    predicted: 86,
    chapters: 14,
    chaptersDone: 10,
    weakTopics: ["ವ್ಯಾಕರಣ — ಸಂಧಿ", "ಪತ್ರ ಲೇಖನ"],
    strongTopics: ["ಪದ್ಯ ವಿಮರ್ಶೆ", "ವಚನ ಸಾಹಿತ್ಯ"],
  },
  {
    id: "hindi",
    name: "Hindi",
    nameKn: "ಹಿಂದಿ",
    emoji: "ह",
    color: "oklch(0.65 0.16 20)",
    completion: 58,
    mastery: 60,
    target: 85,
    predicted: 74,
    chapters: 12,
    chaptersDone: 7,
    weakTopics: ["व्याकरण — संधि", "अनुवाद"],
    strongTopics: ["गद्य — कबीर के दोहे", "पत्र लेखन"],
  },
];

export const SSLC_SUBJECTS: CatalogSubject[] = [
  ...SSLC_CORE_SUBJECTS,
  ...SSLC_LANGUAGE_SUBJECTS,
];

/** Mathematics — NCERT rationalised order (Karnataka SSLC). */
export const MATHEMATICS_CHAPTERS: CatalogChapter[] = [
  { id: "real-numbers", title: "Real Numbers", chapterNumber: 1, difficulty: "Medium", mastery: 85, blueprintMarks: 6 },
  { id: "polynomials", title: "Polynomials", chapterNumber: 2, difficulty: "Medium", mastery: 78, blueprintMarks: 4 },
  { id: "pair-of-linear-equations", title: "Pair of Linear Equations in Two Variables", chapterNumber: 3, difficulty: "Medium", mastery: 72, blueprintMarks: 6 },
  { id: "quadratic-equations", title: "Quadratic Equations", chapterNumber: 4, difficulty: "Hard", mastery: 54, blueprintMarks: 8 },
  { id: "arithmetic-progressions", title: "Arithmetic Progressions", chapterNumber: 5, difficulty: "Medium", mastery: 68, blueprintMarks: 4 },
  { id: "triangles", title: "Triangles", chapterNumber: 6, difficulty: "Hard", mastery: 76, blueprintMarks: 10 },
  { id: "coordinate-geometry", title: "Coordinate Geometry", chapterNumber: 7, difficulty: "Medium", mastery: 71, blueprintMarks: 6 },
  { id: "introduction-to-trigonometry", title: "Introduction to Trigonometry", chapterNumber: 8, difficulty: "Hard", mastery: 62, blueprintMarks: 8 },
  { id: "some-applications-of-trigonometry", title: "Some Applications of Trigonometry", chapterNumber: 9, difficulty: "Hard", mastery: 58, blueprintMarks: 8 },
  { id: "circles", title: "Circles", chapterNumber: 10, difficulty: "Medium", mastery: 80, blueprintMarks: 6 },
  { id: "constructions", title: "Constructions", chapterNumber: 11, difficulty: "Easy", mastery: 88, blueprintMarks: 4 },
  { id: "areas-related-to-circles", title: "Areas Related to Circles", chapterNumber: 12, difficulty: "Medium", mastery: 73, blueprintMarks: 6 },
  { id: "surface-areas-and-volumes", title: "Surface Areas and Volumes", chapterNumber: 13, difficulty: "Medium", mastery: 65, blueprintMarks: 8 },
  { id: "statistics", title: "Statistics", chapterNumber: 14, difficulty: "Medium", mastery: 79, blueprintMarks: 6 },
  { id: "probability", title: "Probability", chapterNumber: 15, difficulty: "Easy", mastery: 82, blueprintMarks: 4 },
];

/** Science — Karnataka SSLC rationalised NCERT (13 chapters). */
export const SCIENCE_CHAPTERS: CatalogChapter[] = [
  { id: "chemical-reactions-and-equations", title: "Chemical Reactions and Equations", chapterNumber: 1, difficulty: "Medium", mastery: 77, blueprintMarks: 4 },
  { id: "acids-bases-and-salts", title: "Acids, Bases and Salts", chapterNumber: 2, difficulty: "Medium", mastery: 72, blueprintMarks: 6 },
  { id: "metals-and-nonmetals", title: "Metals and Non-metals", chapterNumber: 3, difficulty: "Hard", mastery: 68, blueprintMarks: 7 },
  { id: "carbon-and-its-compounds", title: "Carbon and its Compounds", chapterNumber: 4, difficulty: "Hard", mastery: 65, blueprintMarks: 8 },
  { id: "life-processes", title: "Life Processes", chapterNumber: 5, difficulty: "Hard", mastery: 70, blueprintMarks: 8 },
  { id: "control-and-coordination", title: "Control and Coordination", chapterNumber: 6, difficulty: "Medium", mastery: 63, blueprintMarks: 6 },
  { id: "how-do-organisms-reproduce", title: "How do Organisms Reproduce?", chapterNumber: 7, difficulty: "Medium", mastery: 75, blueprintMarks: 7 },
  { id: "heredity", title: "Heredity", chapterNumber: 8, difficulty: "Medium", mastery: 71, blueprintMarks: 4 },
  { id: "light-reflection-and-refraction", title: "Light - Reflection and Refraction", chapterNumber: 9, difficulty: "Hard", mastery: 80, blueprintMarks: 8 },
  { id: "human-eye-and-colourful-world", title: "The Human Eye and the Colourful World", chapterNumber: 10, difficulty: "Medium", mastery: 76, blueprintMarks: 5 },
  { id: "electricity", title: "Electricity", chapterNumber: 11, difficulty: "Hard", mastery: 44, blueprintMarks: 8 },
  { id: "magnetic-effects-of-electric-current", title: "Magnetic Effects of Electric Current", chapterNumber: 12, difficulty: "Medium", mastery: 58, blueprintMarks: 6 },
  { id: "our-environment", title: "Our Environment", chapterNumber: 13, difficulty: "Easy", mastery: 82, blueprintMarks: 3 },
];

/** Social Science — KSEAB Karnataka SSLC (representative chapters from content manifest). */
export const SOCIAL_SCIENCE_CHAPTERS: CatalogChapter[] = [
  { id: "chapter_01_advent_of_europeans", title: "The Advent of Europeans to India", chapterNumber: 1, difficulty: "Medium", mastery: 74, section: "History" },
  { id: "chapter_06_first_war_independence", title: "The First War of Indian Independence (1857)", chapterNumber: 6, difficulty: "Medium", mastery: 76, section: "History" },
  { id: "chapter_07_freedom_struggle", title: "The Freedom Struggle", chapterNumber: 7, difficulty: "Medium", mastery: 82, section: "History" },
  { id: "chapter_01_public_administration", title: "Public Administration – An Introduction", chapterNumber: 1, difficulty: "Medium", mastery: 86, section: "Political Science" },
  { id: "chapter_01_social_stratification", title: "Social Stratification", chapterNumber: 1, difficulty: "Medium", mastery: 72, section: "Sociology" },
  { id: "chapter_01_india_geographical_position", title: "India – Geographical Position and Physical Features", chapterNumber: 1, difficulty: "Medium", mastery: 78, section: "Geography" },
  { id: "chapter_01_india_forest_resources", title: "India Forest Resources", chapterNumber: 4, difficulty: "Medium", mastery: 88, section: "Geography" },
  { id: "chapter_01_india_water_resources", title: "India – Water Resources", chapterNumber: 5, difficulty: "Medium", mastery: 79, section: "Geography" },
  { id: "chapter_01_india_mineral_power", title: "India – Mineral and Power Resources", chapterNumber: 8, difficulty: "Hard", mastery: 68, section: "Geography" },
  { id: "chapter_01_economy_government", title: "Economy and Government", chapterNumber: 1, difficulty: "Hard", mastery: 70, section: "Economics" },
  { id: "chapter_01_banking_transactions", title: "Banking Transactions", chapterNumber: 2, difficulty: "Medium", mastery: 64, section: "Business Studies" },
  { id: "chapter_01_consumer_education", title: "Consumer Education and Protection", chapterNumber: 3, difficulty: "Medium", mastery: 85, section: "Business Studies" },
];

/** Academically meaningful daily planner seeds (SSLC Class X). */
export const PLANNER_TODAY_TASKS: PlannerTaskSeed[] = [
  { id: 1, subject: "Mathematics", task: "Revise Real Numbers — PYQ drill", time: "40 min", done: true },
  { id: 2, subject: "Mathematics", task: "Solve Polynomials MCQ set", time: "35 min", done: false },
  { id: 3, subject: "Mathematics", task: "Triangles proof practice", time: "45 min", done: false },
  { id: 4, subject: "Science", task: "Carbon and its Compounds revision", time: "40 min", done: false },
  { id: 5, subject: "Science", task: "Electricity numericals — Ohm's law", time: "30 min", done: true },
  { id: 6, subject: "Social Science", task: "The Freedom Struggle — timeline review", time: "35 min", done: false },
  { id: 7, subject: "Kannada", task: "ಪದ್ಯ ವಿಮರ್ಶೆ — one poem analysis", time: "30 min", done: false },
];

/** Chapter mock exam id → content slug (aligns with content-exam-builder). */
export const CHAPTER_MOCK_EXAM_IDS = {
  realNumbers: "mock_math_ch_real-numbers",
  polynomials: "mock_math_ch_polynomials",
  quadraticEquations: "mock_math_ch_quadratic-equations",
  triangles: "mock_math_ch_triangles",
  areasRelatedToCircles: "mock_math_ch_areas-related-to-circles",
  carbonCompounds: "mock_science_ch_carbon-and-its-compounds",
  electricity: "mock_science_ch_electricity",
  freedomStruggle: "mock_social_ch_chapter_07_freedom_struggle",
} as const;

/** First-language papers — KTBS-aligned unit names (content JSON pending). */
export const ENGLISH_CHAPTERS: CatalogChapter[] = [
  { id: "a-letter-to-god", title: "A Letter to God", chapterNumber: 1, difficulty: "Easy", mastery: 100 },
  { id: "nelson-mandela-long-walk-to-freedom", title: "Nelson Mandela: Long Walk to Freedom", chapterNumber: 2, difficulty: "Medium", mastery: 100 },
  { id: "two-stories-about-flying", title: "Two Stories About Flying", chapterNumber: 3, difficulty: "Medium", mastery: 90 },
  { id: "from-the-diary-of-anne-frank", title: "From the Diary of Anne Frank", chapterNumber: 4, difficulty: "Medium", mastery: 85 },
  { id: "glimpses-of-india", title: "Glimpses of India", chapterNumber: 5, difficulty: "Easy", mastery: 80 },
  { id: "mijbil-the-otter", title: "Mijbil the Otter", chapterNumber: 6, difficulty: "Easy", mastery: 75 },
  { id: "grammar-tenses", title: "Grammar — Tenses", chapterNumber: 7, difficulty: "Hard", mastery: 60 },
  { id: "grammar-reported-speech", title: "Grammar — Reported Speech", chapterNumber: 8, difficulty: "Medium", mastery: 70 },
  { id: "writing-letters", title: "Writing — Letters", chapterNumber: 9, difficulty: "Medium", mastery: 85 },
  { id: "writing-essays", title: "Writing — Essays", chapterNumber: 10, difficulty: "Medium", mastery: 80 },
];

export const KANNADA_CHAPTERS: CatalogChapter[] = [
  { id: "shabari", title: "ಶಬರಿ", chapterNumber: 1, difficulty: "Medium", mastery: 100 },
  { id: "hosa-hadu", title: "ಹೊಸ ಹಾಡು", chapterNumber: 2, difficulty: "Medium", mastery: 95 },
  { id: "vachana-sahitya", title: "ವಚನ ಸಾಹಿತ್ಯ", chapterNumber: 3, difficulty: "Medium", mastery: 90 },
  { id: "bhagyashilpi", title: "ಭಾಗ್ಯಶಿಲ್ಪಿಗಳು", chapterNumber: 4, difficulty: "Easy", mastery: 80 },
  { id: "basavanna-jivana", title: "ಗದ್ಯ — ಬಸವಣ್ಣನವರ ಜೀವನ", chapterNumber: 5, difficulty: "Easy", mastery: 75 },
  { id: "vyakarana-sandhi", title: "ವ್ಯಾಕರಣ — ಸಂಧಿ", chapterNumber: 6, difficulty: "Hard", mastery: 35 },
  { id: "patra-lekhana", title: "ಪತ್ರ ಲೇಖನ", chapterNumber: 7, difficulty: "Medium", mastery: 40 },
  { id: "prabandha-rachane", title: "ಪ್ರಬಂಧ ರಚನೆ", chapterNumber: 8, difficulty: "Medium", mastery: 65 },
  { id: "padya-vimarshe", title: "ಪದ್ಯ ವಿಮರ್ಶೆ", chapterNumber: 9, difficulty: "Medium", mastery: 85 },
];

export const HINDI_CHAPTERS: CatalogChapter[] = [
  { id: "kabeer-ke-dohe", title: "गद्य — कबीर के दोहे", chapterNumber: 1, difficulty: "Medium", mastery: 80 },
  { id: "meerabai", title: "मीराबाई", chapterNumber: 2, difficulty: "Medium", mastery: 75 },
  { id: "bihari-ke-dohe", title: "बिहारी के दोहे", chapterNumber: 3, difficulty: "Medium", mastery: 70 },
  { id: "maithilisharan-gupt", title: "मैथिलीशरण गुप्त", chapterNumber: 4, difficulty: "Medium", mastery: 60 },
  { id: "sakhi", title: "साखी", chapterNumber: 5, difficulty: "Easy", mastery: 65 },
  { id: "vyakaran-sandhi", title: "व्याकरण — संधि", chapterNumber: 6, difficulty: "Hard", mastery: 30 },
  { id: "vyakaran-samas", title: "व्याकरण — समास", chapterNumber: 7, difficulty: "Hard", mastery: 35 },
  { id: "anuvad", title: "अनुवाद", chapterNumber: 8, difficulty: "Hard", mastery: 40 },
  { id: "patra-lekhan", title: "पत्र लेखन", chapterNumber: 9, difficulty: "Easy", mastery: 70 },
];

export function catalogChapterToLegacy(ch: CatalogChapter) {
  return {
    id: ch.id,
    title: ch.title,
    titleKn: ch.titleKn,
    progress: ch.mastery,
    done: ch.mastery >= 75,
    difficulty: ch.difficulty,
  };
}

export function buildSubjectChaptersMap() {
  return {
    math: MATHEMATICS_CHAPTERS.map(catalogChapterToLegacy),
    science: SCIENCE_CHAPTERS.map(catalogChapterToLegacy),
    social: SOCIAL_SCIENCE_CHAPTERS.map(catalogChapterToLegacy),
    english: ENGLISH_CHAPTERS.map(catalogChapterToLegacy),
    kannada: KANNADA_CHAPTERS.map(catalogChapterToLegacy),
    hindi: HINDI_CHAPTERS.map(catalogChapterToLegacy),
  };
}
