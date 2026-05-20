/**
 * SM-2 style spacing for the revision queue, adapted for student-friendly
 * 0..5 quality grades. Pure — no I/O.
 *
 * Quality mapping inside the session UI:
 *   confidence 1 -> q=1  (forgot, lapse)
 *   confidence 2 -> q=2  (hard)
 *   confidence 3 -> q=3  (ok)
 *   confidence 4 -> q=4  (good)
 *   confidence 5 -> q=5  (perfect)
 */

export type SchedulingCard = {
  reps: number;
  ease: number;
  intervalDays: number;
  lapses: number;
};

export type SchedulingResult = SchedulingCard & {
  nextDueAt: number;
};

export function reviewCard(
  prev: SchedulingCard | null,
  quality: number,
  now = Date.now(),
): SchedulingResult {
  const base: SchedulingCard = prev ?? { reps: 0, ease: 2.5, intervalDays: 0, lapses: 0 };
  const q = Math.min(5, Math.max(0, Math.round(quality)));

  // Lapse: reset reps but keep ease drop.
  if (q < 3) {
    const ease = Math.max(1.3, base.ease - 0.2);
    const intervalDays = 1;
    return {
      reps: 0,
      ease,
      intervalDays,
      lapses: base.lapses + 1,
      nextDueAt: now + intervalDays * 86_400_000,
    };
  }

  const reps = base.reps + 1;
  const ease = Math.min(3.0, Math.max(1.3, base.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));
  let intervalDays: number;
  if (reps === 1) intervalDays = 1;
  else if (reps === 2) intervalDays = 3;
  else intervalDays = Math.round(base.intervalDays * ease);
  intervalDays = Math.max(1, Math.min(60, intervalDays));

  return {
    reps,
    ease,
    intervalDays,
    lapses: base.lapses,
    nextDueAt: now + intervalDays * 86_400_000,
  };
}

/** Map confidence (1..5) to an SM-2 quality grade (0..5). */
export function confidenceToQuality(confidence: number, difficulty: number): number {
  // Harden quality if difficulty was perceived as high but confidence held up.
  const base = Math.min(5, Math.max(1, confidence));
  if (difficulty >= 4 && base >= 4) return Math.min(5, base);
  if (difficulty >= 4 && base <= 2) return Math.max(0, base - 1);
  return base;
}