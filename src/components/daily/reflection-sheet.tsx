import { useState } from "react";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReflectionSheet({
  open,
  onClose,
  onSubmit,
  defaultMinutes,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { confidence: number; difficult: string; studyMinutes: number }) => void;
  defaultMinutes: number;
}) {
  const [confidence, setConfidence] = useState(3);
  const [difficult, setDifficult] = useState("");
  const [minutes, setMinutes] = useState(defaultMinutes);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-soft md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Daily reflection</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press rounded-xl bg-secondary p-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          A 30-second check-in. Feeds tomorrow's plan.
        </p>

        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How confident did today feel?
        </label>
        <div className="mt-2 flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setConfidence(n)}
              className={`press h-11 flex-1 rounded-2xl text-sm font-semibold transition-colors ${
                confidence === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground/70"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What was difficult? (optional)
        </label>
        <Textarea
          rows={3}
          value={difficult}
          onChange={(e) => setDifficult(e.target.value)}
          placeholder="e.g. Quadratic word problems"
          className="mt-2 rounded-2xl"
        />

        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total study minutes today
        </label>
        <input
          type="number"
          min={0}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))}
          className="mt-2 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm"
        />

        <Button
          className="press mt-5 h-11 w-full rounded-2xl text-sm font-semibold"
          onClick={() => onSubmit({ confidence, difficult, studyMinutes: minutes })}
        >
          Save reflection
        </Button>
      </div>
    </div>
  );
}