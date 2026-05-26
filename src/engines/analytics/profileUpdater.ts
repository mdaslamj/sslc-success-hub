import type {
  ConfidenceLevel,
  MistakeTag,
  StudentLearningProfile,
} from "@/types/question";
import { detectMisconceptions } from "@/engines/analytics/attemptLogger";

const PROFILE_KEY = "aura_profile";

const MASTERY_DELTA: Record<string, Record<ConfidenceLevel, number>> = {
  correct: {
    high: +8,
    medium: +5,
    guess: +2,
    unsure: +3,
  },
  wrong: {
    high: -8,
    medium: -4,
    guess: -1,
    unsure: -3,
  },
};

const MIN_MASTERY = 0;
const MAX_MASTERY = 100;
const FLOOR_AFTER_CORRECT = 10;

export function readProfile(): StudentLearningProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StudentLearningProfile) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: StudentLearningProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // silent
  }
}

export function getOrCreateProfile(): StudentLearningProfile {
  return (
    readProfile() ?? {
      chapterMastery: {},
      weakConcepts: [],
      misconceptionRisk: [],
      recurringMistakes: [],
      avgSpeedMs: {},
      confidenceTrend: [],
      pressureDelta: 0,
      lastUpdated: Date.now(),
    }
  );
}

export function updateAfterAttempt(
  chapterId: string,
  concept: string,
  isCorrect: boolean,
  confidence: ConfidenceLevel,
  mistakeTag?: MistakeTag,
  timeTakenMs?: number,
): StudentLearningProfile {
  const profile = getOrCreateProfile();

  const currentMastery = profile.chapterMastery[chapterId] ?? 50;
  const delta = MASTERY_DELTA[isCorrect ? "correct" : "wrong"][confidence];
  const hadPreviousCorrect =
    (profile.chapterMastery[chapterId] ?? 0) > FLOOR_AFTER_CORRECT;

  let newMastery = currentMastery + delta;
  if (hadPreviousCorrect && !isCorrect) {
    newMastery = Math.max(newMastery, FLOOR_AFTER_CORRECT);
  }
  newMastery = Math.max(MIN_MASTERY, Math.min(MAX_MASTERY, newMastery));
  profile.chapterMastery[chapterId] = newMastery;

  if (!isCorrect && confidence === "high") {
    if (!profile.misconceptionRisk.includes(chapterId)) {
      profile.misconceptionRisk.push(chapterId);
    }
  } else if (isCorrect && confidence === "high") {
    profile.misconceptionRisk = profile.misconceptionRisk.filter(
      (id) => id !== chapterId,
    );
  }

  if (newMastery < 40 && !profile.weakConcepts.includes(concept)) {
    profile.weakConcepts.push(concept);
  } else if (newMastery >= 60) {
    profile.weakConcepts = profile.weakConcepts.filter((c) => c !== concept);
  }

  if (!isCorrect && mistakeTag) {
    const existing = profile.recurringMistakes.find(
      (r) => r.chapterId === chapterId && r.mistakeType === mistakeTag,
    );
    if (existing) {
      existing.count++;
    } else {
      profile.recurringMistakes.push({
        chapterId,
        mistakeType: mistakeTag,
        count: 1,
      });
    }
  }

  if (timeTakenMs && timeTakenMs > 0) {
    const prevAvg = profile.avgSpeedMs[chapterId];
    profile.avgSpeedMs[chapterId] = prevAvg
      ? Math.round((prevAvg + timeTakenMs) / 2)
      : timeTakenMs;
  }

  profile.lastUpdated = Date.now();
  writeProfile(profile);
  return profile;
}

export function finaliseSession(
  sessionAttempts: { isCorrect: boolean; confidenceLevel: ConfidenceLevel }[],
): StudentLearningProfile {
  const profile = getOrCreateProfile();

  if (sessionAttempts.length === 0) return profile;

  const sessionConfScore =
    sessionAttempts.reduce((sum, a) => {
      if (a.isCorrect && a.confidenceLevel === "high") return sum + 1.0;
      if (a.isCorrect && a.confidenceLevel === "medium") return sum + 0.7;
      if (a.isCorrect) return sum + 0.5;
      if (!a.isCorrect && a.confidenceLevel === "high") return sum - 1.0;
      if (!a.isCorrect && a.confidenceLevel === "medium") return sum - 0.4;
      return sum - 0.2;
    }, 0) / sessionAttempts.length;

  profile.confidenceTrend = [...profile.confidenceTrend, sessionConfScore].slice(
    -10,
  );

  const flags = detectMisconceptions();
  profile.misconceptionRisk = [...new Set(flags.map((f) => f.chapterId))];

  profile.lastUpdated = Date.now();
  writeProfile(profile);
  return profile;
}

export type MasteryLabel =
  | "Not started"
  | "Beginner"
  | "Developing"
  | "Strong"
  | "Mastered";

export function getMasteryLabel(score: number | undefined): MasteryLabel {
  if (score === undefined) return "Not started";
  if (score < 30) return "Beginner";
  if (score < 60) return "Developing";
  if (score < 85) return "Strong";
  return "Mastered";
}

export function getMasteryColor(label: MasteryLabel): string {
  switch (label) {
    case "Mastered":
      return "text-green-600 dark:text-green-400";
    case "Strong":
      return "text-blue-600 dark:text-blue-400";
    case "Developing":
      return "text-amber-600 dark:text-amber-400";
    case "Beginner":
      return "text-red-500 dark:text-red-400";
    default:
      return "text-gray-400";
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // silent
  }
}
