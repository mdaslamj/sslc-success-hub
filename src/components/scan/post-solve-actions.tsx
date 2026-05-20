import { useState } from "react";
import { CalendarClock, AlertTriangle, RotateCw, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePostSolveActions } from "@/hooks/use-scan";
import { useLearningMemory } from "@/hooks/use-learning-memory";
import type { ScanDoc } from "@/integrations/firebase/types";

export function PostSolveActions({ scan }: { scan: ScanDoc }) {
  const actions = usePostSolveActions(scan);
  const memory = useLearningMemory();
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function run(key: string, fn: () => Promise<unknown>, ok: string, gateMsg?: string) {
    try {
      const res = await fn();
      if (res == null) {
        toast.message(gateMsg ?? "Sign in to save this to your plan.");
        return;
      }
      setDone((d) => ({ ...d, [key]: true }));
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  const items = [
    {
      key: "revise",
      label: "Add to revision",
      icon: CalendarClock,
      tone: "brand" as const,
      go: () =>
        run(
          "revise",
          async () => {
            const r = await actions.scheduleRevision(2);
            for (const label of (scan.understanding?.concepts ?? []).slice(0, 3)) {
              await memory.recordConceptSignal({
                conceptLabel: label,
                delta: -5,
                success: false,
                subjectId: scan.understanding?.subjectId,
                chapterId: scan.understanding?.chapterId,
              });
            }
            return r;
          },
          "Scheduled in your revision queue.",
        ),
    },
    {
      key: "weak",
      label: "Save weak topic",
      icon: AlertTriangle,
      tone: "warning" as const,
      go: () =>
        run(
          "weak",
          async () => {
            const r = await actions.markWeak();
            for (const label of (scan.understanding?.concepts ?? []).slice(0, 3)) {
              await memory.recordConceptSignal({
                conceptLabel: label,
                delta: -20,
                success: false,
                subjectId: scan.understanding?.subjectId,
                chapterId: scan.understanding?.chapterId,
              });
            }
            return r;
          },
          "Marked as a weak topic Aura will revisit.",
        ),
    },
    {
      key: "similar",
      label: "Practice similar",
      icon: RotateCw,
      tone: "muted" as const,
      go: () => toast.message("Generating practice set… (coming up next in your planner)"),
    },
    {
      key: "quiz",
      label: "Generate quiz",
      icon: Sparkles,
      tone: "muted" as const,
      go: () => toast.message("Quiz mode opens from the Subjects tab."),
    },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
      <h3 className="font-display text-sm font-semibold text-foreground">Make it stick</h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">Aura adapts your plan based on what you do next.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((i) => {
          const Icon = i.icon;
          const isDone = done[i.key];
          return (
            <Button
              key={i.key}
              variant="outline"
              onClick={i.go}
              className="press h-auto flex-col items-start gap-1 rounded-2xl border-border/60 bg-secondary/30 p-3 text-left hover:bg-secondary/60"
            >
              <div className="flex w-full items-center justify-between">
                <Icon className="h-4 w-4 text-brand" />
                {isDone && <Check className="h-3.5 w-3.5 text-brand" />}
              </div>
              <span className="text-[12px] font-medium text-foreground">{i.label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}