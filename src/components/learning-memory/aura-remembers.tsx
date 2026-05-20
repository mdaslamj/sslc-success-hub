/**
 * Subtle continuity strip — surfaces "Aura remembers..." style hints derived
 * from the learning memory engine. Mobile-first, calm tutor feel, no
 * structural redesign of the host page.
 */

import { Brain, Sparkles, AlertCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContinuityHint } from "@/lib/learning-memory";

export function AuraRemembers({
  hints,
  className,
}: {
  hints: ContinuityHint[];
  className?: string;
}) {
  if (!hints || hints.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {hints.map((h, i) => (
        <HintRow key={i} hint={h} />
      ))}
    </div>
  );
}

function HintRow({ hint }: { hint: ContinuityHint }) {
  const Icon = iconFor(hint.tone);
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs leading-snug text-muted-foreground backdrop-blur-sm",
        toneClass(hint.tone),
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="text-foreground/85">{hint.message}</span>
    </div>
  );
}

function iconFor(tone: ContinuityHint["tone"]) {
  switch (tone) {
    case "remember":
      return Brain;
    case "previous":
      return History;
    case "alert":
      return AlertCircle;
    case "encourage":
    default:
      return Sparkles;
  }
}

function toneClass(tone: ContinuityHint["tone"]): string {
  switch (tone) {
    case "alert":
      return "border-destructive/30";
    case "encourage":
      return "border-primary/30";
    case "previous":
      return "border-border";
    case "remember":
    default:
      return "border-primary/20";
  }
}