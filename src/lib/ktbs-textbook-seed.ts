import type { LibraryResourceDoc } from "@/integrations/firebase/types";

/**
 * KTBS / NCERT textbook chapter links for Karnataka SSLC (Class 10).
 *
 * Storage strategy: URL-only — KTBS and NCERT host these PDFs publicly, so we
 * don't re-upload. Each entry maps onto an existing `chapters` document via
 * `subjectId` + `chapterId` (the same IDs the syllabus importer creates,
 * e.g. `math_ch01`).
 *
 * English-medium PDFs use the NCERT mirror used elsewhere in the app
 * (rationalised editions, the same set Karnataka SSLC follows for Math &
 * Science). Kannada-medium entries point to the KTBS subject page where the
 * official Kannada textbook can be downloaded — per-chapter Kannada PDFs are
 * not consistently exposed by KTBS, so the link opens the textbook index.
 */

const KTBS_KANNADA_SSLC_MATH =
  "https://ktbs.kar.nic.in/New/Textbooks/class-x/kannada/maths/class-x-kannada-maths-contents.html";

const KTBS_KANNADA_SSLC_SCIENCE =
  "https://ktbs.kar.nic.in/New/Textbooks/class-x/kannada/science/class-x-kannada-science-contents.html";

const KTBS_KANNADA_SSLC_SOCIAL =
  "https://ktbs.kar.nic.in/New/Textbooks/class-x/kannada/social-science/class-x-kannada-social-science-contents.html";

type ChapterSeed = {
  number: number;
  name: string;
  /** Direct chapter PDF (English) when available. */
  en?: string;
  /** Kannada textbook URL (often a contents page). */
  kn?: string;
};

/** NCERT rationalised Mathematics — jemh101…jemh114. */
const MATH_CHAPTERS: ChapterSeed[] = [
  { number: 1, name: "Real Numbers", en: "https://ncert.nic.in/textbook/pdf/jemh101.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 2, name: "Polynomials", en: "https://ncert.nic.in/textbook/pdf/jemh102.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 3, name: "Pair of Linear Equations in Two Variables", en: "https://ncert.nic.in/textbook/pdf/jemh103.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 4, name: "Quadratic Equations", en: "https://ncert.nic.in/textbook/pdf/jemh104.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 5, name: "Arithmetic Progressions", en: "https://ncert.nic.in/textbook/pdf/jemh105.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 6, name: "Triangles", en: "https://ncert.nic.in/textbook/pdf/jemh106.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 7, name: "Coordinate Geometry", en: "https://ncert.nic.in/textbook/pdf/jemh107.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 8, name: "Introduction to Trigonometry", en: "https://ncert.nic.in/textbook/pdf/jemh108.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 9, name: "Some Applications of Trigonometry", en: "https://ncert.nic.in/textbook/pdf/jemh109.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 10, name: "Circles", en: "https://ncert.nic.in/textbook/pdf/jemh110.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 11, name: "Areas Related to Circles", en: "https://ncert.nic.in/textbook/pdf/jemh111.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 12, name: "Surface Areas and Volumes", en: "https://ncert.nic.in/textbook/pdf/jemh112.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 13, name: "Statistics", en: "https://ncert.nic.in/textbook/pdf/jemh113.pdf", kn: KTBS_KANNADA_SSLC_MATH },
  { number: 14, name: "Probability", en: "https://ncert.nic.in/textbook/pdf/jemh114.pdf", kn: KTBS_KANNADA_SSLC_MATH },
];

/** NCERT Science — jesc101…jesc113 (rationalised). */
const SCIENCE_CHAPTERS: ChapterSeed[] = [
  { number: 1, name: "Chemical Reactions and Equations", en: "https://ncert.nic.in/textbook/pdf/jesc101.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 2, name: "Acids, Bases and Salts", en: "https://ncert.nic.in/textbook/pdf/jesc102.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 3, name: "Metals and Non-metals", en: "https://ncert.nic.in/textbook/pdf/jesc103.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 4, name: "Carbon and its Compounds", en: "https://ncert.nic.in/textbook/pdf/jesc104.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 5, name: "Life Processes", en: "https://ncert.nic.in/textbook/pdf/jesc105.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 6, name: "Control and Coordination", en: "https://ncert.nic.in/textbook/pdf/jesc106.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 7, name: "How do Organisms Reproduce?", en: "https://ncert.nic.in/textbook/pdf/jesc107.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 8, name: "Heredity", en: "https://ncert.nic.in/textbook/pdf/jesc108.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 9, name: "Light – Reflection and Refraction", en: "https://ncert.nic.in/textbook/pdf/jesc109.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 10, name: "The Human Eye and the Colourful World", en: "https://ncert.nic.in/textbook/pdf/jesc110.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 11, name: "Electricity", en: "https://ncert.nic.in/textbook/pdf/jesc111.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 12, name: "Magnetic Effects of Electric Current", en: "https://ncert.nic.in/textbook/pdf/jesc112.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
  { number: 13, name: "Our Environment", en: "https://ncert.nic.in/textbook/pdf/jesc113.pdf", kn: KTBS_KANNADA_SSLC_SCIENCE },
];

/** Social Science — use KTBS index for both media (no stable NCERT mirror that matches KSEAB ordering). */
const SOCIAL_CHAPTERS: ChapterSeed[] = [
  { number: 1, name: "Advent of Europeans to India", kn: KTBS_KANNADA_SSLC_SOCIAL },
  { number: 2, name: "Extension of British rule in India", kn: KTBS_KANNADA_SSLC_SOCIAL },
  { number: 3, name: "Impact of British Rule in India", kn: KTBS_KANNADA_SSLC_SOCIAL },
  { number: 4, name: "Social and Religious Reform Movements", kn: KTBS_KANNADA_SSLC_SOCIAL },
  { number: 5, name: "Freedom Movement", kn: KTBS_KANNADA_SSLC_SOCIAL },
];

function entry(
  subjectId: string,
  ch: ChapterSeed,
  language: "en" | "kn",
  url: string,
): LibraryResourceDoc {
  const chapterId = `${subjectId}_ch${String(ch.number).padStart(2, "0")}`;
  return {
    id: `ktbs_${subjectId}_${chapterId}_${language}`,
    title: `Ch ${ch.number}. ${ch.name}`,
    category: "textbook",
    resourceType: "textbook",
    subjectId,
    chapterId,
    url,
    language,
    tags: ["ktbs", "sslc", "class-10", subjectId],
    isFeatured: false,
    isOfficial: true,
    icon: "BookOpen",
    views: 0,
    createdAt: 0,
    updatedAt: 0,
  };
}

function buildSubjectSeed(
  subjectId: string,
  chapters: ChapterSeed[],
): LibraryResourceDoc[] {
  const out: LibraryResourceDoc[] = [];
  for (const ch of chapters) {
    if (ch.en) out.push(entry(subjectId, ch, "en", ch.en));
    if (ch.kn) out.push(entry(subjectId, ch, "kn", ch.kn));
  }
  return out;
}

/** Full KTBS textbook seed across all available subjects. */
export const KTBS_TEXTBOOK_SEED: LibraryResourceDoc[] = [
  ...buildSubjectSeed("math", MATH_CHAPTERS),
  ...buildSubjectSeed("science", SCIENCE_CHAPTERS),
  ...buildSubjectSeed("social", SOCIAL_CHAPTERS),
];

/** Convenience grouping for diagnostics / admin UI counters. */
export const KTBS_TEXTBOOK_SUBJECTS = [
  { subjectId: "math", chapters: MATH_CHAPTERS.length },
  { subjectId: "science", chapters: SCIENCE_CHAPTERS.length },
  { subjectId: "social", chapters: SOCIAL_CHAPTERS.length },
];