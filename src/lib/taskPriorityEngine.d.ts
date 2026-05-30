/** Type declarations for taskPriorityEngine.js */

export type SubjectStatus = {
  key: string;
  label: string;
  color: string;
  bg: string;
};

export type PlannerEngineSubject = {
  id: string;
  name: string;
  color?: string;
  target: number;
  predicted: number;
  mastery?: number;
  emoji?: string;
};

export type PlannerEngineChapter = {
  id: string;
  title: string;
  subjectId: string;
  mastery: number;
  blueprintMarks?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
};

export type RankedPlannerTask = {
  id: number;
  subject: string;
  subjectId: string;
  task: string;
  title: string;
  time: string;
  durationMin: number;
  done: boolean;
  whyText: string;
  subjectColor: string;
  priorityScore: number;
  chapter: PlannerEngineChapter & {
    subjectName: string;
    whyText: string;
    priorityScore: number;
  };
};

export function getSubjectStatus(predicted: number, target: number): SubjectStatus;

export function getStatusColor(status: string): string;

export function getStatusBand(status: string): SubjectStatus;

export function getMasteryStatus(mastery: number): SubjectStatus;

export function getMarksAtRiskStatus(marksAtRisk: number): SubjectStatus;

export function rankChaptersForTodaySync(
  chapters: PlannerEngineChapter[],
  subjects: PlannerEngineSubject[],
  limit?: number,
): RankedPlannerTask[];

export function rankChaptersForToday(
  chapters: PlannerEngineChapter[],
  subjects: PlannerEngineSubject[],
  limit?: number,
): Promise<RankedPlannerTask[]>;

export const SAMPLE_SUBJECTS: PlannerEngineSubject[];
export const SAMPLE_CHAPTERS: PlannerEngineChapter[];
