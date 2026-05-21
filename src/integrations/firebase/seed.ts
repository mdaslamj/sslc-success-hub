import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";
import {
  subjects as mockSubjects,
  subjectChapters,
  type Chapter,
  type Subject,
} from "@/lib/mock-data";

// Canonical layout used by the app:
//   subject/{subjectId}
//   subject/{subjectId}/chapters/{chapterId}
const SUBJECT_COLLECTION = "subject";
const CHAPTERS_SUBCOLLECTION = "chapters";
const META_COLLECTION = "_meta";
const SEED_DOC = "seed";

// Map mock-data subject ids -> canonical Firestore ids used by the UI.
const SUBJECT_ID_MAP: Record<string, string> = {
  math: "mathematics",
  science: "science",
  social: "social-science",
  english: "english",
  kannada: "kannada",
  hindi: "hindi",
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || input.toLowerCase()
  );
}

function chapterDocId(c: Chapter): string {
  const slug = slugify(c.title);
  return slug.length > 1 ? slug : c.id;
}

// Lightweight per-chapter content (summary, learningPoints, formulas).
// Math chapter ids are slugs of chapter titles.
const MATH_CONTENT: Record<
  string,
  { summary?: string; learningPoints?: string[]; formulas?: string[] }
> = {
  "real-numbers": {
    summary:
      "Euclid's division lemma, the Fundamental Theorem of Arithmetic, and properties of irrational numbers and terminating decimals.",
    learningPoints: [
      "Apply Euclid's division algorithm to find HCF",
      "Express composite numbers as products of primes",
      "Prove irrationality of √2, √3, √5",
      "Identify terminating vs non-terminating decimals",
    ],
    formulas: ["a = bq + r, 0 ≤ r < b", "HCF(a,b) × LCM(a,b) = a × b"],
  },
  polynomials: {
    summary: "Zeros of a polynomial and the relationship between zeros and coefficients.",
    learningPoints: [
      "Find zeros of quadratic polynomials",
      "Sum & product of zeros",
      "Division algorithm for polynomials",
    ],
    formulas: ["Sum of zeros = -b/a", "Product of zeros = c/a"],
  },
  "quadratic-equations": {
    summary: "Solve quadratic equations by factorisation, completing the square and the quadratic formula.",
    learningPoints: ["Factorisation method", "Completing the square", "Discriminant & nature of roots"],
    formulas: ["x = (-b ± √(b² - 4ac)) / 2a", "D = b² - 4ac"],
  },
  "arithmetic-progressions": {
    summary: "Sequences with a common difference; nth term and sum of first n terms.",
    learningPoints: ["Identify AP", "Find nth term", "Find sum to n terms"],
    formulas: ["aₙ = a + (n-1)d", "Sₙ = n/2 [2a + (n-1)d]"],
  },
  "introduction-to-trigonometry": {
    summary: "Trigonometric ratios of acute angles and standard identities.",
    learningPoints: ["Ratios sin, cos, tan", "Values at 0°,30°,45°,60°,90°", "Trig identities"],
    formulas: ["sin²θ + cos²θ = 1", "1 + tan²θ = sec²θ", "1 + cot²θ = cosec²θ"],
  },
  "surface-areas-volumes": {
    summary: "Surface areas and volumes of combinations of solids.",
    learningPoints: ["Cylinder, cone, sphere, hemisphere", "Frustum of a cone"],
    formulas: [
      "Sphere V = 4/3 πr³",
      "Cone V = 1/3 πr²h",
      "Cylinder V = πr²h",
      "Hemisphere TSA = 3πr²",
    ],
  },
};

function contentForChapter(
  subjectId: string,
  docId: string,
  c: Chapter,
): { summary: string; learningPoints: string[]; formulas: string[] } {
  const math = subjectId === "mathematics" ? MATH_CONTENT[docId] : undefined;
  return {
    summary:
      math?.summary ??
      `${c.title} — key concepts, examples, and important questions for the SSLC board exam.`,
    learningPoints: math?.learningPoints ?? [
      `Understand the core ideas of ${c.title}`,
      `Practise textbook exercises and previous-year questions`,
      `Revise definitions, theorems and worked examples`,
    ],
    formulas: math?.formulas ?? [],
  };
}

/**
 * One-time seeder. Writes the existing mock subjects and chapters into the
 * canonical `subject/{id}` and `subject/{id}/chapters/{id}` paths. Skips any
 * document that already exists (safe to re-run; no overwrites).
 */
export async function seedFirestore(): Promise<{
  subjects: number;
  chapters: number;
  skippedSubjects: number;
  skippedChapters: number;
}> {
  let subjectsWritten = 0;
  let chaptersWritten = 0;
  let skippedSubjects = 0;
  let skippedChapters = 0;

  for (let i = 0; i < mockSubjects.length; i++) {
    const s: Subject = mockSubjects[i];
    const fsId = SUBJECT_ID_MAP[s.id] ?? s.id;
    const subjectRef = doc(db, SUBJECT_COLLECTION, fsId);
    const exists = await getDoc(subjectRef);
    if (exists.exists()) {
      skippedSubjects++;
    } else {
      await setDoc(subjectRef, {
        name: s.name,
        nameKn: s.nameKn ?? null,
        emoji: s.emoji,
        color: s.color,
        completion: s.completion,
        mastery: s.mastery,
        target: s.target,
        predicted: s.predicted,
        chaptersTotal: s.chapters,
        chaptersDone: s.chaptersDone,
        weakTopics: s.weakTopics,
        strongTopics: s.strongTopics,
        order: i,
      });
      subjectsWritten++;
    }

    const chapters = subjectChapters[s.id] ?? [];
    for (let j = 0; j < chapters.length; j++) {
      const c = chapters[j];
      const docId = chapterDocId(c);
      const chRef = doc(db, SUBJECT_COLLECTION, fsId, CHAPTERS_SUBCOLLECTION, docId);
      const chExists = await getDoc(chRef);
      if (chExists.exists()) {
        skippedChapters++;
        continue;
      }
      const extra = contentForChapter(fsId, docId, c);
      await setDoc(chRef, {
        subjectId: fsId,
        title: c.title,
        titleKn: c.titleKn ?? null,
        chapterNumber: j + 1,
        order: j,
        progress: c.progress,
        done: c.done,
        difficulty: c.difficulty,
        emoji: "📘",
        summary: extra.summary,
        learningPoints: extra.learningPoints,
        formulas: extra.formulas,
      });
      chaptersWritten++;
    }
  }

  await setDoc(doc(db, META_COLLECTION, SEED_DOC), {
    seededAt: Date.now(),
    subjects: subjectsWritten + skippedSubjects,
    chapters: chaptersWritten + skippedChapters,
  });

  return {
    subjects: subjectsWritten,
    chapters: chaptersWritten,
    skippedSubjects,
    skippedChapters,
  };
}

export interface SeedStatus {
  seeded: boolean;
  subjects: number;
  chapters: number;
  seededAt: number | null;
}

export async function fetchSeedStatus(): Promise<SeedStatus> {
  const metaRef = doc(db, META_COLLECTION, SEED_DOC);
  const [metaSnap, subjectsCount] = await Promise.all([
    getDoc(metaRef),
    getCountFromServer(collection(db, SUBJECT_COLLECTION)),
  ]);
  const subjects = subjectsCount.data().count;

  // Sum chapters across each subject subcollection (small N, one-shot UI).
  let chapters = 0;
  const subjectsSnap = await getDocs(collection(db, SUBJECT_COLLECTION));
  for (const s of subjectsSnap.docs) {
    const c = await getCountFromServer(
      collection(db, SUBJECT_COLLECTION, s.id, CHAPTERS_SUBCOLLECTION),
    );
    chapters += c.data().count;
  }

  const meta = metaSnap.exists() ? (metaSnap.data() as { seededAt?: number }) : null;
  return {
    seeded: subjects > 0,
    subjects,
    chapters,
    seededAt: meta?.seededAt ?? null,
  };
}