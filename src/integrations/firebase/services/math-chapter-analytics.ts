import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  MathChapterAnalyticsDoc,
  MathQuestionType,
} from "../types";

function analyticsId(userId: string, chapterId: string): string {
  return `${userId}_${chapterId}`;
}

export function emptyAnalytics(
  userId: string,
  chapterId: string,
): MathChapterAnalyticsDoc {
  return {
    id: analyticsId(userId, chapterId),
    userId,
    chapterId,
    mastery: 0,
    formulaAccuracy: {},
    speedIndex: 1,
    weakConcepts: [],
    strongConcepts: [],
    questionTypeStats: {
      mcq: { attempts: 0, avgScore: 0 },
      "1mark": { attempts: 0, avgScore: 0 },
      "2mark": { attempts: 0, avgScore: 0 },
      "3mark": { attempts: 0, avgScore: 0 },
      "5mark": { attempts: 0, avgScore: 0 },
      hots: { attempts: 0, avgScore: 0 },
      competency: { attempts: 0, avgScore: 0 },
    },
    lastUpdated: Date.now(),
  };
}

export async function fetchMathChapterAnalytics(
  userId: string,
  chapterId: string,
): Promise<MathChapterAnalyticsDoc | null> {
  const snap = await getDoc(
    doc(db, COLLECTIONS.MATH_CHAPTER_ANALYTICS, analyticsId(userId, chapterId)),
  );
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<MathChapterAnalyticsDoc, "id">),
  };
}

export async function saveMathChapterAnalytics(
  a: MathChapterAnalyticsDoc,
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.MATH_CHAPTER_ANALYTICS, a.id), {
    ...a,
    lastUpdated: Date.now(),
  });
}

/**
 * Incremental update after a single attempt. Pure function — caller decides
 * when to persist. Keeps analytics math centralized.
 */
export function applyAttempt(
  prev: MathChapterAnalyticsDoc,
  attempt: {
    questionType: MathQuestionType;
    score: number;
    maxScore: number;
    solveTimeSeconds: number;
    estimatedSolveTimeSeconds: number;
    formulaIds: string[];
    formulasCorrect: string[];
    detectedWeakConcepts?: string[];
    detectedStrongConcepts?: string[];
  },
): MathChapterAnalyticsDoc {
  const next: MathChapterAnalyticsDoc = {
    ...prev,
    formulaAccuracy: { ...prev.formulaAccuracy },
    questionTypeStats: { ...prev.questionTypeStats },
    weakConcepts: [...prev.weakConcepts],
    strongConcepts: [...prev.strongConcepts],
  };

  const qStat = next.questionTypeStats[attempt.questionType];
  const pct = attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
  const attempts = qStat.attempts + 1;
  const avgScore = +((qStat.avgScore * qStat.attempts + pct) / attempts).toFixed(1);
  next.questionTypeStats[attempt.questionType] = { attempts, avgScore };

  for (const fid of attempt.formulaIds) {
    const cur = next.formulaAccuracy[fid] ?? { attempts: 0, correct: 0 };
    next.formulaAccuracy[fid] = {
      attempts: cur.attempts + 1,
      correct: cur.correct + (attempt.formulasCorrect.includes(fid) ? 1 : 0),
    };
  }

  if (attempt.estimatedSolveTimeSeconds > 0) {
    const ratio = attempt.solveTimeSeconds / attempt.estimatedSolveTimeSeconds;
    next.speedIndex = +(prev.speedIndex * 0.7 + ratio * 0.3).toFixed(2);
  }

  if (attempt.detectedWeakConcepts?.length) {
    next.weakConcepts = Array.from(
      new Set([...attempt.detectedWeakConcepts, ...next.weakConcepts]),
    ).slice(0, 10);
  }
  if (attempt.detectedStrongConcepts?.length) {
    next.strongConcepts = Array.from(
      new Set([...attempt.detectedStrongConcepts, ...next.strongConcepts]),
    ).slice(0, 10);
  }

  const stats = Object.values(next.questionTypeStats).filter(
    (s) => s.attempts > 0,
  );
  next.mastery = stats.length
    ? +(stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length).toFixed(1)
    : 0;

  next.lastUpdated = Date.now();
  return next;
}