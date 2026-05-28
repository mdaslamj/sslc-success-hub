import type { StudentLearningProfile, Subject } from "@/types/aura-engine-contracts";

export type PlannerTaskSnapshot = {
  id: number;
  subject: string;
  task: string;
  durationMin: number;
  done: boolean;
};

export type ExecutionDelta = {
  taskId: number;
  subject: Subject | null;
  readinessDelta: number;
  subjectMasteryDelta: Record<Subject, number>;
  label: string;
};

export type ExecutionApplyResult = {
  profile: StudentLearningProfile;
  totalReadinessDelta: number;
  subjectMasteryDelta: Record<Subject, number>;
  completedCount: number;
  lastImpact: ExecutionDelta | null;
};

const ENGINE_SUBJECTS: Subject[] = ["math", "science", "social"];

export function mapTaskSubjectToEngine(subject: string): Subject | null {
  const lower = subject.toLowerCase();
  if (lower.includes("math")) return "math";
  if (lower.includes("sci")) return "science";
  if (lower.includes("social")) return "social";
  return null;
}

function cloneProfile(profile: StudentLearningProfile): StudentLearningProfile {
  return JSON.parse(JSON.stringify(profile)) as StudentLearningProfile;
}

/** Pure impact model — replace with AI prediction engine when wired. */
export function computeTaskImpact(task: PlannerTaskSnapshot): ExecutionDelta {
  const subject = mapTaskSubjectToEngine(task.subject);
  const intensity = Math.min(1.4, 0.35 + task.durationMin / 50);
  const subjectMasteryDelta: Record<Subject, number> = {
    math: 0,
    science: 0,
    social: 0,
  };

  if (subject) {
    subjectMasteryDelta[subject] = intensity;
  }

  return {
    taskId: task.id,
    subject,
    readinessDelta: intensity * 0.28,
    subjectMasteryDelta,
    label: task.task,
  };
}

/** Apply today's completed planner tasks onto a cloned profile (display deltas only). */
export function applyExecutionDeltas(
  profile: StudentLearningProfile,
  tasks: PlannerTaskSnapshot[],
): ExecutionApplyResult {
  const next = cloneProfile(profile);
  const completed = tasks.filter((t) => t.done);
  const aggregateDelta: Record<Subject, number> = { math: 0, science: 0, social: 0 };
  let totalReadinessDelta = 0;
  let lastImpact: ExecutionDelta | null = null;

  for (const task of completed) {
    const impact = computeTaskImpact(task);
    totalReadinessDelta += impact.readinessDelta;
    lastImpact = impact;

    if (impact.subject) {
      aggregateDelta[impact.subject] += impact.subjectMasteryDelta[impact.subject];
    }
  }

  // Small cross-subject spillover from balanced study days.
  const activeSubjects = ENGINE_SUBJECTS.filter((s) => aggregateDelta[s] > 0);
  if (activeSubjects.length >= 2) {
    totalReadinessDelta += 0.15;
  }

  return {
    profile: next,
    totalReadinessDelta,
    subjectMasteryDelta: aggregateDelta,
    completedCount: completed.length,
    lastImpact,
  };
}
