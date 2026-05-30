import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEACHER_CAN_SEE = [
  "Your weak chapters per subject",
  "Your gap types (conceptual/procedural/expression)",
  "Your unit test scores (when teacher enters them)",
  "How many sessions you complete per week",
] as const;

const TEACHER_CANNOT_SEE = [
  "Your study session times",
  "Your full session history",
  "Your personal notes",
  "Your answer script content",
  "Your exact probability scores",
] as const;

type SchoolJoinConsentProps = {
  schoolName: string;
  joining?: boolean;
  variant?: "dark" | "light";
  onConfirm: () => void;
  onCancel: () => void;
};

export function SchoolJoinConsent({
  schoolName,
  joining = false,
  variant = "dark",
  onConfirm,
  onCancel,
}: SchoolJoinConsentProps) {
  const isDark = variant === "dark";

  return (
    <div className="fade-in space-y-6">
      <div className="text-center">
        <h2
          className={`text-xl font-bold ${isDark ? "text-white" : "text-foreground"}`}
        >
          Before you join
        </h2>
        <p className={`mt-1 text-sm ${isDark ? "text-white/70" : "text-muted-foreground"}`}>
          Level 2 sharing with {schoolName} teachers
        </p>
      </div>

      <div
        className={`rounded-2xl border p-5 text-sm ${
          isDark ? "border-white/10 bg-[#14141F] text-white/80" : "border-border/60 bg-card"
        }`}
      >
        <p className={`font-semibold ${isDark ? "text-white" : "text-foreground"}`}>
          What your teacher can see
        </p>
        <ul className="mt-3 space-y-2">
          {TEACHER_CAN_SEE.map((item) => (
            <li key={item} className="flex gap-2 text-green-500/90">
              <span aria-hidden>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className={`mt-5 font-semibold ${isDark ? "text-white" : "text-foreground"}`}>
          What your teacher cannot see
        </p>
        <ul className="mt-3 space-y-2">
          {TEACHER_CANNOT_SEE.map((item) => (
            <li
              key={item}
              className={`flex gap-2 ${isDark ? "text-red-400/80" : "text-destructive/80"}`}
            >
              <span aria-hidden>✗</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`space-y-1 text-xs ${isDark ? "text-white/55" : "text-muted-foreground"}`}>
        <p>You can change this anytime in Settings.</p>
        <p>Your data is never shared with anyone outside your school.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          disabled={joining}
          className={
            isDark
              ? "w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
              : "w-full"
          }
          onClick={onConfirm}
        >
          {joining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            `I understand — join ${schoolName}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={joining}
          className={
            isDark
              ? "w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
              : "w-full"
          }
          onClick={onCancel}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

export const SCHOOL_CONSENT_VERSION = "1.0";
