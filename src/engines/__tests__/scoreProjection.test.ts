import assert from "node:assert/strict";
import {
  blueprintFilesToRecord,
  gradeFromPercentage,
  scoreProjectionEngine,
  validateScoreProjectionSeed,
  type AuraSubjectBlueprintFile,
} from "@/engines/scoreProjection";

function testGradeMapping(): void {
  assert.equal(gradeFromPercentage(90), "A+");
  assert.equal(gradeFromPercentage(80), "A");
  assert.equal(gradeFromPercentage(70), "B");
  assert.equal(gradeFromPercentage(55), "C");
  assert.equal(gradeFromPercentage(40), "Needs Work");
}

function testWeightedSubjectProjection(): void {
  const blueprint = blueprintFilesToRecord(
    {
      meta: { subjectKey: "math", totalPaperMarks: 10 },
      chapters: [
        { id: "a", name: "Chapter A", marks: 6 },
        { id: "b", name: "Chapter B", marks: 4 },
      ],
      totals: { chapters: 2, marks: 10 },
    } satisfies AuraSubjectBlueprintFile,
    {
      meta: { subjectKey: "science", totalPaperMarks: 0 },
      chapters: [],
      totals: { chapters: 0, marks: 0 },
    },
    {
      meta: { subjectKey: "social", totalPaperMarks: 0 },
      chapters: [],
      totals: { chapters: 0, marks: 0 },
    },
  );

  const result = scoreProjectionEngine(
    {
      math: {
        a: { mastery: 100, trend: "stable", lastPracticed: "2025-01-01", attemptCount: 1 },
        b: { mastery: 50, trend: "stable", lastPracticed: "2025-01-01", attemptCount: 1 },
      },
      science: {},
      social: {},
    },
    blueprint,
  );

  assert.equal(result.bySubject.math.predicted, 8);
  assert.equal(result.bySubject.math.max, 10);
  assert.equal(result.bySubject.math.percentage, 80);
}

function assertNear(actual: number, expected: number, label: string, tolerance = 2.5): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ~${expected}%, got ${actual}%`,
  );
}

function testSeedValidation(): void {
  const validation = validateScoreProjectionSeed();

  if (!validation.pass) {
    console.error("Seed validation errors:", validation.errors);
  }

  assert.ok(validation.pass, validation.errors.join("; "));

  const { output } = validation;
  assertNear(output.percentage, 74, "Overall readiness");
  assertNear(output.bySubject.math.percentage, 73, "Math");
  assertNear(output.bySubject.science.percentage, 66, "Science");
  assertNear(output.bySubject.social.percentage, 79, "Social");
  assert.equal(output.totalMax, 258);
  assert.equal(output.grade, "B");
}

export function runScoreProjectionTests(): void {
  testGradeMapping();
  testWeightedSubjectProjection();
  testSeedValidation();
  console.log("scoreProjection tests passed");
}

runScoreProjectionTests();
