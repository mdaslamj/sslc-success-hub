import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Save,
  ScanLine,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAttempt,
  fetchAttemptImages,
  recomputeAttemptState,
  runOcrExtraction,
  saveCorrectedText,
  setImageReviewStatus,
} from "@/integrations/firebase/services/answer-uploads";
import type {
  AnswerAttemptDoc,
  AnswerProcessingState,
  AnswerUploadDoc,
} from "@/integrations/firebase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/answer-uploads/$attemptId")({
  head: () => ({
    meta: [
      { title: "Review answer — VidyaPath" },
      {
        name: "description",
        content:
          "Review extracted text from your handwritten answer pages, correct OCR mistakes, and approve them for AI evaluation.",
      },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { attemptId } = useParams({ from: "/answer-uploads/$attemptId" });
  const [attempt, setAttempt] = useState<AnswerAttemptDoc | null>(null);
  const [images, setImages] = useState<AnswerUploadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const lastLoadedImageId = useRef<string | null>(null);

  const refresh = async () => {
    try {
      const [a, imgs] = await Promise.all([
        fetchAttempt(attemptId),
        fetchAttemptImages(attemptId),
      ]);
      setAttempt(a);
      setImages(imgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attempt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Poll while any page is still processing.
  const stillProcessing = images.some(
    (i) => i.ocr.status === "pending" || i.ocr.status === "queued",
  );
  useEffect(() => {
    if (!stillProcessing) return;
    const t = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillProcessing, attemptId]);

  const activeImage = images[activeIdx] ?? null;

  // Sync editor draft when the active page (or its OCR result) changes.
  useEffect(() => {
    if (!activeImage) return;
    const key = `${activeImage.id}:${activeImage.ocr.updatedAt ?? 0}`;
    if (lastLoadedImageId.current === key) return;
    lastLoadedImageId.current = key;
    setDraft(
      activeImage.ocr.correctedText ??
        activeImage.ocr.extractedText ??
        "",
    );
  }, [activeImage]);

  const handleSave = async (opts: { approve?: boolean } = {}) => {
    if (!activeImage) return;
    setSaving(true);
    try {
      await saveCorrectedText(activeImage.id, draft);
      if (opts.approve) {
        await setImageReviewStatus(activeImage.id, "approved");
      }
      await recomputeAttemptState(attemptId);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleRerun = async () => {
    if (!activeImage) return;
    setRerunning(true);
    try {
      await runOcrExtraction(activeImage);
      await recomputeAttemptState(attemptId);
      await refresh();
    } finally {
      setRerunning(false);
    }
  };

  const approvedCount = useMemo(
    () => images.filter((i) => i.ocr.reviewStatus === "approved").length,
    [images],
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !attempt) {
    return (
      <DashboardLayout>
        <Card className="p-6 text-sm text-destructive">
          {error ?? "Attempt not found."}
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <Link
              to="/answer-uploads"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Back to uploads
            </Link>
            <h1 className="text-2xl font-bold">Review answer</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(attempt.createdAt), "PP p")}
              {attempt.context.label ? ` · ${attempt.context.label}` : ""}
            </p>
          </div>
          <ProcessingBadge
            state={attempt.processingState ?? "uploaded"}
            approved={approvedCount}
            total={images.length}
          />
        </div>

        {images.length > 1 && (
          <PageNav
            count={images.length}
            active={activeIdx}
            images={images}
            onSelect={setActiveIdx}
          />
        )}

        {activeImage && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ImagePanel image={activeImage} />
            <ReviewPanel
              image={activeImage}
              draft={draft}
              onDraftChange={setDraft}
              onSave={handleSave}
              onRerun={handleRerun}
              saving={saving}
              rerunning={rerunning}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProcessingBadge({
  state,
  approved,
  total,
}: {
  state: AnswerProcessingState;
  approved: number;
  total: number;
}) {
  const map: Record<AnswerProcessingState, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    uploaded: { label: "Uploaded", variant: "secondary" },
    processing: { label: "Scanning…", variant: "default" },
    review_required: { label: `Review ${approved}/${total}`, variant: "outline" },
    ready_for_evaluation: { label: "Ready for evaluation", variant: "default" },
    evaluated: { label: "Evaluated", variant: "default" },
  };
  const entry = map[state];
  return (
    <Badge variant={entry.variant} className="gap-1 self-start">
      {state === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "ready_for_evaluation" && <Sparkles className="h-3 w-3" />}
      {entry.label}
    </Badge>
  );
}

function PageNav({
  count,
  active,
  images,
  onSelect,
}: {
  count: number;
  active: number;
  images: AnswerUploadDoc[];
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        disabled={active === 0}
        onClick={() => onSelect(active - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex flex-1 gap-1 overflow-x-auto">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => onSelect(i)}
            className={cn(
              "flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-2 text-xs font-medium",
              i === active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground",
              img.ocr.reviewStatus === "approved" && i !== active &&
                "border-emerald-500/40 text-emerald-600",
            )}
          >
            {i + 1}
            {img.ocr.reviewStatus === "approved" && (
              <CheckCircle2 className="ml-1 h-3 w-3" />
            )}
          </button>
        ))}
      </div>
      <Button
        size="icon"
        variant="outline"
        disabled={active === count - 1}
        onClick={() => onSelect(active + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ImagePanel({ image }: { image: AnswerUploadDoc }) {
  const processing =
    image.ocr.status === "pending" || image.ocr.status === "queued";
  return (
    <Card className="relative overflow-hidden bg-muted">
      <img
        src={image.downloadUrl}
        alt={`Page ${image.order + 1}`}
        className="h-auto w-full object-contain"
        loading="lazy"
      />
      {processing && <ScanningOverlay />}
    </Card>
  );
}

function ScanningOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px]">
      <div className="absolute inset-x-0 top-0 h-1 animate-[scanline_1.6s_ease-in-out_infinite] bg-primary/70" />
      <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow">
        <ScanLine className="h-3.5 w-3.5 animate-pulse text-primary" />
        Extracting text…
      </div>
      <style>{`@keyframes scanline { 0% { transform: translateY(0); } 50% { transform: translateY(420px); } 100% { transform: translateY(0); } }`}</style>
    </div>
  );
}

function ReviewPanel({
  image,
  draft,
  onDraftChange,
  onSave,
  onRerun,
  saving,
  rerunning,
}: {
  image: AnswerUploadDoc;
  draft: string;
  onDraftChange: (s: string) => void;
  onSave: (opts?: { approve?: boolean }) => void;
  onRerun: () => void;
  saving: boolean;
  rerunning: boolean;
}) {
  const { status, confidence, reviewStatus, error } = image.ocr;
  const processing = status === "pending" || status === "queued";
  const confPct = confidence ? Math.round(confidence * 100) : null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          OCR: {status}
        </Badge>
        {confPct !== null && (
          <ConfidencePill value={confPct} />
        )}
        {reviewStatus === "approved" && (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        )}
        {reviewStatus === "in_review" && (
          <Badge variant="secondary">Edited</Badge>
        )}
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          <span>{error ?? "OCR failed. Try again."}</span>
        </div>
      )}

      {processing ? (
        <div className="space-y-2">
          <Progress value={45} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Running OCR on this page. You can review other pages while it
            finishes.
          </p>
        </div>
      ) : (
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Extracted text will appear here. Edit any words the OCR misread."
          className="min-h-[280px] font-mono text-sm leading-relaxed"
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRerun}
          disabled={rerunning || processing}
        >
          {rerunning ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
          )}
          Rerun OCR
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave()}
          disabled={saving || processing}
        >
          <Save className="mr-1 h-3.5 w-3.5" /> Save draft
        </Button>
        <Button
          size="sm"
          onClick={() => onSave({ approve: true })}
          disabled={saving || processing}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve page
        </Button>
      </div>
    </Card>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "bg-emerald-500/15 text-emerald-700"
      : value >= 70
        ? "bg-amber-500/15 text-amber-700"
        : "bg-destructive/15 text-destructive";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {value}% confidence
    </span>
  );
}