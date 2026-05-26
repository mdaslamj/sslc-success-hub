import { Question, Difficulty } from "../../types/question"
import { StudentLearningProfile } from "../../types/question"
import { readProfile } from "../analytics/profileUpdater"
import { getAttemptsByChapter } from "../analytics/attemptLogger"

// ─── Core difficulty decision ────────────────────────────────────────────────

export function getNextDifficulty(
  chapterId: string,
  profile?: StudentLearningProfile | null
): Difficulty {
  const p = profile ?? readProfile()
  if (!p) return "medium"

  const mastery = p.chapterMastery[chapterId] ?? 50

  // Recovery mode: if last 3 attempts in this chapter are ALL wrong → force easy
  const recentAttempts = getAttemptsByChapter(chapterId).slice(-3)
  if (
    recentAttempts.length === 3 &&
    recentAttempts.every((a) => !a.isCorrect)
  ) {
    return "easy"
  }

  // Confidence trend: if falling across last 5 sessions → drop one level
  const trend = p.confidenceTrend.slice(-5)
  const trendFalling =
    trend.length >= 3 && trend[trend.length - 1] < trend[0] - 0.3

  if (mastery < 40) return "easy"
  if (mastery >= 40 && mastery < 70) return trendFalling ? "easy" : "medium"
  return trendFalling ? "medium" : "hard"
}

// ─── Next question selector ───────────────────────────────────────────────────

export function getNextQuestion(
  questions: Question[],
  chapterId: string,
  recentlySeenIds: string[],
  profile?: StudentLearningProfile | null
): Question | null {
  if (questions.length === 0) return null

  const p = profile ?? readProfile()
  const difficulty = getNextDifficulty(chapterId, p)
  const weakConcepts = p?.weakConcepts ?? []

  // Filter by chapter + difficulty
  let pool = questions.filter(
    (q) => q.chapterId === chapterId && q.difficulty === difficulty
  )

  // Fallback: relax difficulty if pool is empty
  if (pool.length === 0) {
    pool = questions.filter((q) => q.chapterId === chapterId)
  }

  // Deprioritise recently seen questions
  const unseen = pool.filter((q) => !recentlySeenIds.includes(q.id))
  const candidates = unseen.length > 0 ? unseen : pool

  // Prefer questions matching weak concepts
  const conceptMatch = candidates.filter((q) =>
    weakConcepts.some((c) => q.concept.toLowerCase().includes(c.toLowerCase()))
  )

  const finalPool = conceptMatch.length > 0 ? conceptMatch : candidates

  // Pick randomly from top candidates
  return finalPool[Math.floor(Math.random() * finalPool.length)] ?? null
}

// ─── Recovery mode ────────────────────────────────────────────────────────────
// If student gets 3 consecutive wrong, insert 2 easy questions
// from their STRONGEST chapter before continuing

export function shouldTriggerRecovery(chapterId: string): boolean {
  const recent = getAttemptsByChapter(chapterId).slice(-3)
  return recent.length === 3 && recent.every((a) => !a.isCorrect)
}

export function getRecoveryQuestions(
  allQuestions: Question[],
  currentChapterId: string,
  profile?: StudentLearningProfile | null
): Question[] {
  const p = profile ?? readProfile()
  if (!p) return []

  // Find strongest chapter (highest mastery, not the current one)
  const strongestEntry = Object.entries(p.chapterMastery)
    .filter(([id]) => id !== currentChapterId)
    .sort(([, a], [, b]) => b - a)[0]

  if (!strongestEntry) return []

  const [strongChapterId] = strongestEntry
  const easyFromStrong = allQuestions.filter(
    (q) => q.chapterId === strongChapterId && q.difficulty === "easy"
  )

  // Return 2 questions
  return easyFromStrong.slice(0, 2)
}

// ─── Adaptive session builder ─────────────────────────────────────────────────
// Builds an ordered question list for a chapter session,
// inserting recovery questions if needed

export function buildAdaptiveSession(
  questions: Question[],
  chapterId: string,
  sessionLength: number = 10,
  profile?: StudentLearningProfile | null
): Question[] {
  const p = profile ?? readProfile()
  const session: Question[] = []
  const seenIds: string[] = []
  let consecutiveWrong = 0
  let recoveryInserted = false

  // Simulate adaptive flow for sessionLength questions
  for (let i = 0; i < sessionLength; i++) {
    // Check if recovery should be triggered
    if (consecutiveWrong >= 3 && !recoveryInserted) {
      const recoveryQs = getRecoveryQuestions(questions, chapterId, p)
      recoveryQs.forEach((q) => {
        if (!seenIds.includes(q.id)) {
          session.push(q)
          seenIds.push(q.id)
        }
      })
      recoveryInserted = true
      consecutiveWrong = 0
      continue
    }

    const next = getNextQuestion(
      questions.filter((q) => !seenIds.includes(q.id)),
      chapterId,
      seenIds,
      p
    )

    if (!next) break

    session.push(next)
    seenIds.push(next.id)
    recoveryInserted = false
  }

  return session
}
