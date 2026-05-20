import { Zap, ListOrdered, Lightbulb, GraduationCap, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SolveMode } from "@/integrations/firebase/types";

const MODES: { id: SolveMode; label: string; icon: typeof Zap }[] = [
  { id: "quick", label: "Quick", icon: Zap },
  { id: "step_by_step", label: "Step-by-Step", icon: ListOrdered },
  { id: "hint", label: "Hints", icon: Lightbulb },
  { id: "board", label: "Board", icon: GraduationCap },
  { id: "kannada", label: "Kannada", icon: Languages },
];

export function SolveTabs({
  active,
  onChange,
}: {
  active: SolveMode;
  onChange: (m: SolveMode) => void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1.5 px-1">
        {MODES.map((m) => {
          const Icon = m.icon;
          const on = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                "press shrink-0 inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-medium transition-all",
                on
                  ? "gradient-brand text-brand-foreground border-transparent shadow-soft"
                  : "border-border/60 bg-card text-foreground/80 hover:bg-secondary/60",
              )}
              aria-pressed={on}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}