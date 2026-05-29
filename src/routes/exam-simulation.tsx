import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  getActiveQuestions,
  MCQ_OPTIONS,
  SCIENCE_EXAM_2025,
  SCIENCE_EXAM_MODEL_ANSWERS,
} from "@/data/examPapers/scienceExam2025";
import {
  clearExamSession,
  loadExamSession,
  saveExamSession,
} from "@/lib/examSimulationStorage";
import { cn } from "@/lib/utils";
import type { ExamPaper, ExamQuestion, PersistedExamSession } from "@/types/examSimulation";

export const Route = createFileRoute("/exam-simulation")({
  head: () => ({
    meta: [{ title: "Aura — Board Exam Simulation" }],
  }),
  component: ExamSimulationPage,
});

type Phase = "setup" | "in-progress" | "submitted";

const EVAL_PREFILL_KEY = "aura_eval_prefill_v1";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ExamSimulationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [subject, setSubject] = useState("science");
  const [year, setYear] = useState("2025-26");
  const [session, setSession] = useState<PersistedExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SCIENCE_EXAM_2025.duration * 60);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submittedPhase, setSubmittedPhase] = useState<"choice" | "self-mark" | "complete">("choice");
  const autoSubmitRef = useRef(false);

  const paper = subject === "science" ? SCIENCE_EXAM_2025 : null;

  const activeQuestions = useMemo(
    () => (paper ? getActiveQuestions(paper, session?.choiceSelections ?? {}) : []),
    [paper, session?.choiceSelections],
  );

  const currentQuestion = activeQuestions[currentIndex] ?? null;

  useEffect(() => {
    const saved = loadExamSession();
    if (saved?.status === "in-progress" && saved.paperId === SCIENCE_EXAM_2025.id) {
      setSession(saved);
      setTimeRemaining(saved.timeRemaining);
      setCurrentIndex(saved.currentIndex);
      setPhase("in-progress");
    }
  }, []);

  const persistSession = useCallback(
    (patch: Partial<PersistedExamSession>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        saveExamSession(next);
        return next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    (auto = false) => {
      if (!session || !paper) return;
      const elapsed = paper.duration * 60 - timeRemaining;
      const next: PersistedExamSession = {
        ...session,
        status: "submitted",
        endTime: new Date().toISOString(),
        timeRemaining,
        timeTakenSeconds: elapsed,
        submittedPhase: "choice",
      };
      setSession(next);
      saveExamSession(next);
      setPhase("submitted");
      setSubmittedPhase("choice");
      setShowSubmitDialog(false);
      if (auto) toast.info("Time is up — your exam was submitted automatically.");
      else toast.success("Exam submitted!");
    },
    [session, paper, timeRemaining],
  );

  useEffect(() => {
    if (phase !== "in-progress" || !session) return;
    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase, session, handleSubmit]);

  useEffect(() => {
    if (phase !== "in-progress" || !session) return;
    const interval = window.setInterval(() => {
      persistSession({ timeRemaining });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [phase, session, timeRemaining, persistSession]);

  const attemptedCount = useMemo(() => {
    if (!session) return 0;
    return activeQuestions.filter((q) => (session.answers[q.id] ?? "").trim().length > 0).length;
  }, [activeQuestions, session]);

  const handleStart = () => {
    if (!user || !paper) return;
    const now = new Date().toISOString();
    const fresh: PersistedExamSession = {
      paperId: paper.id,
      studentId: user.uid,
      startTime: now,
      timeRemaining: paper.duration * 60,
      answers: {},
      status: "in-progress",
      marksMode: "self-mark",
      currentIndex: 0,
      flagged: [],
      choiceSelections: {},
    };
    setSession(fresh);
    saveExamSession(fresh);
    setTimeRemaining(paper.duration * 60);
    setCurrentIndex(0);
    setPhase("in-progress");
    autoSubmitRef.current = false;
  };

  const setAnswer = (questionId: string, value: string) => {
    if (!session) return;
    persistSession({
      answers: { ...session.answers, [questionId]: value },
    });
  };

  const toggleFlag = (questionId: string) => {
    if (!session) return;
    const flagged = session.flagged.includes(questionId)
      ? session.flagged.filter((id) => id !== questionId)
      : [...session.flagged, questionId];
    persistSession({ flagged });
  };

  const selectOrBranch = (questionId: string) => {
    if (!session || !paper) return;
    const q = paper.questions.find((item) => item.id === questionId);
    if (!q?.choiceWith) return;
    persistSession({
      choiceSelections: { ...session.choiceSelections, [q.id]: questionId, [q.choiceWith]: questionId },
    });
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    persistSession({ currentIndex: index, timeRemaining });
  };

  if (phase === "setup") {
    return (
      <SetupScreen
        subject={subject}
        year={year}
        onSubjectChange={setSubject}
        onYearChange={setYear}
        onStart={handleStart}
        canStart={!!user && subject === "science"}
      />
    );
  }

  if (phase === "submitted" && session && paper) {
    return (
      <SubmittedScreen
        session={session}
        paper={paper}
        activeQuestions={activeQuestions}
        submittedPhase={submittedPhase}
        onChooseSelfMark={() => {
          setSubmittedPhase("self-mark");
          persistSession({ submittedPhase: "self-mark", marksMode: "self-mark" });
        }}
        onChooseUpload={() => {
          sessionStorage.setItem(
            EVAL_PREFILL_KEY,
            JSON.stringify({ subjectId: "science", examType: "board" }),
          );
          clearExamSession();
          void navigate({ to: "/evaluate" });
        }}
        onSelfMarkChange={(questionId, value) => {
          setSession((prev) => {
            if (!prev) return prev;
            const next = {
              ...prev,
              selfMarks: { ...(prev.selfMarks ?? {}), [questionId]: value },
            };
            saveExamSession(next);
            return next;
          });
        }}
        onFinishMarking={() => {
          setSubmittedPhase("complete");
          persistSession({ submittedPhase: "complete" });
          toast.success("Self-marking complete!");
        }}
        onDone={() => {
          clearExamSession();
          void navigate({ to: "/" });
        }}
      />
    );
  }

  if (!session || !paper || !currentQuestion) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#08080E] text-white/70">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const timerColor =
    timeRemaining <= 600
      ? "text-[#F87171]"
      : timeRemaining <= 1800
        ? "text-[#FBBF24]"
        : "text-[#4ADE80]";

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-[#08080E] pb-28"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <header
        className="sticky top-0 z-30 border-b px-4 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0F0F18" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Clock className="h-3.5 w-3.5" />
            <span>Science · Board Simulation</span>
          </div>
          <span className={cn("font-mono text-sm font-semibold tabular-nums", timerColor)}>
            {formatTime(timeRemaining)} remaining
          </span>
        </div>
        <p className="mt-1 text-xs text-white/50">
          {attemptedCount}/{activeQuestions.length} attempted · {paper.totalMarks} marks total
        </p>
      </header>

      <div className="px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">
          Question navigator
        </p>
        <div className="flex flex-wrap gap-1.5">
          {activeQuestions.map((q, idx) => {
            const answered = (session.answers[q.id] ?? "").trim().length > 0;
            const flagged = session.flagged.includes(q.id);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goToQuestion(idx)}
                className={cn(
                  "h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition-colors",
                  idx === currentIndex && "ring-2 ring-[#8B5CF6]",
                  flagged
                    ? "bg-[#FBBF24]/20 text-[#FBBF24]"
                    : answered
                      ? "bg-[#8B5CF6]/25 text-[#C4B5FD]"
                      : "bg-white/10 text-white/80",
                )}
              >
                {q.number.replace(/ \(OR\)/, "")}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 px-4">
        <QuestionDisplay
          question={currentQuestion}
          paper={paper}
          answer={session.answers[currentQuestion.id] ?? ""}
          selectedBranch={session.choiceSelections[currentQuestion.id]}
          onAnswer={setAnswer}
          onSelectBranch={selectOrBranch}
        />
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg space-y-2 border-t px-4 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0F0F18" }}
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 bg-transparent text-white"
            disabled={currentIndex === 0}
            onClick={() => goToQuestion(currentIndex - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-xl border-white/10 bg-transparent",
              session.flagged.includes(currentQuestion.id)
                ? "text-[#FBBF24]"
                : "text-white",
            )}
            onClick={() => toggleFlag(currentQuestion.id)}
          >
            <Flag className="mr-1 h-4 w-4" />
            {session.flagged.includes(currentQuestion.id) ? "Flagged" : "Flag"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 bg-transparent text-white"
            disabled={currentIndex >= activeQuestions.length - 1}
            onClick={() => goToQuestion(currentIndex + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <Button
          className="w-full rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED]"
          onClick={() => setShowSubmitDialog(true)}
        >
          Submit exam
        </Button>
      </footer>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="border-white/10 bg-[#0F0F18] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit exam?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {attemptedCount} of {activeQuestions.length} questions attempted. Are you sure you want
              to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white">
              Continue answering
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
              onClick={() => handleSubmit(false)}
            >
              Submit exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SetupScreen({
  subject,
  year,
  onSubjectChange,
  onYearChange,
  onStart,
  canStart,
}: {
  subject: string;
  year: string;
  onSubjectChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onStart: () => void;
  canStart: boolean;
}) {
  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 py-8"
      style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/20">
        <GraduationCap className="h-7 w-7 text-[#8B5CF6]" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-white">Board Exam Simulation</h1>
      <p className="mt-2 text-sm text-white/60">
        Sit a full Karnataka SSLC paper under real exam conditions.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-white/50">Subject</span>
          <select
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0F0F18] px-3 py-2.5 text-sm text-white"
          >
            <option value="science">Science</option>
            <option value="math" disabled>
              Mathematics (coming soon)
            </option>
            <option value="social" disabled>
              Social Science (coming soon)
            </option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-white/50">Model paper</span>
          <select
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0F0F18] px-3 py-2.5 text-sm text-white"
          >
            <option value="2025-26">2025-26 Model Paper</option>
          </select>
        </label>
      </div>

      <div
        className="mt-6 rounded-2xl border p-4 text-sm leading-relaxed text-white/75"
        style={{ borderColor: "rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)" }}
      >
        <div className="mb-2 flex items-center gap-2 font-medium text-[#FBBF24]">
          <AlertTriangle className="h-4 w-4" />
          Before you begin
        </div>
        This simulation is 3 hours 15 minutes. Find a quiet place, set your phone to Do Not
        Disturb, and treat it like the real exam.
      </div>

      <p className="mt-4 text-xs text-white/45">
        {SCIENCE_EXAM_2025.totalMarks} marks · {SCIENCE_EXAM_2025.duration} minutes · Physics,
        Chemistry, Biology
      </p>

      <Button
        className="mt-8 w-full rounded-xl bg-[#8B5CF6] py-6 text-base hover:bg-[#7C3AED]"
        disabled={!canStart}
        onClick={onStart}
      >
        Start Exam
      </Button>

      {!canStart ? (
        <p className="mt-2 text-center text-xs text-white/50">Sign in to start the simulation.</p>
      ) : null}
    </div>
  );
}

function QuestionDisplay({
  question,
  paper,
  answer,
  selectedBranch,
  onAnswer,
  onSelectBranch,
}: {
  question: ExamQuestion;
  paper: ExamPaper;
  answer: string;
  selectedBranch?: string;
  onAnswer: (id: string, value: string) => void;
  onSelectBranch: (id: string) => void;
}) {
  const orPartner =
    question.hasChoice && question.choiceWith
      ? paper.questions.find((q) => q.id === question.choiceWith)
      : null;

  const renderInput = (q: ExamQuestion) => {
    if (q.type === "mcq") {
      const options = MCQ_OPTIONS[q.id] ?? ["A", "B", "C", "D"];
      const labels = ["A", "B", "C", "D"];
      return (
        <div className="mt-4 space-y-2">
          {options.map((opt, idx) => (
            <button
              key={labels[idx]}
              type="button"
              onClick={() => onAnswer(q.id, labels[idx])}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                answer === labels[idx]
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-white"
                  : "border-white/10 bg-[#0F0F18] text-white/80 hover:border-white/20",
              )}
            >
              <span className="font-mono font-semibold text-[#8B5CF6]">{labels[idx]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      );
    }

    const rows = q.type === "long" || q.type === "diagram" ? 8 : 4;
    return (
      <div className="mt-4">
        {q.type === "diagram" ? (
          <p className="mb-2 text-xs text-[#FBBF24]">
            Draw diagram on paper, describe it here
          </p>
        ) : null}
        <textarea
          value={answer}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-white/10 bg-[#0F0F18] px-3 py-2 text-sm text-white placeholder:text-white/30"
          placeholder="Write your answer here…"
        />
      </div>
    );
  };

  if (orPartner) {
    const activeId = selectedBranch ?? question.id;
    return (
      <div className="space-y-4">
        {[question, orPartner].map((q, idx) => (
          <div key={q.id}>
            {idx === 1 ? (
              <div className="my-4 flex items-center gap-3 text-xs font-semibold text-white/40">
                <span className="h-px flex-1 bg-white/10" />
                OR
                <span className="h-px flex-1 bg-white/10" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onSelectBranch(q.id)}
              className={cn(
                "mb-2 rounded-lg px-2 py-1 text-xs font-medium",
                activeId === q.id
                  ? "bg-[#8B5CF6]/20 text-[#C4B5FD]"
                  : "bg-white/5 text-white/50",
              )}
            >
              Answer this question
            </button>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">{q.number}</h2>
              <span className="font-mono text-sm text-[#8B5CF6]">{q.marks} marks</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{q.text}</p>
            {activeId === q.id ? renderInput(q) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{question.number}</h2>
        <span className="font-mono text-sm text-[#8B5CF6]">{question.marks} marks</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{question.text}</p>
      {renderInput(question)}
    </div>
  );
}

function SubmittedScreen({
  session,
  paper,
  activeQuestions,
  submittedPhase,
  onChooseSelfMark,
  onChooseUpload,
  onSelfMarkChange,
  onFinishMarking,
  onDone,
}: {
  session: PersistedExamSession;
  paper: ExamPaper;
  activeQuestions: ExamQuestion[];
  submittedPhase: "choice" | "self-mark" | "complete";
  onChooseSelfMark: () => void;
  onChooseUpload: () => void;
  onSelfMarkChange: (questionId: string, value: "zero" | "partial" | "full") => void;
  onFinishMarking: () => void;
  onDone: () => void;
}) {
  const selfTotal = useMemo(() => {
    if (!session.selfMarks) return 0;
    return activeQuestions.reduce((sum, q) => {
      const mark = session.selfMarks?.[q.id];
      if (mark === "full") return sum + q.marks;
      if (mark === "partial") return sum + Math.round(q.marks / 2);
      return sum;
    }, 0);
  }, [session.selfMarks, activeQuestions]);

  const timeTaken = session.timeTakenSeconds ?? paper.duration * 60 - session.timeRemaining;

  if (submittedPhase === "choice") {
    return (
      <div
        className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 py-8"
        style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <h1 className="text-2xl font-bold text-white">Exam submitted!</h1>
        <p className="mt-2 text-sm text-white/60">
          Completed in {formatDuration(timeTaken)}
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={onChooseSelfMark}
            className="w-full rounded-2xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 p-4 text-left transition-colors hover:bg-[#8B5CF6]/15"
          >
            <p className="font-semibold text-white">Self marking</p>
            <p className="mt-1 text-xs text-white/60">
              Compare your answers with the model answers and mark yourself.
            </p>
          </button>
          <button
            type="button"
            onClick={onChooseUpload}
            className="w-full rounded-2xl border border-white/10 bg-[#0F0F18] p-4 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-2 font-semibold text-white">
              <Camera className="h-4 w-4 text-[#8B5CF6]" />
              Upload answer script
            </div>
            <p className="mt-1 text-xs text-white/60">
              Photograph your answer booklet and let Aura evaluate it.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (submittedPhase === "self-mark") {
    return (
      <div
        className="mx-auto min-h-[100dvh] max-w-lg px-4 py-6 pb-24"
        style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <h1 className="text-xl font-bold text-white">Self marking</h1>
        <p className="mt-1 font-mono text-sm text-[#4ADE80]">
          Running total: {selfTotal}/{paper.totalMarks}
        </p>

        <div className="mt-6 space-y-4">
          {activeQuestions.map((q) => {
            const studentAnswer = session.answers[q.id] ?? "";
            const model = SCIENCE_EXAM_MODEL_ANSWERS[q.id] ?? "Refer to model answer paper.";
            const mark = session.selfMarks?.[q.id];
            return (
              <article
                key={q.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0F0F18" }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">{q.number}</h2>
                  <span className="font-mono text-xs text-[#8B5CF6]">{q.marks} marks</span>
                </div>
                <p className="mt-2 text-xs text-white/70">{q.text}</p>
                {studentAnswer ? (
                  <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-white/80">
                    Your answer: {studentAnswer}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#4ADE80]/90">
                  {model}
                </p>
                <div className="mt-3 flex gap-2">
                  {(["full", "partial", "zero"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onSelfMarkChange(q.id, level)}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 text-xs font-medium capitalize",
                        mark === level
                          ? level === "full"
                            ? "bg-[#4ADE80]/20 text-[#4ADE80]"
                            : level === "partial"
                              ? "bg-[#FBBF24]/20 text-[#FBBF24]"
                              : "bg-[#F87171]/20 text-[#F87171]"
                          : "bg-white/5 text-white/60",
                      )}
                    >
                      {level === "full" ? "Full" : level === "partial" ? "Partial" : "Zero"}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0F0F18" }}>
          <Button
            className="w-full rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED]"
            onClick={onFinishMarking}
          >
            Finish marking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-4 py-8 text-center"
      style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <GraduationCap className="h-12 w-12 text-[#4ADE80]" />
      <h1 className="mt-4 text-2xl font-bold text-white">Marking complete</h1>
      <p className="mt-2 font-mono text-3xl text-[#4ADE80]">
        {selfTotal}/{paper.totalMarks}
      </p>
      <p className="mt-2 text-sm text-white/60">
        Completed in {formatDuration(timeTaken)}
      </p>
      <Button className="mt-8 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED]" onClick={onDone}>
        Back to dashboard
      </Button>
    </div>
  );
}
