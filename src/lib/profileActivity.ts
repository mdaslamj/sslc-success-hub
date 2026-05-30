import type { StudentLearningProfile, Subject } from "@/types/aura-engine-contracts";

const ENGINE_SUBJECTS: Subject[] = ["math", "science", "social"];

/** True when the student has logged at least one session or chapter mastery entry. */
export function hasStudyActivity(profile: StudentLearningProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.sessionHistory.length > 0) return true;
  return ENGINE_SUBJECTS.some(
    (subject) => Object.keys(profile.chapterMastery[subject] ?? {}).length > 0,
  );
}

export function sessionCount(profile: StudentLearningProfile | null | undefined): number {
  return profile?.sessionHistory.length ?? 0;
}

export function hasSubjectTargets(profile: StudentLearningProfile | null | undefined): boolean {
  const targets = profile?.subjectTargets;
  return Boolean(targets && Object.keys(targets).length > 0);
}
