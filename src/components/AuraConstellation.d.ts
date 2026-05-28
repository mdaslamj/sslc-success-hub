export type ConstellationSubject = {
  name: string;
  color: string;
  mastery: number;
  predicted: number;
  target: number;
};

export type ConstellationChapter = {
  id: string;
  subjectId: string;
  name: string;
  blueprintMarks: number;
  mastery: number;
};

export type AuraConstellationProps = {
  subjects: Record<string, ConstellationSubject>;
  chapters: ConstellationChapter[];
  burnoutScore: number;
  momentumScore: number;
  onSubjectTap: (subjectId: string) => void;
};

export default function AuraConstellation(props: AuraConstellationProps): JSX.Element;
