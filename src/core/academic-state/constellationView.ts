import { computeSubjectMasteryView } from "@/core/academic-state/masteryEngine";
import { SSLC_SUBJECTS } from "@/data/sslc-academic-catalog";
import { buildConstellationChapterPool } from "@/lib/constellation-chapter-pool";
import type { ConstellationChapter } from "@/lib/constellation-chapter-pool";
import type {
  ScoreProjectionOutput,
  StudentLearningProfile,
  Subject,
} from "@/types/aura-engine-contracts";

export type ConstellationSubjectView = {
  name: string;
  color: string;
  mastery: number;
  predicted: number;
  target: number;
};

export type ConstellationView = {
  subjects: Record<string, ConstellationSubjectView>;
  chapters: ConstellationChapter[];
};

/** Hex colors for SVG rendering (catalog stores oklch for Tailwind). */
const SUBJECT_HEX: Record<string, string> = {
  math: "#FBBF24",
  science: "#38BDF8",
  social: "#4ADE80",
  english: "#C084FC",
  kannada: "#FB923C",
  hindi: "#F472B6",
};

const ENGINE_SUBJECTS: Subject[] = ["math", "science", "social"];

function averageChapterMastery(chapters: ConstellationChapter[]): number {
  if (chapters.length === 0) return 0;
  return Math.round(
    chapters.reduce((sum, ch) => sum + ch.mastery, 0) / chapters.length,
  );
}

/**
 * Read-only constellation view derived from the persisted profile + engine projection.
 * No separate state — mirrors the single academic-state graph.
 */
export function buildConstellationView(
  profile: StudentLearningProfile,
  projection: ScoreProjectionOutput,
): ConstellationView {
  const chapters = buildConstellationChapterPool(profile);
  const masteryView = computeSubjectMasteryView(profile.chapterMastery, projection);

  const subjects: Record<string, ConstellationSubjectView> = {};

  for (const catalogSubject of SSLC_SUBJECTS) {
    const subjectChapters = chapters.filter((ch) => ch.subjectId === catalogSubject.id);
    const isEngineSubject = ENGINE_SUBJECTS.includes(catalogSubject.id as Subject);

    const mastery = isEngineSubject
      ? masteryView[catalogSubject.id as Subject].mastery
      : averageChapterMastery(subjectChapters);

    const predicted = isEngineSubject
      ? masteryView[catalogSubject.id as Subject].predicted
      : Math.round(catalogSubject.predicted);

    subjects[catalogSubject.id] = {
      name: catalogSubject.name,
      color: SUBJECT_HEX[catalogSubject.id] ?? catalogSubject.color,
      mastery,
      predicted,
      target: catalogSubject.target,
    };
  }

  return { subjects, chapters };
}
