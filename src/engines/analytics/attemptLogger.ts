import type { QuestionAttempt, Subject } from "@/types/question";

const STORAGE_KEY = "aura_attempts";
const MAX_ATTEMPTS = 500;

export function saveAttempt(attempt: QuestionAttempt): void {
  try {
    const existing = readAllAttempts();
    const updated = [...existing, attempt].slice(-MAX_ATTEMPTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Never crash the exam on storage failure
  }
}

export function readAllAttempts(): QuestionAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuestionAttempt[]) : [];
  } catch {
    return [];
  }
}

export function getAttemptsByChapter(chapterId: string): QuestionAttempt[] {
  return readAllAttempts().filter((a) => a.chapterId === chapterId);
}

export function getAttemptsBySubject(subject: Subject): QuestionAttempt[] {
  return readAllAttempts().filter((a) => a.subject === subject);
}

export function getAttemptsByQuestion(questionId: string): QuestionAttempt[] {
  return readAllAttempts().filter((a) => a.questionId === questionId);
}

export function getRecentAttempts(count: number): QuestionAttempt[] {
  return readAllAttempts().slice(-count);
}

const PANIC_TIMING_THRESHOLD_MS = 8_000;

export function detectPanicSignalFromTiming(): boolean {
  const recent = getRecentAttempts(5);
  if (recent.length < 5) return false;

  const averageTimeMs =
    recent.reduce((sum, attempt) => sum + attempt.timeTakenMs, 0) / recent.length;

  return averageTimeMs < PANIC_TIMING_THRESHOLD_MS;
}

export function getAttemptsSince(timestampMs: number): QuestionAttempt[] {
  return readAllAttempts().filter((a) => a.timestamp >= timestampMs);
}

export function getChapterAccuracy(chapterId: string): number | null {
  const attempts = getAttemptsByChapter(chapterId);
  if (attempts.length === 0) return null;
  const correct = attempts.filter((a) => a.isCorrect).length;
  return Math.round((correct / attempts.length) * 100);
}

export function getLastAttemptDate(chapterId: string): number | null {
  const attempts = getAttemptsByChapter(chapterId);
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((a) => a.timestamp));
}

export function getDaysSinceLastAttempt(chapterId: string): number | null {
  const last = getLastAttemptDate(chapterId);
  if (last === null) return null;
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}

export function getRecentStreakInConcept(
  concept: string,
  count: number = 2,
): "wrong" | "correct" | "mixed" | null {
  const recent = readAllAttempts()
    .filter((a) => a.concept === concept)
    .slice(-count);
  if (recent.length < count) return null;
  const allWrong = recent.every((a) => !a.isCorrect);
  const allCorrect = recent.every((a) => a.isCorrect);
  if (allWrong) return "wrong";
  if (allCorrect) return "correct";
  return "mixed";
}

export interface MisconceptionFlag {
  chapterId: string;
  concept: string;
  count: number;
  questionIds: string[];
}

export function detectMisconceptions(
  subject?: Subject,
): MisconceptionFlag[] {
  const attempts = subject
    ? getAttemptsBySubject(subject)
    : readAllAttempts();

  const flagMap = new Map<string, MisconceptionFlag>();

  attempts
    .filter((a) => !a.isCorrect && a.confidenceLevel === "high")
    .forEach((a) => {
      const key = `${a.chapterId}::${a.concept}`;
      const existing = flagMap.get(key);
      if (existing) {
        existing.count++;
        existing.questionIds.push(a.questionId);
      } else {
        flagMap.set(key, {
          chapterId: a.chapterId,
          concept: a.concept,
          count: 1,
          questionIds: [a.questionId],
        });
      }
    });

  return Array.from(flagMap.values())
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export function getPressureDelta(subject: Subject): number | null {
  const all = getAttemptsBySubject(subject);
  const practice = all.filter((a) => a.attemptMode === "practice");
  const timed = all.filter((a) => a.attemptMode === "timed");

  if (practice.length < 5 || timed.length < 5) return null;

  const practiceAcc =
    practice.filter((a) => a.isCorrect).length / practice.length;
  const timedAcc = timed.filter((a) => a.isCorrect).length / timed.length;

  return Math.round((practiceAcc - timedAcc) * 100);
}

export function clearAttempts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
