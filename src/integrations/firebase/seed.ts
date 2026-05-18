import { doc, setDoc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, db } from "./config";
import { subjects as mockSubjects, subjectChapters } from "@/lib/mock-data";

/**
 * One-time seeder: pushes mock subjects + chapters into Firestore.
 * Idempotent — re-running overwrites the same doc ids.
 */
export async function seedFirestore(): Promise<{
  subjects: number;
  chapters: number;
}> {
  const batch = writeBatch(db);

  mockSubjects.forEach((s, i) => {
    const ref = doc(db, COLLECTIONS.SUBJECTS, s.id);
    batch.set(ref, {
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
  });

  let chapterCount = 0;
  for (const subjectId of Object.keys(subjectChapters)) {
    const chapters = subjectChapters[subjectId];
    chapters.forEach((c, i) => {
      const ref = doc(db, COLLECTIONS.CHAPTERS, c.id);
      batch.set(ref, {
        subjectId,
        title: c.title,
        titleKn: c.titleKn ?? null,
        progress: c.progress,
        done: c.done,
        difficulty: c.difficulty,
        order: i,
      });
      chapterCount++;
    });
  }

  await batch.commit();

  // Touch users + progress collections so they appear in the console.
  await setDoc(doc(db, COLLECTIONS.USERS, "_placeholder"), {
    note: "Placeholder doc — safe to delete after first real user signs up.",
    createdAt: Date.now(),
  });
  await setDoc(doc(db, COLLECTIONS.PROGRESS, "_placeholder"), {
    note: "Placeholder doc — safe to delete after first real progress entry.",
    createdAt: Date.now(),
  });

  return { subjects: mockSubjects.length, chapters: chapterCount };
}