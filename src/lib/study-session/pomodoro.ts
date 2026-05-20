/**
 * Stateless pomodoro phase math. The hook in `use-study-session.ts` owns
 * the actual ticking; this module just sequences phases so it stays
 * unit-testable and easy to reason about.
 *
 * Default cadence (overridable): 25/5/25/5/25/15 — long break every 4
 * focus phases. Adaptive duration: if `targetMinutes` is < 25 the cycle
 * collapses to a single focus block, no breaks. If > 50 it scales to
 * 30-minute focus phases.
 */
export type PomodoroPhase = "focus" | "short" | "long";

export type PomodoroCadence = {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  totalFocusBlocks: number;
};

export function planCadence(targetMinutes: number): PomodoroCadence {
  if (targetMinutes <= 20) {
    return { focusMin: Math.max(5, targetMinutes), shortMin: 0, longMin: 0, cyclesBeforeLong: 1, totalFocusBlocks: 1 };
  }
  if (targetMinutes <= 30) {
    return { focusMin: targetMinutes, shortMin: 0, longMin: 0, cyclesBeforeLong: 1, totalFocusBlocks: 1 };
  }
  const focusMin = targetMinutes >= 50 ? 30 : 25;
  const totalFocusBlocks = Math.max(2, Math.round(targetMinutes / focusMin));
  return {
    focusMin,
    shortMin: 5,
    longMin: 15,
    cyclesBeforeLong: 4,
    totalFocusBlocks,
  };
}

export function nextPhase(
  current: PomodoroPhase,
  focusesCompleted: number,
  cadence: PomodoroCadence,
): PomodoroPhase {
  if (current === "focus") {
    const isLong = focusesCompleted > 0 && focusesCompleted % cadence.cyclesBeforeLong === 0;
    return isLong && cadence.longMin > 0 ? "long" : cadence.shortMin > 0 ? "short" : "focus";
  }
  return "focus";
}

export function phaseDuration(phase: PomodoroPhase, cadence: PomodoroCadence): number {
  return phase === "focus" ? cadence.focusMin : phase === "short" ? cadence.shortMin : cadence.longMin;
}