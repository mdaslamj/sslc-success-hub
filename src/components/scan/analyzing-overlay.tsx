import { useEffect, useState } from "react";
import { Scan, Sparkles, BrainCircuit } from "lucide-react";

const PHASES = [
  { icon: Scan, label: "Scanning the page…" },
  { icon: Sparkles, label: "Extracting concepts…" },
  { icon: BrainCircuit, label: "Aura is understanding your question…" },
];

export function AnalyzingOverlay() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHASES.length), 1100);
    return () => clearInterval(t);
  }, []);
  const Icon = PHASES[i].icon;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/90 backdrop-blur-xl animate-fade-in">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-3xl gradient-brand opacity-30 blur-2xl animate-pulse" />
        <div className="absolute inset-0 rounded-3xl border border-brand/40" />
        <div className="absolute inset-2 rounded-2xl border border-brand/30" />
        <div className="absolute inset-4 rounded-2xl border border-brand/20" />
        <div className="absolute left-3 right-3 top-1/2 h-px bg-gradient-to-r from-transparent via-brand to-transparent animate-[scan-sweep_1.8s_ease-in-out_infinite]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-9 w-9 text-brand animate-scale-in" key={i} />
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-lg font-semibold text-foreground">{PHASES[i].label}</div>
        <div className="mt-1 text-xs text-muted-foreground">This takes a few seconds — Aura is working calmly.</div>
      </div>
      <div className="flex gap-1.5">
        {PHASES.map((_, k) => (
          <span
            key={k}
            className={`h-1.5 w-6 rounded-full transition-all duration-300 ${k === i ? "bg-brand" : "bg-border"}`}
          />
        ))}
      </div>
      <style>{`@keyframes scan-sweep { 0%,100% { transform: translateY(-40px); opacity: .2; } 50% { transform: translateY(40px); opacity: 1; } }`}</style>
    </div>
  );
}