import { useCallback, useEffect, useState } from "react";
import {
  fetchEvaluation,
  runEvaluation,
} from "@/integrations/firebase/services/evaluations";
import type { EvaluationDoc } from "@/integrations/firebase/types";

/**
 * Loads + drives the AI evaluation for a single answer attempt.
 * Polls while state === "evaluating" so the summary card updates without a
 * manual refresh.
 */
export function useEvaluation(attemptId: string | null) {
  const [evaluation, setEvaluation] = useState<EvaluationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!attemptId) return;
    try {
      const e = await fetchEvaluation(attemptId);
      setEvaluation(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evaluation.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  // Poll while evaluating.
  useEffect(() => {
    if (evaluation?.state !== "evaluating") return;
    const t = setInterval(() => void refresh(), 1500);
    return () => clearInterval(t);
  }, [evaluation?.state, refresh]);

  const evaluate = useCallback(async () => {
    if (!attemptId) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runEvaluation(attemptId);
      if (result) setEvaluation(result);
      else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  }, [attemptId, refresh]);

  return { evaluation, loading, running, error, evaluate, refresh };
}