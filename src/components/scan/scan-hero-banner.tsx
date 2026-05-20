import { Link } from "@tanstack/react-router";
import { ScanLine, Camera, ImageIcon, FileText, Sparkles } from "lucide-react";

/**
 * Premium "Scan & Solve" hero banner for the dashboard.
 * Replaces the floating camera FAB with a discoverable, mobile-first card
 * that surfaces the three primary capture intents (camera / upload / pdf).
 * All actions route to /scan to preserve existing capture functionality.
 */
export function ScanHeroBanner() {
  return (
    <section
      aria-label="Scan and solve"
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-5 shadow-soft"
    >
      {/* Soft premium glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-brand-glow/20 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 rounded-2xl gradient-brand opacity-60 blur-md"
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-brand-foreground shadow-glow">
              <ScanLine className="h-6 w-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> AI Tutor
            </div>
            <h3 className="mt-1.5 font-display text-[19px] font-bold leading-tight text-foreground">
              Scan &amp; Solve Instantly
            </h3>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
              Snap a question, upload a photo, or share a PDF — Aura explains it step by step.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <QuickAction to="/scan" icon={<Camera className="h-[18px] w-[18px]" />} label="Camera" />
          <QuickAction to="/scan" icon={<ImageIcon className="h-[18px] w-[18px]" />} label="Upload" />
          <QuickAction to="/scan" icon={<FileText className="h-[18px] w-[18px]" />} label="PDF" />
        </div>
      </div>
    </section>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="press group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-secondary/50 px-2 py-3 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary shadow-soft transition-transform group-hover:scale-105">
        {icon}
      </span>
      <span className="text-[11px] font-semibold tracking-tight">{label}</span>
    </Link>
  );
}
