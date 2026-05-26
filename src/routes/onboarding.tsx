import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Brain,
  Clock,
  Languages,
  CalendarDays,
  Repeat,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/auth-context";
import { patchUserProfile } from "@/integrations/firebase/services/users";
import { saveMemoryTracking } from "@/integrations/firebase/services/memory-tracking";
import { saveBoardReadiness } from "@/integrations/firebase/services/board-readiness";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GUEST_KEY = "aura.guest.v1";
const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";

function isGuest() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_KEY) === "1";
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Project Aura" },
      { name: "description", content: "Set up your personalized AI study plan." },
    ],
  }),
  component: OnboardingFlow,
});

const SUBJECTS = [
  { id: "math", emoji: "🧮", label: "Mathematics" },
  { id: "science", emoji: "🧪", label: "Science" },
  { id: "social", emoji: "🌍", label: "Social Science" },
  { id: "english", emoji: "📘", label: "English" },
  { id: "kannada", emoji: "📜", label: "Kannada" },
  { id: "hindi", emoji: "📗", label: "Hindi" },
];

type State = {
  name: string;
  target: number;
  weak: string[];
  capacity: number;
  language: "en" | "kn" | "bilingual";
  weekend: "none" | "light" | "full";
  intensity: "light" | "balanced" | "intense";
};

function OnboardingFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<State>({
    name: "",
    target: 90,
    weak: [],
    capacity: 90,
    language: "en",
    weekend: "light",
    intensity: "balanced",
  });

  // Prefill from existing profile
  useEffect(() => {
    if (!profile) return;
    setS((p) => ({
      ...p,
      name: profile.studentName || profile.displayName || "",
      target: profile.targetScore ?? 90,
      weak: profile.weakSubjects ?? [],
      capacity: profile.dailyStudyGoalMinutes ?? 90,
      language: profile.preferredLanguage ?? "en",
      weekend: profile.weekendStudy ?? "light",
      intensity: profile.revisionIntensity ?? "balanced",
    }));
  }, [profile]);

  const total = 9;
  const next = () => setStep((x) => Math.min(x + 1, total - 1));
  const back = () => setStep((x) => Math.max(x - 1, 0));

  const finish = async () => {
    // Guest path — persist locally and continue.
    if (!user && isGuest()) {
      setSaving(true);
      try {
        localStorage.setItem(
          GUEST_ONBOARDING_KEY,
          JSON.stringify({ ...s, completedAt: Date.now() }),
        );
        toast.success("Your plan is ready 🌱");
        navigate({ to: "/" });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!user) {
      // First-time visitor finishing onboarding before choosing auth:
      // persist completion + mark guest so they aren't shown onboarding
      // again if they later tap "Continue as guest" from /login.
      try {
        localStorage.setItem(
          GUEST_ONBOARDING_KEY,
          JSON.stringify({ ...s, completedAt: Date.now() }),
        );
      } catch {}
      navigate({ to: "/login" });
      return;
    }
    setSaving(true);
    try {
      await patchUserProfile(user.uid, {
        studentName: s.name || profile?.studentName || "Student",
        targetScore: s.target,
        weakSubjects: s.weak,
        dailyStudyGoalMinutes: s.capacity,
        preferredLanguage: s.language,
        weekendStudy: s.weekend,
        revisionIntensity: s.intensity,
        onboardingCompletedAt: Date.now(),
      });
      // Seed adaptive baselines for weak subjects (non-blocking).
      void seedAdaptiveBaselines(user.uid, s).catch((e) =>
        console.warn("baseline seed failed", e),
      );
      await refreshProfile();
      toast.success("Your plan is ready 🌱");
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full gradient-sage"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden px-5 pb-8 kb-safe">
        {/* Progress dots */}
        <div className="flex items-center justify-between py-4">
          <button
            onClick={back}
            disabled={step === 0}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft disabled:opacity-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/60" : "w-3 bg-border",
                )}
              />
            ))}
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="flex-1 flex flex-col">
          {step === 0 && (
            <Step
              icon={<Sparkles className="h-5 w-5" />}
              eyebrow="Welcome to Aura"
              title="Your calm AI study companion 🌱"
              subtitle="Aura learns how you study and shapes a plan that fits your real life — not a generic timetable."
            >
              <ul className="mt-2 space-y-3">
                {[
                  { icon: <Target className="h-4 w-4" />, label: "Personalised to your target marks" },
                  { icon: <Brain className="h-4 w-4" />, label: "Adaptive revision for weak chapters" },
                  { icon: <Clock className="h-4 w-4" />, label: "Daily plans that respect your time" },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                      {row.icon}
                    </span>
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-center text-[11px] text-muted-foreground">
                Takes about a minute • You can change anything later
              </p>
            </Step>
          )}

          {step === 1 && (
            <Step
              icon={<Sparkles className="h-5 w-5" />}
              eyebrow="About you"
              title="What should Aura call you?"
              subtitle="Just a first name is fine."
            >
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Your name</span>
                <Input
                  value={s.name}
                  onChange={(e) => setS({ ...s, name: e.target.value })}
                  placeholder="e.g. Aanya"
                  className="mt-2 h-12 rounded-2xl bg-card text-base"
                />
              </label>
            </Step>
          )}

          {step === 2 && (
            <Step
              icon={<Target className="h-5 w-5" />}
              eyebrow="Goal"
              title={`Target marks: ${s.target}%`}
              subtitle="What's the score you want to walk into the exam aiming for?"
            >
              <Slider
                value={[s.target]}
                min={60}
                max={100}
                step={1}
                onValueChange={([v]) => setS({ ...s, target: v })}
                className="mt-6"
              />
              <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                <span>60</span><span>80</span><span>100</span>
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step
              icon={<Brain className="h-5 w-5" />}
              eyebrow="Focus areas"
              title="Which subjects feel tough?"
              subtitle="Pick any. Aura will quietly give them more attention."
            >
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map((sub) => {
                  const on = s.weak.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() =>
                        setS({
                          ...s,
                          weak: on ? s.weak.filter((x) => x !== sub.id) : [...s.weak, sub.id],
                        })
                      }
                      className={cn(
                        "press flex items-center gap-2 rounded-2xl border p-4 text-left text-sm transition-all",
                        on
                          ? "border-primary bg-secondary text-foreground shadow-soft"
                          : "border-border bg-card text-foreground/80",
                      )}
                    >
                      <span className="text-xl">{sub.emoji}</span>
                      <span className="flex-1 font-medium">{sub.label}</span>
                      {on && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              icon={<Clock className="h-5 w-5" />}
              eyebrow="Daily capacity"
              title={`${formatMin(s.capacity)} a day`}
              subtitle="Be honest — Aura plans around what's sustainable, not what's heroic."
            >
              <Slider
                value={[s.capacity]}
                min={20}
                max={240}
                step={10}
                onValueChange={([v]) => setS({ ...s, capacity: v })}
                className="mt-6"
              />
              <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                <span>20m</span><span>2h</span><span>4h</span>
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step
              icon={<Languages className="h-5 w-5" />}
              eyebrow="Language"
              title="How should Aura speak to you?"
              subtitle="You can change this anytime in Settings."
            >
              <div className="grid gap-2">
                {([
                  { id: "en", label: "English", hint: "Standard explanations" },
                  { id: "kn", label: "ಕನ್ನಡ", hint: "Kannada explanations" },
                  { id: "bilingual", label: "Bilingual", hint: "Mix English + Kannada" },
                ] as const).map((o) => {
                  const on = s.language === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setS({ ...s, language: o.id })}
                      className={cn(
                        "press flex items-center justify-between rounded-2xl border p-4 text-left",
                        on ? "border-primary bg-secondary" : "border-border bg-card",
                      )}
                    >
                      <div>
                        <div className="font-display text-base font-semibold">{o.label}</div>
                        <div className="text-xs text-muted-foreground">{o.hint}</div>
                      </div>
                      {on && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 6 && (
            <Step
              icon={<CalendarDays className="h-5 w-5" />}
              eyebrow="Weekends"
              title="How do weekends look?"
              subtitle="Aura distributes revision differently if you study on weekends."
            >
              <div className="grid gap-2">
                {([
                  { id: "none", label: "Rest days", hint: "No planned study" },
                  { id: "light", label: "Light revision", hint: "30–60 min revisions" },
                  { id: "full", label: "Full study", hint: "Same as weekdays" },
                ] as const).map((o) => {
                  const on = s.weekend === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setS({ ...s, weekend: o.id })}
                      className={cn(
                        "press flex items-center justify-between rounded-2xl border p-4 text-left",
                        on ? "border-primary bg-secondary" : "border-border bg-card",
                      )}
                    >
                      <div>
                        <div className="font-display text-base font-semibold">{o.label}</div>
                        <div className="text-xs text-muted-foreground">{o.hint}</div>
                      </div>
                      {on && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 7 && (
            <Step
              icon={<Repeat className="h-5 w-5" />}
              eyebrow="Revision style"
              title="How intense should revisions feel?"
              subtitle="More intense = more spaced-repetition prompts and quizzes."
            >
              <div className="grid gap-2">
                {([
                  { id: "light", label: "Light", hint: "Once a week per topic" },
                  { id: "balanced", label: "Balanced", hint: "Suggested for most students" },
                  { id: "intense", label: "Intense", hint: "Daily quick recall" },
                ] as const).map((o) => {
                  const on = s.intensity === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setS({ ...s, intensity: o.id })}
                      className={cn(
                        "press flex items-center justify-between rounded-2xl border p-4 text-left",
                        on ? "border-primary bg-secondary" : "border-border bg-card",
                      )}
                    >
                      <div>
                        <div className="font-display text-base font-semibold">{o.label}</div>
                        <div className="text-xs text-muted-foreground">{o.hint}</div>
                      </div>
                      {on && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 8 && (
            <Step
              icon={<Sparkles className="h-5 w-5" />}
              eyebrow="All set"
              title={s.name ? `Ready, ${s.name.split(" ")[0]}? 🌱` : "Ready? 🌱"}
              subtitle="Aura will draft your adaptive study plan from these answers."
            >
              <div className="space-y-2">
                <SummaryRow label="Target" value={`${s.target}%`} />
                <SummaryRow
                  label="Daily capacity"
                  value={formatMin(s.capacity)}
                />
                <SummaryRow
                  label="Weak subjects"
                  value={
                    s.weak.length
                      ? s.weak
                          .map((id) => SUBJECTS.find((x) => x.id === id)?.label ?? id)
                          .join(", ")
                      : "None selected"
                  }
                />
                <SummaryRow
                  label="Language"
                  value={
                    s.language === "en"
                      ? "English"
                      : s.language === "kn"
                        ? "Kannada"
                        : "Bilingual"
                  }
                />
                <SummaryRow label="Weekends" value={s.weekend} />
                <SummaryRow label="Revision" value={s.intensity} />
              </div>
            </Step>
          )}
        </div>

        <div
          className="sticky bottom-0 z-10 -mx-5 mt-2 px-5 pt-4 bg-gradient-to-t from-background via-background/95 to-background/0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
        >
          {step < total - 1 ? (
            <Button
              size="lg"
              className="press h-14 w-full rounded-2xl text-base font-semibold gradient-brand text-brand-foreground shadow-soft"
              onClick={next}
              disabled={step === 1 && !s.name.trim()}
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="press h-14 w-full rounded-2xl text-base font-semibold gradient-brand text-brand-foreground shadow-soft"
              onClick={finish}
              disabled={saving}
            >
              {saving ? "Generating your plan…" : "Start studying"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  icon,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
        {icon}
        {eyebrow}
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-7 flex-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-soft">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground capitalize">{value}</span>
    </div>
  );
}

function formatMin(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/**
 * Best-effort baseline seeding so adaptive engines have a starting point
 * right after onboarding. Each call is independent and any failure is
 * swallowed so it never blocks navigation.
 */
async function seedAdaptiveBaselines(uid: string, s: State): Promise<void> {
  const now = Date.now();
  // Memory-tracking: one placeholder per weak subject (chapterId == subjectId
  // until the planner promotes it to real chapters on first study session).
  await Promise.allSettled(
    s.weak.map((subjectId) =>
      saveMemoryTracking({
        id: `seed_${subjectId}`,
        userId: uid,
        chapterId: `seed_${subjectId}`,
        subjectId,
        lastPracticed: now,
        confidenceDecay: 0,
        nextInterval: 1,
        marksAtRisk: 0,
        confidenceScore: 50,
        retentionScore: 50,
        retentionBand: "reminder",
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
  // Initial board-readiness baseline so the dashboard ring has a value to show.
  const base = Math.max(40, Math.min(85, s.target - 15));
  await saveBoardReadiness({
    userId: uid,
    readinessScore: base,
    band: base >= 75 ? "ready" : base >= 60 ? "reminder" : "remediation",
    contributingFactors: {
      memory: 50,
      reasoning: 50,
      continuity: 50,
      weaknesses: s.weak.length ? 40 : 60,
      recentPerformance: 50,
    },
    predictionDate: now,
    recommendations: [
      { kind: "revision_reminder", label: "Start your first daily session" },
    ],
    createdAt: now,
    updatedAt: now,
  });
}