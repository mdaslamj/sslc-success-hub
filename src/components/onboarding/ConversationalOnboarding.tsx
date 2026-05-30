import { useCallback, useEffect, useState } from "react";
import { SchoolJoinConsent } from "@/components/school/SchoolJoinConsent";
import { resolveSchoolByCode } from "@/lib/schoolService";
import type { School } from "@/types/school";

const SUBJECTS = [
  { id: "science", emoji: "🧪", label: "Science" },
  { id: "math", emoji: "🧮", label: "Math" },
  { id: "social", emoji: "🌍", label: "Social" },
  { id: "english", emoji: "📘", label: "English" },
  { id: "kannada", emoji: "📜", label: "Kannada" },
  { id: "hindi", emoji: "📗", label: "Hindi" },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const HOUR_OPTIONS = [
  { value: 1 as const, label: "1 hr" },
  { value: 2 as const, label: "2 hrs" },
  { value: 3 as const, label: "3 hrs" },
  { value: 4 as const, label: "4+ hrs" },
];

const LEVEL_OPTIONS = [
  { id: "just_starting" as const, label: "Just starting" },
  { id: "some_chapters" as const, label: "Some chapters done" },
  { id: "well_prepared" as const, label: "Well prepared" },
];

export type PricingTier = "rural" | "semi-urban" | "urban";

const SCHOOL_OPTIONS: {
  tier: PricingTier;
  label: string;
  price: string;
}[] = [
  { tier: "rural", label: "Government School", price: "Rs.49/month" },
  { tier: "semi-urban", label: "Private Aided School", price: "Rs.149/month" },
  { tier: "urban", label: "Private School", price: "Rs.299/month" },
];

export type ConversationalAnswers = {
  examDate: string;
  dailyHours: 1 | 2 | 3 | 4;
  unavailableDays: string[];
  worriedSubject: string;
  schoolType?: PricingTier;
  startingLevel: "just_starting" | "some_chapters" | "well_prepared";
  schoolCode?: string;
};

export type OnboardingMappedState = {
  name: string;
  target: number;
  weak: string[];
  capacity: number;
  language: "en" | "kn" | "bilingual";
  weekend: "none" | "light" | "full";
  intensity: "light" | "balanced" | "intense";
  examDate?: string;
  unavailableDays?: string[];
  startingLevel?: ConversationalAnswers["startingLevel"];
  pricingTier?: PricingTier;
  schoolCode?: string;
};

type Props = {
  defaultName?: string;
  saving?: boolean;
  onComplete: (state: OnboardingMappedState) => void;
};

type ChatMessage = {
  id: string;
  role: "aura" | "student";
  text: string;
};

function daysUntil(dateStr: string): number {
  const exam = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}

function subjectLabel(id: string): string {
  return SUBJECTS.find((s) => s.id === id)?.label ?? id;
}

function hourLabel(hours: number): string {
  return hours >= 4 ? "4+" : String(hours);
}

export function mapConversationalToState(
  answers: ConversationalAnswers,
  defaultName = "Student",
): OnboardingMappedState {
  const levelMap = {
    just_starting: { target: 75, intensity: "light" as const },
    some_chapters: { target: 85, intensity: "balanced" as const },
    well_prepared: { target: 90, intensity: "balanced" as const },
  };
  const level = levelMap[answers.startingLevel];

  const weekendOff =
    answers.unavailableDays.includes("Sat") && answers.unavailableDays.includes("Sun");

  return {
    name: defaultName,
    target: level.target,
    weak: [answers.worriedSubject],
    capacity: answers.dailyHours * 60,
    language: "en",
    weekend: weekendOff ? "none" : "light",
    intensity: level.intensity,
    examDate: answers.examDate,
    unavailableDays: answers.unavailableDays,
    startingLevel: answers.startingLevel,
    pricingTier: answers.schoolType ?? "urban",
    schoolCode: answers.schoolCode,
  };
}

function buildAuraResponse(
  questionIndex: number,
  answers: Partial<ConversationalAnswers>,
): string {
  switch (questionIndex) {
    case 0:
      return `Got it — that gives us ${daysUntil(answers.examDate ?? "")} days. Let's make every one count.`;
    case 1:
      return `${hourLabel(answers.dailyHours ?? 1)} hours is enough. Most toppers study smart, not long.`;
    case 2:
      return "Noted. I'll never schedule anything on those days.";
    case 3:
      return `That's exactly where we start. ${subjectLabel(answers.worriedSubject ?? "")} will be your first priority.`;
    case 4: {
      switch (answers.schoolType) {
        case "rural":
          return "Great — you get our full platform at a price that works for everyone.";
        case "semi-urban":
          return "Perfect — full access, built for students like you.";
        case "urban":
          return "All set — you have access to everything Aura offers.";
        default:
          return "All set — you have access to everything Aura offers.";
      }
    }
    case 5:
      return "Got it. One optional step — connect to your school if you have a code.";
    case 6:
      return answers.schoolCode
        ? "Great — I'll link you to your school after you sign in."
        : "No problem — you can join your school anytime from Settings.";
    default:
      return "";
  }
}

const QUESTIONS = [
  "When is your SSLC board exam? This helps me build your countdown.",
  "How many hours can you study on a typical weekday? Be honest — I'll work with whatever you have.",
  "Which days are completely unavailable — tuition, sports, family time?",
  "Which subject worries you most right now?",
  "One last thing — what type of school are you in? This helps us set the right plan for you.",
  "Have you started studying for boards or are you starting fresh?",
  "Does your school use Aura? Enter your school code to connect with your teachers. Skip if you are not sure.",
];

export function ConversationalOnboarding({ defaultName, saving, onComplete }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<ConversationalAnswers>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "q0", role: "aura", text: QUESTIONS[0] },
  ]);
  const [showInput, setShowInput] = useState(true);
  const [examDateDraft, setExamDateDraft] = useState("2026-03-25");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [schoolCodeDraft, setSchoolCodeDraft] = useState("");
  const [pendingSchool, setPendingSchool] = useState<School | null>(null);
  const [schoolLookupError, setSchoolLookupError] = useState<string | null>(null);
  const [schoolLookupLoading, setSchoolLookupLoading] = useState(false);

  const progress = Math.min(questionIndex + (showInput ? 0 : 1), 7);

  const appendMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text },
    ]);
  }, []);

  const advanceAfterResponse = useCallback(
    (nextAnswers: Partial<ConversationalAnswers>, answeredIndex: number) => {
      setTransitioning(true);
      setShowInput(false);

      const response = buildAuraResponse(answeredIndex, nextAnswers);
      appendMessage("aura", response);

      window.setTimeout(() => {
        if (answeredIndex >= 6) {
          onComplete(
            mapConversationalToState(nextAnswers as ConversationalAnswers, defaultName),
          );
          return;
        }

        const nextIndex = answeredIndex + 1;
        setQuestionIndex(nextIndex);
        appendMessage("aura", QUESTIONS[nextIndex]);
        setShowInput(true);
        setTransitioning(false);
      }, 1400);
    },
    [appendMessage, defaultName, onComplete],
  );

  const handleExamDateConfirm = () => {
    if (!examDateDraft || transitioning) return;
    const next = { ...answers, examDate: examDateDraft };
    setAnswers(next);
    appendMessage("student", new Date(`${examDateDraft}T00:00:00`).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }));
    advanceAfterResponse(next, 0);
  };

  const handleHoursSelect = (hours: 1 | 2 | 3 | 4) => {
    if (transitioning) return;
    const next = { ...answers, dailyHours: hours };
    setAnswers(next);
    appendMessage("student", HOUR_OPTIONS.find((h) => h.value === hours)?.label ?? `${hours} hrs`);
    advanceAfterResponse(next, 1);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleDaysConfirm = () => {
    if (transitioning) return;
    const next = { ...answers, unavailableDays: selectedDays };
    setAnswers(next);
    appendMessage(
      "student",
      selectedDays.length ? selectedDays.join(", ") : "None — I'm free every day",
    );
    advanceAfterResponse(next, 2);
  };

  const handleSubjectSelect = (subjectId: string) => {
    if (transitioning) return;
    const next = { ...answers, worriedSubject: subjectId };
    setAnswers(next);
    appendMessage("student", subjectLabel(subjectId));
    advanceAfterResponse(next, 3);
  };

  const handleSchoolSelect = (tier: PricingTier) => {
    if (transitioning) return;
    const option = SCHOOL_OPTIONS.find((o) => o.tier === tier);
    const next = { ...answers, schoolType: tier };
    setAnswers(next);
    appendMessage("student", option ? `${option.label} · ${option.price}` : tier);
    advanceAfterResponse(next, 4);
  };

  const handleLevelSelect = (level: ConversationalAnswers["startingLevel"]) => {
    if (transitioning) return;
    const next = { ...answers, startingLevel: level };
    setAnswers(next);
    appendMessage("student", LEVEL_OPTIONS.find((l) => l.id === level)?.label ?? level);
    advanceAfterResponse(next, 5);
  };

  const finishWithSchoolAnswers = (next: Partial<ConversationalAnswers>, answeredIndex: number) => {
    setTransitioning(true);
    setShowInput(false);
    const response = buildAuraResponse(answeredIndex, next);
    appendMessage("aura", response);
    window.setTimeout(() => {
      onComplete(mapConversationalToState(next as ConversationalAnswers, defaultName));
    }, 1200);
  };

  const handleSchoolConnect = async () => {
    if (transitioning || schoolLookupLoading) return;
    const code = schoolCodeDraft.trim().toUpperCase();
    if (code.length < 3) return;
    setSchoolLookupLoading(true);
    setSchoolLookupError(null);
    try {
      const found = await resolveSchoolByCode(code);
      if (!found) {
        setSchoolLookupError("School code not found. Check with your teacher or skip for now.");
        return;
      }
      const next = { ...answers, schoolCode: found.schoolCode };
      setAnswers(next);
      appendMessage("student", found.schoolCode);
      setPendingSchool(found);
    } catch {
      setSchoolLookupError("Could not look up that code. Please try again.");
    } finally {
      setSchoolLookupLoading(false);
    }
  };

  const handleSchoolConsentConfirm = () => {
    if (transitioning || !pendingSchool) return;
    finishWithSchoolAnswers(
      { ...answers, schoolCode: pendingSchool.schoolCode },
      6,
    );
  };

  const handleSchoolConsentCancel = () => {
    setPendingSchool(null);
    setSchoolLookupError(null);
  };

  const handleSchoolSkip = () => {
    if (transitioning) return;
    appendMessage("student", "Skip for now");
    finishWithSchoolAnswers(answers, 6);
  };

  const inputBlock = (() => {
    if (!showInput || saving) return null;

    switch (questionIndex) {
      case 0:
        return (
          <div className="space-y-3 fade-in">
            <input
              type="date"
              value={examDateDraft}
              min="2026-03-01"
              max="2026-04-30"
              onChange={(e) => setExamDateDraft(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none"
              style={{
                background: "#14141F",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="button"
              onClick={handleExamDateConfirm}
              disabled={!examDateDraft}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors"
              style={{
                background: "rgba(139,92,246,0.25)",
                border: "1px solid rgba(139,92,246,0.45)",
              }}
            >
              Confirm date
            </button>
          </div>
        );
      case 1:
        return (
          <div className="space-y-2 fade-in">
            {HOUR_OPTIONS.map((opt) => (
              <AnswerButton key={opt.value} onClick={() => handleHoursSelect(opt.value)}>
                {opt.label}
              </AnswerButton>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-3 fade-in">
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map((day) => {
                const on = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="rounded-xl py-2.5 text-xs font-medium transition-colors"
                    style={{
                      background: on ? "rgba(139,92,246,0.1)" : "#14141F",
                      border: on
                        ? "1px solid #8B5CF6"
                        : "1px solid rgba(255,255,255,0.1)",
                      color: on ? "#C4B5FD" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <AnswerButton onClick={handleDaysConfirm}>Continue</AnswerButton>
          </div>
        );
      case 3:
        return (
          <div className="space-y-2 fade-in">
            {SUBJECTS.map((sub) => (
              <AnswerButton key={sub.id} onClick={() => handleSubjectSelect(sub.id)}>
                <span className="mr-2">{sub.emoji}</span>
                {sub.label}
              </AnswerButton>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-2 fade-in">
            {SCHOOL_OPTIONS.map((opt) => (
              <AnswerButton key={opt.tier} onClick={() => handleSchoolSelect(opt.tier)}>
                <span className="block font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-white/60">{opt.price}</span>
              </AnswerButton>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="space-y-2 fade-in">
            {LEVEL_OPTIONS.map((opt) => (
              <AnswerButton key={opt.id} onClick={() => handleLevelSelect(opt.id)}>
                {opt.label}
              </AnswerButton>
            ))}
          </div>
        );
      case 6:
        if (pendingSchool) return null;
        return (
          <div className="space-y-3 fade-in">
            <input
              type="text"
              value={schoolCodeDraft}
              onChange={(e) => {
                setSchoolCodeDraft(e.target.value.toUpperCase());
                setSchoolLookupError(null);
              }}
              maxLength={16}
              placeholder="KAR-BGM"
              className="w-full rounded-xl border px-4 py-3 text-sm uppercase tracking-wider text-white outline-none"
              style={{
                background: "#14141F",
                borderColor: "rgba(255,255,255,0.1)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            {schoolLookupError ? (
              <p className="text-center text-xs text-red-400">{schoolLookupError}</p>
            ) : null}
            <AnswerButton onClick={() => void handleSchoolConnect()}>
              {schoolLookupLoading ? "Looking up…" : "Connect to school"}
            </AnswerButton>
            <button
              type="button"
              onClick={handleSchoolSkip}
              className="w-full py-2 text-center text-sm text-white/60 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Skip for now
            </button>
          </div>
        );
      default:
        return null;
    }
  })();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{
        background: "#08080E",
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
      }}
    >
      <style>{`
        @keyframes onboardingFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: onboardingFadeIn 0.45s ease-out forwards;
        }
        .msg-fade-in {
          animation: onboardingFadeIn 0.4s ease-out forwards;
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            🌱
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Aura</p>
            <p className="text-xs text-white/60">Your study companion</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`msg-fade-in ${msg.role === "student" ? "flex justify-end" : ""}`}
            >
              {msg.role === "aura" ? (
                <div
                  className="max-w-[92%] text-sm leading-relaxed text-white/90"
                  style={{
                    background: "rgba(139,92,246,0.12)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                <div
                  className="max-w-[85%] text-sm font-medium text-violet-200"
                  style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.35)",
                    borderRadius: 12,
                    padding: "10px 14px",
                  }}
                >
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {inputBlock}

          {pendingSchool ? (
            <div className="fade-in pt-2">
              <SchoolJoinConsent
                schoolName={pendingSchool.name}
                variant="dark"
                onConfirm={handleSchoolConsentConfirm}
                onCancel={handleSchoolConsentCancel}
              />
            </div>
          ) : null}

          {saving && (
            <p className="fade-in text-center text-sm text-white/60">
              Generating your plan…
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-4">
          <p className="text-xs text-white/55">
            {Math.min(progress, 7)} of 7
          </p>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full transition-colors"
                style={{
                  background: i < progress ? "#8B5CF6" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl px-4 py-3.5 text-left text-sm font-medium text-white/90 transition-colors hover:border-violet-500"
      style={{
        background: "#14141F",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = "1px solid #8B5CF6";
        e.currentTarget.style.background = "rgba(139,92,246,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
        e.currentTarget.style.background = "#14141F";
      }}
    >
      {children}
    </button>
  );
}
