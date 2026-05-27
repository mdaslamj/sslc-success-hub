import assert from "node:assert/strict";
import { recoveryEngine, runRecoveryFromSeed } from "@/engines/recovery";
import {
  blueprintFilesToRecord,
  type AuraSubjectBlueprintFile,
} from "@/engines/scoreProjection";

function testRecoveryElectricityTop(): void {
  const result = runRecoveryFromSeed();
  const top = result.top3[0]!;

  assert.equal(top.chapter, "electricity");
  assert.equal(top.name, "Electricity");
  assert.equal(top.subject, "science");
  assert.equal(top.currentMastery, 44);
  assert.equal(top.blueprintMarks, 8);
  assert.equal(top.urgency, "critical");
  assert.equal(top.marksAtRisk, 4.48);
  assert.equal(top.recoverableMarks, 3.49);
  assert.equal(top.actionPlan.length, 3);
  assert.equal(top.actionPlan[0]!.type, "concept_review");
  assert.equal(top.actionPlan[1]!.type, "pyq_practice");
  assert.equal(top.actionPlan[2]!.type, "timed_test");
  assert.equal(top.status, "active");
  assert.ok(result.totalAtRisk > 0);
  assert.ok(result.items[0]!.marksAtRisk >= result.items[1]!.marksAtRisk);
}

function testRecoveryThreshold(): void {
  const blueprint = blueprintFilesToRecord(
    {
      meta: { subjectKey: "math", totalPaperMarks: 10 },
      chapters: [{ id: "strong", name: "Strong", marks: 10 }],
      totals: { chapters: 1, marks: 10 },
    } satisfies AuraSubjectBlueprintFile,
    {
      meta: { subjectKey: "science", totalPaperMarks: 8 },
      chapters: [{ id: "weak", name: "Weak", marks: 8 }],
      totals: { chapters: 1, marks: 8 },
    },
    {
      meta: { subjectKey: "social", totalPaperMarks: 5 },
      chapters: [{ id: "edge", name: "Edge", marks: 5 }],
      totals: { chapters: 1, marks: 5 },
    },
  );

  const result = recoveryEngine(
    {
      math: {
        strong: {
          mastery: 72,
          trend: "stable",
          lastPracticed: "2025-05-01",
          attemptCount: 1,
        },
      },
      science: {
        weak: {
          mastery: 40,
          trend: "declining",
          lastPracticed: "2025-05-01",
          attemptCount: 1,
        },
      },
      social: {
        edge: {
          mastery: 71,
          trend: "stable",
          lastPracticed: "2025-05-01",
          attemptCount: 1,
        },
      },
    },
    blueprint,
    [],
  );

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]!.chapter, "weak");
  assert.equal(result.items.some((item) => item.chapter === "strong"), false);
}

export function runRecoveryTests(): void {
  testRecoveryElectricityTop();
  testRecoveryThreshold();
  console.log("recovery tests passed");
}

runRecoveryTests();
