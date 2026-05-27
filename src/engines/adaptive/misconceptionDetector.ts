import { Subject } from "../../types/question"
import {
  readAllAttempts,
  getAttemptsBySubject,
} from "../analytics/attemptLogger"
import { readProfile, writeProfile } from "../analytics/profileUpdater"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MisconceptionReport {
  chapterId: string
  chapterName?: string
  concept: string
  count: number
  severity: "warning" | "high"    // warning = 2 hits, high = 4+ hits
  questionIds: string[]
  lastSeen: number
}

// ─── Core detector ────────────────────────────────────────────────────────────

export function detectMisconceptions(subject?: Subject): MisconceptionReport[] {
  const attempts = subject
    ? getAttemptsBySubject(subject)
    : readAllAttempts()

  // Build map: "chapterId::concept" → { count, questionIds, lastSeen }
  const map = new Map<
    string,
    { chapterId: string; concept: string; count: number; questionIds: string[]; lastSeen: number }
  >()

  attempts
    .filter((a) => !a.isCorrect && a.confidenceLevel === "high")
    .forEach((a) => {
      const key = `${a.chapterId}::${a.concept}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
        existing.questionIds.push(a.questionId)
        existing.lastSeen = Math.max(existing.lastSeen, a.timestamp)
      } else {
        map.set(key, {
          chapterId: a.chapterId,
          concept: a.concept,
          count: 1,
          questionIds: [a.questionId],
          lastSeen: a.timestamp,
        })
      }
    })

  return Array.from(map.values())
    .filter((r) => r.count >= 2)
    .map((r) => ({
      ...r,
      severity: (r.count >= 4 ? "high" : "warning") as "high" | "warning",
    }))
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
}

// ─── Sync misconceptions into profile ────────────────────────────────────────

export function syncMisconceptionsToProfile(subject?: Subject): void {
  const reports = detectMisconceptions(subject)
  const profile = readProfile()
  if (!profile) return

  profile.misconceptionRisk = [...new Set(reports.map((r) => r.chapterId))]
  writeProfile(profile)
}

// ─── Per-question misconception check ────────────────────────────────────────
// Returns a hint to show after explanation if misconception exists for this concept

export function getMisconceptionHint(
  chapterId: string,
  concept: string,
  commonMistakes?: string[]
): string | null {
  const reports = detectMisconceptions()
  const match = reports.find(
    (r) => r.chapterId === chapterId && r.concept === concept
  )
  if (!match) return null

  if (commonMistakes && commonMistakes.length > 0) {
    return `Many students confuse this with: ${commonMistakes[0]}`
  }
  return `Aura has noticed a recurring pattern here — review the core concept carefully.`
}

// ─── Chapter-level flag ───────────────────────────────────────────────────────

export function getChapterMisconceptionFlag(chapterId: string): {
  hasMisconception: boolean
  severity: "warning" | "high" | null
  conceptCount: number
} {
  const reports = detectMisconceptions().filter((r) => r.chapterId === chapterId)
  if (reports.length === 0) {
    return { hasMisconception: false, severity: null, conceptCount: 0 }
  }
  const maxSeverity = reports.some((r) => r.severity === "high") ? "high" : "warning"
  return { hasMisconception: true, severity: maxSeverity, conceptCount: reports.length }
}
