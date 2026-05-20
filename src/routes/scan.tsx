import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, FileText, X, ChevronLeft, Sparkles, Scan as ScanIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnalyzingOverlay } from "@/components/scan/analyzing-overlay";
import { useCreateScan } from "@/hooks/use-scan";
import type { ScanMode, ScanSource } from "@/integrations/firebase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan & Solve — Aura" },
      { name: "description", content: "Scan any question and let Aura tutor you through it." },
    ],
  }),
  component: ScanCapturePage,
});

function ScanCapturePage() {
  const nav = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ScanMode>("solve");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState<ScanSource>("text");
  const { create, busy, stage } = useCreateScan();

  function pickFile(src: ScanSource, file: File | null) {
    if (!file) return;
    setSource(src);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
      toast.message("PDF selected — add the question text below so Aura can solve it.");
    }
  }

  async function submit() {
    const t = text.trim();
    if (t.length < 4) {
      toast.error("Type or paste the question — Aura needs the words to solve it.");
      return;
    }
    const scan = await create({ mode, source, extractedText: t, previewUrl: preview ?? undefined });
    if (scan) nav({ to: "/scan/$scanId", params: { scanId: scan.id } });
  }

  return (
    <div
      className="relative min-h-[100dvh] bg-background"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0)", paddingBottom: "max(env(safe-area-inset-bottom), 0)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/40 bg-background/90 px-3 backdrop-blur-xl">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-full press">
          <Link to="/" aria-label="Back"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="leading-tight">
          <div className="text-[11px] text-muted-foreground">Aura</div>
          <h1 className="font-display text-[15px] font-semibold text-foreground">Scan & Solve</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border/60 bg-card p-1 shadow-soft">
          {(["solve", "evaluate"] as ScanMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`press rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                mode === m ? "gradient-brand text-brand-foreground shadow-soft" : "text-foreground/70"
              }`}
            >
              {m === "solve" ? "Solve a question" : "Evaluate my answer"}
            </button>
          ))}
        </div>

        {/* Scan frame */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-secondary/40 to-background shadow-soft">
          <div className="absolute inset-0 rounded-3xl ring-1 ring-brand/20" />
          {/* corner brackets */}
          {[
            "top-3 left-3 border-l-2 border-t-2 rounded-tl-xl",
            "top-3 right-3 border-r-2 border-t-2 rounded-tr-xl",
            "bottom-3 left-3 border-l-2 border-b-2 rounded-bl-xl",
            "bottom-3 right-3 border-r-2 border-b-2 rounded-br-xl",
          ].map((c, i) => (
            <span key={i} className={`absolute h-6 w-6 border-brand ${c}`} />
          ))}

          {preview ? (
            <>
              <img src={preview} alt="Scan preview" className="absolute inset-0 h-full w-full object-cover" />
              <button
                onClick={() => { setPreview(null); setSource("text"); }}
                className="absolute right-3 top-3 press inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl gradient-brand opacity-30 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl gradient-brand text-brand-foreground shadow-glow">
                  <ScanIcon className="h-7 w-7" />
                </div>
              </div>
              <p className="px-6 text-[12.5px] text-muted-foreground">
                Hold the page flat inside the frame.<br />Good light, no glare.
              </p>
            </div>
          )}
          {/* sweep line */}
          <div className="pointer-events-none absolute left-4 right-4 top-1/2 h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-60 animate-[scan-sweep_2.4s_ease-in-out_infinite]" />
        </div>

        {/* Capture actions */}
        <div className="grid grid-cols-3 gap-2">
          <CaptureBtn icon={Camera} label="Camera" onClick={() => cameraRef.current?.click()} primary />
          <CaptureBtn icon={ImageIcon} label="Gallery" onClick={() => fileRef.current?.click()} />
          <CaptureBtn icon={FileText} label="PDF" onClick={() => fileRef.current?.click()} />
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pickFile("camera", e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            pickFile(f?.type === "application/pdf" ? "pdf" : "gallery", f);
          }}
        />

        {/* Question text */}
        <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-brand">
            <Sparkles className="h-3.5 w-3.5" /> Type or paste the question
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="e.g. Find the slope of the line passing through (2, 3) and (5, 9)."
            className="mt-2 resize-none rounded-2xl"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Image OCR is still beta — confirming the text gives Aura the cleanest start.
          </p>
        </section>

        <Button
          onClick={submit}
          disabled={busy || text.trim().length < 4}
          className="press h-12 w-full rounded-2xl gradient-brand text-brand-foreground shadow-glow"
        >
          {busy ? "Aura is reading…" : (<>Send to Aura <ArrowRight className="ml-1.5 h-4 w-4" /></>)}
        </Button>
      </main>

      {(busy || stage === "understanding") && <AnalyzingOverlay />}
    </div>
  );
}

function CaptureBtn({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`press flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border text-xs font-medium transition-all ${
        primary
          ? "gradient-brand text-brand-foreground border-transparent shadow-soft"
          : "border-border/60 bg-card text-foreground/80 hover:bg-secondary/60"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}