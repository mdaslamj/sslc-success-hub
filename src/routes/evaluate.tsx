import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AnswerUploader from "@/components/exam/AnswerUploader";
import { SafetyPauseScreen } from "@/components/shared/SafetyPauseScreen";
import { useAuth } from "@/contexts/auth-context";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { useEvaluation } from "@/hooks/useEvaluation";
import { applyEvaluationToProfile } from "@/lib/evaluationMasteryBridge";
import { saveEvaluationReport, type ExamType } from "@/lib/paperEvaluationEngine";
import { cn } from "@/lib/utils";

export const EVAL_REPORT_STORAGE_KEY = "aura_eval_report_v1";
export const EVAL_BRIDGE_STORAGE_KEY = "aura_eval_bridge_v1";

const SUBJECTS = [
  { id: "science", label: "Science", emoji: "🧪", enabled: true },
  { id: "math", label: "Math", emoji: "🧮", enabled: false },
  { id: "social", label: "Social", emoji: "🌍", enabled: false },
  { id: "english", label: "English", emoji: "📘", enabled: false },
  { id: "kannada", label: "Kannada", emoji: "📜", enabled: false },
  { id: "hindi", label: "Hindi", emoji: "📗", enabled: false },
] as const;

const EXAM_TYPES: { id: ExamType; label: string }[] = [
  { id: "chapter", label: "Chapter Test" },
  { id: "sa1", label: "SA1" },
  { id: "sa2", label: "SA2" },
  { id: "preparatory", label: "Preparatory" },
  { id: "board", label: "Board Exam" },
];

export const Route = createFileRoute("/evaluate")({
  head: () => ({
    meta: [
      { title: "Aura — Evaluate Answer Script" },
      {
        name: "description",
        content: "Photograph and upload your handwritten answer script for AI evaluation.",
      },
    ],
  }),
  component: EvaluatePage,
});

function EvaluatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateMastery, appendSession } = useAuraEngines();
  const { status, progress, report, bridgeResult, error, submitPaper, reset } = useEvaluation();

  const [subjectId, setSubjectId] = useState("science");
  const [examType, setExamType] = useState<ExamType>("chapter");
  const [showUploader, setShowUploader] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (status === "complete" && report) {
      sessionStorage.setItem(EVAL_REPORT_STORAGE_KEY, JSON.stringify(report));
      if (bridgeResult) {
        sessionStorage.setItem(EVAL_BRIDGE_STORAGE_KEY, JSON.stringify(bridgeResult));
      }
      void navigate({ to: "/evaluate/results" });
    }
  }, [status, report, bridgeResult, navigate]);

  const handlePagesReady = useCallback(
    async (pages: File[]) => {
      if (!user) return;
      const idToken = await user.getIdToken();
      await submitPaper({
        studentId: profile?.student?.id ?? user.uid,
        subjectId,
        examType,
        pages,
        idToken,
      });
    },
    [user, profile?.student?.id, subjectId, examType, submitPaper],
  );

  const continueAfterPause = useCallback(async () => {
    if (!report) return;
    setContinuing(true);
    try {
      const bridge = await applyEvaluationToProfile(report, updateMastery, appendSession);
      await saveEvaluationReport(report);
      sessionStorage.setItem(EVAL_REPORT_STORAGE_KEY, JSON.stringify(report));
      sessionStorage.setItem(EVAL_BRIDGE_STORAGE_KEY, JSON.stringify(bridge));
      void navigate({ to: "/evaluate/results" });
    } finally {
      setContinuing(false);
    }
  }, [appendSession, navigate, report, updateMastery]);

  const shellStyle = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: "#08080E",
    minHeight: "100dvh",
  } as const;

  if (status === "safety-escalate") {
    return (
      <SafetyPauseScreen
        result={{
          safe: false,
          flagged: true,
          category: "self-harm",
          confidence: "high",
          action: "escalate",
        }}
      />
    );
  }

  if (status === "safety-pause") {
    return (
      <SafetyPauseScreen
        result={{
          safe: true,
          flagged: true,
          category: "distress",
          confidence: "medium",
          action: "pause",
        }}
        onProceed={() => void continueAfterPause()}
      />
    );
  }

  if (
    status === "preprocessing" ||
    status === "extracting" ||
    status === "evaluating" ||
    status === "saving"
  ) {
    const substatus =
      status === "preprocessing"
        ? "Preparing your pages..."
        : status === "extracting"
          ? "Reading your handwriting..."
          : status === "evaluating"
            ? "Checking against mark scheme..."
            : "Saving your results...";

    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
        style={shellStyle}
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#8B5CF6]" />
        <h1 className="mt-6 text-xl font-bold text-white">Aura is reading your answers…</h1>
        <p className="mt-2 text-sm text-white/60">{substatus}</p>
        <div className="mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#8B5CF6] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {continuing ? (
          <p className="mt-4 text-xs text-white/45">Finishing your results…</p>
        ) : null}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center" style={shellStyle}>
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 max-w-sm text-sm text-white/65">{error ?? "Please try again."}</p>
        <button
          type="button"
          className="mt-6 rounded-2xl bg-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white"
          onClick={() => {
            reset();
            setShowUploader(false);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center" style={shellStyle}>
        <h1 className="text-xl font-bold text-white">Sign in to evaluate</h1>
        <p className="mt-2 text-sm text-white/60">Your answer script is saved only to your account.</p>
      </div>
    );
  }

  if (showUploader) {
    return (
      <AnswerUploader
        subjectId={subjectId}
        examType={examType}
        onPagesReady={handlePagesReady}
        onCancel={() => setShowUploader(false)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28" style={shellStyle}>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Evaluate your paper</h1>
        <p className="text-sm text-white/60">Choose subject and exam type, then upload photos.</p>
      </header>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Subject</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUBJECTS.map((subject) => (
            <button
              key={subject.id}
              type="button"
              disabled={!subject.enabled}
              onClick={() => subject.enabled && setSubjectId(subject.id)}
              className={cn(
                "relative rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                subjectId === subject.id && subject.enabled
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-white"
                  : "border-white/[0.06] bg-[#0F0F18] text-white/80",
                !subject.enabled && "opacity-45",
              )}
            >
              <span className="text-lg" aria-hidden>
                {subject.emoji}
              </span>
              <span className="mt-1 block font-semibold">{subject.label}</span>
              {!subject.enabled ? (
                <span className="mt-0.5 block text-[10px] text-white/45">Coming soon</span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Exam type</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAM_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setExamType(type.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                examType === type.id
                  ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                  : "border-white/[0.06] bg-[#0F0F18] text-white/75",
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="mt-8 w-full rounded-2xl bg-[#8B5CF6] py-4 text-base font-semibold text-white"
        onClick={() => setShowUploader(true)}
      >
        Continue to upload pages
      </button>
    </div>
  );
}
