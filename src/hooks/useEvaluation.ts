import { useCallback, useState } from "react";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { loadSeedProfile } from "@/hooks/useStudentProfile";
import {
  evaluatePaper,
  PaperEvaluationError,
  saveEvaluationReport,
  type EvaluationReport,
  type PaperSubmission,
} from "@/lib/paperEvaluationEngine";
import {
  applyEvaluationToProfile,
  type MasteryBridgeResult,
} from "@/lib/evaluationMasteryBridge";

export type EvaluationStatus =
  | "idle"
  | "preprocessing"
  | "extracting"
  | "evaluating"
  | "saving"
  | "complete"
  | "error"
  | "safety-pause"
  | "safety-escalate";

export interface UseEvaluationReturn {
  status: EvaluationStatus;
  progress: number;
  report: EvaluationReport | null;
  bridgeResult: MasteryBridgeResult | null;
  error: string | null;
  submitPaper: (submission: PaperSubmission) => Promise<void>;
  reset: () => void;
}

export function useEvaluation(): UseEvaluationReturn {
  const [status, setStatus] = useState<EvaluationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [bridgeResult, setBridgeResult] = useState<MasteryBridgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { profile, isLoading, updateMastery, appendSession } = useAuraEngines();

  const submitPaper = useCallback(
    async (submission: PaperSubmission) => {
      setStatus("preprocessing");
      setProgress(10);
      setError(null);
      setReport(null);
      setBridgeResult(null);

      if (isLoading) {
        setStatus("error");
        setError("Profile is still loading. Try again in a moment.");
        return;
      }

      const activeProfile = profile ?? loadSeedProfile();

      try {
        setStatus("extracting");
        setProgress(30);

        const evalReport = await evaluatePaper(submission, activeProfile);

        if (evalReport.safetyPaused) {
          setStatus("safety-pause");
          setReport(evalReport);
          setProgress(100);
          return;
        }

        setProgress(70);
        setStatus("evaluating");

        const bridge = await applyEvaluationToProfile(
          evalReport,
          updateMastery,
          appendSession,
        );

        setProgress(85);
        setStatus("saving");

        await saveEvaluationReport(evalReport);

        setReport(evalReport);
        setBridgeResult(bridge);
        setProgress(100);
        setStatus("complete");
      } catch (err) {
        if (err instanceof PaperEvaluationError) {
          if (err.code === "SAFETY_ESCALATE") {
            setStatus("safety-escalate");
            setError(err.message);
            return;
          }
          if (err.code === "SAFETY_PAUSE") {
            setStatus("safety-pause");
            setError(err.message);
            return;
          }
        }

        const message = err instanceof Error ? err.message : "Evaluation failed";
        if (message.includes("SAFETY_ESCALATE")) {
          setStatus("safety-escalate");
        } else if (message.includes("SAFETY_PAUSE")) {
          setStatus("safety-pause");
        } else {
          setStatus("error");
          setError(message);
        }
      }
    },
    [appendSession, isLoading, profile, updateMastery],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setReport(null);
    setBridgeResult(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    report,
    bridgeResult,
    error,
    submitPaper,
    reset,
  };
}
