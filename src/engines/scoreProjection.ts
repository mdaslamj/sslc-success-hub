import type {
  BlueprintEntry,
  ScoreProjectionOutput,
  StudentLearningProfile,
  Subject,
  SubjectProjection,
} from "@/types/aura-engine-contracts";

import seedProfile from "@/data/StudentLearningProfile.json";
import mathBlueprintFile from "@/data/blueprint.math.json";
import scienceBlueprintFile from "@/data/blueprint.science.json";
import socialBlueprintFile from "@/data/blueprint.social.json";

/** Re-export contract output type for engine consumers. */
export type ScoreProjectionResult = ScoreProjectionOutput;

export type AuraBlueprintChapter = {
  id: string;
  name: string;
  marks: number;
};

export type AuraSubjectBlueprintFile = {
  meta: {
    subjectKey: Subject;
    totalPaperMarks: number;
  };
  chapters: AuraBlueprintChapter[];
  totals: {
    chapters: number;
    marks: number;
  };
};

export type ScoreProjectionValidationResult = {
  pass: boolean;
  output: ScoreProjectionResult;
  expectations: {
    overallPercent: number;
    mathPercent: number;
    sciencePercent: number;
    socialPercent: number;
  };
  errors: string[];
};

const SUBJECTS: Subject[] = ["math", "science", "social"];

const GRADE_THRESHOLDS: Array<{ min: number; grade: string }> = [
  { min: 85, grade: "A+" },
  { min: 75, grade: "A" },
  { min: 65, grade: "B" },
  { min: 50, grade: "C" },
  { min: 0, grade: "Needs Work" },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function gradeFromPercentage(percentage: number): string {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (percentage >= min) return grade;
  }
  return "Needs Work";
}

/** Convert blueprint JSON files into the contract blueprint map. */
export function blueprintFilesToRecord(
  math: AuraSubjectBlueprintFile,
  science: AuraSubjectBlueprintFile,
  social: AuraSubjectBlueprintFile,
): Record<Subject, Record<string, BlueprintEntry>> {
  const files: Record<Subject, AuraSubjectBlueprintFile> = {
    math,
    science,
    social,
  };

  return SUBJECTS.reduce(
    (acc, subject) => {
      acc[subject] = Object.fromEntries(
        files[subject].chapters.map((chapter) => [
          chapter.id,
          { marks: chapter.marks, name: chapter.name },
        ]),
      );
      return acc;
    },
    {} as Record<Subject, Record<string, BlueprintEntry>>,
  );
}

function projectSubject(
  subject: Subject,
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
): SubjectProjection {
  const subjectBlueprint = blueprint[subject] ?? {};
  const subjectMastery = chapterMastery[subject] ?? {};

  let predicted = 0;
  let max = 0;

  for (const [chapterId, entry] of Object.entries(subjectBlueprint)) {
    const mastery = subjectMastery[chapterId]?.mastery ?? 0;
    predicted += (mastery * entry.marks) / 100;
    max += entry.marks;
  }

  const percentage = max > 0 ? round1((predicted / max) * 100) : 0;

  return {
    predicted: round2(predicted),
    max,
    percentage,
  };
}

/**
 * ScoreProjectionEngine — weighted predicted marks from chapter mastery × blueprint.
 * Formula per chapter: mastery[ch] × blueprintMarks[ch] / 100
 */
export function scoreProjectionEngine(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
): ScoreProjectionResult {
  const bySubject = SUBJECTS.reduce(
    (acc, subject) => {
      acc[subject] = projectSubject(subject, chapterMastery, blueprint);
      return acc;
    },
    {} as Record<Subject, SubjectProjection>,
  );

  const total = round2(
    SUBJECTS.reduce((sum, subject) => sum + bySubject[subject].predicted, 0),
  );
  const totalMax = SUBJECTS.reduce((sum, subject) => sum + bySubject[subject].max, 0);
  const percentage = totalMax > 0 ? round1((total / totalMax) * 100) : 0;

  return {
    bySubject,
    total,
    totalMax,
    percentage,
    grade: gradeFromPercentage(percentage),
    computedAt: new Date().toISOString(),
  };
}

/** Overall board-readiness percentage (alias for contract `percentage`). */
export function getReadinessPercentage(output: ScoreProjectionResult): number {
  return output.percentage;
}

export function loadSeedBlueprint(): Record<Subject, Record<string, BlueprintEntry>> {
  return blueprintFilesToRecord(
    mathBlueprintFile as AuraSubjectBlueprintFile,
    scienceBlueprintFile as AuraSubjectBlueprintFile,
    socialBlueprintFile as AuraSubjectBlueprintFile,
  );
}

export function loadSeedProfile(): StudentLearningProfile {
  return seedProfile as unknown as StudentLearningProfile;
}

/** Run projection using seed profile + canonical blueprint JSON files. */
export function runScoreProjectionFromSeed(): ScoreProjectionResult {
  const profile = loadSeedProfile();
  const blueprint = loadSeedBlueprint();
  return scoreProjectionEngine(profile.chapterMastery, blueprint);
}

/** Approximate targets from AURA seed spec (profile targetConfig rounds overall to 74). */
const SEED_EXPECTATIONS = {
  overallPercent: 74,
  mathPercent: 73,
  sciencePercent: 66,
  socialPercent: 79,
} as const;

const PERCENT_TOLERANCE = 2.5;

function near(actual: number, expected: number, label: string, errors: string[]): void {
  if (Math.abs(actual - expected) > PERCENT_TOLERANCE) {
    errors.push(`${label}: expected ~${expected}%, got ${actual}%`);
  }
}

/**
 * Unit-test style validation against Arjun seed data.
 * Expected: overall ~74%, math ~73%, science ~66%, social ~79%.
 */
export function validateScoreProjectionSeed(): ScoreProjectionValidationResult {
  const output = runScoreProjectionFromSeed();
  const errors: string[] = [];

  near(output.percentage, SEED_EXPECTATIONS.overallPercent, "Overall readiness", errors);
  near(
    output.bySubject.math.percentage,
    SEED_EXPECTATIONS.mathPercent,
    "Math subject",
    errors,
  );
  near(
    output.bySubject.science.percentage,
    SEED_EXPECTATIONS.sciencePercent,
    "Science subject",
    errors,
  );
  near(
    output.bySubject.social.percentage,
    SEED_EXPECTATIONS.socialPercent,
    "Social subject",
    errors,
  );

  if (output.totalMax !== 258) {
    errors.push(`totalMax: expected 258, got ${output.totalMax}`);
  }

  if (output.bySubject.math.max !== 80) {
    errors.push(`math max marks: expected 80, got ${output.bySubject.math.max}`);
  }

  if (output.bySubject.science.max !== 81) {
    errors.push(`science max marks: expected 81, got ${output.bySubject.science.max}`);
  }

  if (output.bySubject.social.max !== 97) {
    errors.push(`social max marks: expected 97, got ${output.bySubject.social.max}`);
  }

  if (output.grade !== "B") {
    errors.push(`grade: expected B at ~73%, got ${output.grade}`);
  }

  return {
    pass: errors.length === 0,
    output,
    expectations: { ...SEED_EXPECTATIONS },
    errors,
  };
}
