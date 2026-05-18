// Firestore document shapes. Keep these aligned with the seeder and rules.

export type SubjectDoc = {
  id: string;
  name: string;
  nameKn?: string;
  emoji: string;
  color: string;
  completion: number;
  mastery: number;
  target: number;
  predicted: number;
  chaptersTotal: number;
  chaptersDone: number;
  weakTopics: string[];
  strongTopics: string[];
  order: number;
};

export type ChapterDoc = {
  id: string;
  subjectId: string;
  title: string;
  titleKn?: string;
  progress: number;
  done: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  order: number;
};

export type UserDoc = {
  uid: string;
  displayName?: string;
  email?: string;
  createdAt: number;
};

export type ProgressDoc = {
  userId: string;
  subjectId: string;
  chapterId?: string;
  progress: number;
  updatedAt: number;
};