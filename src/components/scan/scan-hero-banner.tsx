import { Link } from "@tanstack/react-router";
import { ScanLine, Camera, ImageIcon, FileText } from "lucide-react";

/**
 * Compact "Scan & Solve" banner — sits near the top of the dashboard, just
 * below the header / greeting. Surfaces the three capture intents
 * (camera / upload / pdf) without taking over the page. All actions route
 * to /scan to preserve existing capture functionality.
 */
export function ScanHeroBanner() {
  return (
    <section
      aria-label="Scan and solve"
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 px-3 py-2.5 shadow-soft backdrop-blur-sm"
    >
      {/* Soft premium glow (kept subtle for the compact layout) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-brand-glow/15 blur-3xl"
      />

      <div className="relative flex items-center gap-2.5">
        <Link
          to="/scan"
          aria-label="Scan and solve"
          className="press flex min-w-0 flex-1 items-center gap-2.5"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-brand text-brand-foreground shadow-glow">
            <ScanLine className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-semibold leading-tight text-foreground">
              Scan &amp; Solve
            </span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              Snap, upload, or share a PDF
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <QuickAction to="/scan" icon={<Camera className="h-4 w-4" />} label="Camera" />
          <QuickAction to="/scan" icon={<ImageIcon className="h-4 w-4" />} label="Upload" />
          <QuickAction to="/scan" icon={<FileText className="h-4 w-4" />} label="PDF" />
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
      aria-label={label}
      title={label}
      className="press flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-secondary/60 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
