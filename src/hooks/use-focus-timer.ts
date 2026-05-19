import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reusable Pomodoro-style focus timer state machine.
 * Pure UI/state — wiring to analytics is the consumer's job (onSessionComplete).
 *
 * Future hooks for AI study recommendations / adaptive planner / burnout
 * detection can subscribe to `sessionsToday` and the `onSessionComplete`
 * callback without touching this hook.
 */

export type FocusMode = "focus" | "short" | "long";

export const DEFAULT_DURATIONS: Record<FocusMode, number> = {
  focus: 25,
  short: 5,
  long: 15,
};

export type FocusTimerOptions = {
  /** Override default per-mode minutes. */
  durations?: Partial<Record<FocusMode, number>>;
  /** Called when a focus block completes (mode === "focus"). */
  onFocusComplete?: (minutes: number) => void;
  /** Called when any block (focus or break) completes. */
  onComplete?: (mode: FocusMode, minutes: number) => void;
};

export type FocusTimerApi = {
  mode: FocusMode;
  setMode: (m: FocusMode) => void;
  durations: Record<FocusMode, number>;
  setCustomDuration: (mode: FocusMode, minutes: number) => void;
  secondsLeft: number;
  totalSeconds: number;
  progress: number; // 0..100
  running: boolean;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  sessionsToday: number;
  lastCompletedAt: number | null;
};

export function useFocusTimer(opts: FocusTimerOptions = {}): FocusTimerApi {
  const [durations, setDurations] = useState<Record<FocusMode, number>>({
    ...DEFAULT_DURATIONS,
    ...opts.durations,
  });
  const [mode, setModeState] = useState<FocusMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(durations.focus * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(opts);
  cbRef.current = opts;

  const setMode = useCallback(
    (m: FocusMode) => {
      setModeState(m);
      setSecondsLeft(durations[m] * 60);
      setRunning(false);
    },
    [durations],
  );

  const setCustomDuration = useCallback(
    (m: FocusMode, minutes: number) => {
      const safe = Math.max(1, Math.min(180, Math.round(minutes)));
      setDurations((prev) => ({ ...prev, [m]: safe }));
      if (m === mode) {
        setSecondsLeft(safe * 60);
        setRunning(false);
      }
    },
    [mode],
  );

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        // complete
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        const minutes = durations[mode];
        setLastCompletedAt(Date.now());
        if (mode === "focus") {
          setSessionsToday((n) => n + 1);
          cbRef.current.onFocusComplete?.(minutes);
        }
        cbRef.current.onComplete?.(mode, minutes);
        return 0;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, durations]);

  const total = durations[mode] * 60;
  const progress = total ? ((total - secondsLeft) / total) * 100 : 0;

  return {
    mode,
    setMode,
    durations,
    setCustomDuration,
    secondsLeft,
    totalSeconds: total,
    progress,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    toggle: () => setRunning((r) => !r),
    reset: () => {
      setRunning(false);
      setSecondsLeft(durations[mode] * 60);
    },
    skip: () => {
      setRunning(false);
      setSecondsLeft(0);
    },
    sessionsToday,
    lastCompletedAt,
  };
}

export function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
