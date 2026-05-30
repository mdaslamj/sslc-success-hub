import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Plus, X } from "lucide-react";
import { checkImageQuality, preprocessPages, type ImageQualityCheck } from "@/lib/imagePreprocessor";
import ImageQualityGuide from "./ImageQualityGuide";
import { cn } from "@/lib/utils";

type ExamType = "chapter" | "sa1" | "sa2" | "preparatory" | "board";

type Props = {
  subjectId: string;
  examType: ExamType;
  onPagesReady: (pages: File[]) => void;
  onCancel: () => void;
};

type ScreenState = "instructions" | "capture" | "processing";

const EXAM_LABELS: Record<ExamType, string> = {
  chapter: "Chapter Test",
  sa1: "SA1",
  sa2: "SA2",
  preparatory: "Preparatory",
  board: "Board Exam",
};

const SUBJECT_LABELS: Record<string, string> = {
  science: "Science",
  math: "Mathematics",
  social: "Social Science",
  english: "English",
  kannada: "Kannada",
  hindi: "Hindi",
};

function qualityLevel(check: ImageQualityCheck): "good" | "acceptable" | "poor" {
  if (check.score >= 80) return "good";
  if (check.score >= 50) return "acceptable";
  return "poor";
}

export default function AnswerUploader({ subjectId, examType, onPagesReady, onCancel }: Props) {
  const [state, setState] = useState<ScreenState>("instructions");
  const [pages, setPages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [qualities, setQualities] = useState<ImageQualityCheck[]>([]);
  const [processingPage, setProcessingPage] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviews((prev) => [...prev, url]);
    setPages((prev) => [...prev, file]);

    const quality = await checkImageQuality(file);
    setQualities((prev) => [...prev, quality]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removePage = useCallback(
    (index: number) => {
      setPages((prev) => prev.filter((_, i) => i !== index));
      setPreviews((prev) => {
        const url = prev[index];
        if (url) URL.revokeObjectURL(url);
        return prev.filter((_, i) => i !== index);
      });
      setQualities((prev) => prev.filter((_, i) => i !== index));
    },
    [],
  );

  const handleSubmit = async () => {
    if (pages.length === 0) return;
    setState("processing");
    setProcessingPage(0);
    setProcessProgress(0);

    const processed = await preprocessPages(pages, (current, total) => {
      setProcessingPage(current);
      setProcessProgress(Math.round((current / total) * 100));
    });

    onPagesReady(processed.map((result) => result.processedFile));
  };

  const shellStyle = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: "#08080E",
  } as const;

  if (state === "instructions") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6" style={shellStyle}>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">Upload your answer script</h1>
          <p className="text-sm text-white/65">Photograph each page clearly</p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-white/[0.06] bg-[#0F0F18] px-3 py-1 text-xs font-medium text-[#8B5CF6]">
            {SUBJECT_LABELS[subjectId] ?? subjectId}
          </span>
          <span className="rounded-full border border-white/[0.06] bg-[#0F0F18] px-3 py-1 text-xs font-medium text-white/80">
            {EXAM_LABELS[examType]}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {[
            { icon: "📱", text: "Hold phone steady above the page" },
            { icon: "💡", text: "Good lighting — avoid shadows" },
            { icon: "📄", text: "Capture the full page including edges" },
          ].map((tile) => (
            <div
              key={tile.text}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0F0F18] px-4 py-3.5 text-sm text-white/85"
            >
              <span className="text-xl" aria-hidden>
                {tile.icon}
              </span>
              <span>{tile.text}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-8 w-full rounded-2xl bg-[#8B5CF6] py-4 text-base font-semibold text-white active:scale-[0.99]"
          onClick={() => setState("capture")}
        >
          Start uploading pages
        </button>
        <button
          type="button"
          className="mt-3 w-full py-2 text-sm text-white/50 underline-offset-2 hover:underline"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div
        className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 py-10 text-center"
        style={shellStyle}
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#8B5CF6]" aria-hidden />
        <p className="mt-5 text-lg font-semibold text-white">
          Processing page {processingPage} of {pages.length}…
        </p>
        <p className="mt-2 text-sm text-white/60">Please wait — do not close this screen.</p>
        <div className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#8B5CF6] transition-all duration-300"
            style={{ width: `${processProgress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5 pb-28" style={shellStyle}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/55">Answer pages</p>
          <p className="text-lg font-semibold text-white">
            Page {pages.length + 1} of {pages.length > 0 ? `${pages.length}+` : "?"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Add page"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-[#0F0F18] text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        className="mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#8B5CF6]/50 bg-[#0F0F18] py-10 active:bg-[#8B5CF6]/10"
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6]">
          <Camera className="h-7 w-7" />
        </span>
        <span className="text-base font-semibold text-white">Tap to photograph page</span>
        <span className="text-xs text-white/60">Opens your phone camera</span>
      </button>

      {previews.length > 0 ? (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {previews.map((preview, index) => {
            const q = qualities[index];
            const level = q ? qualityLevel(q) : "acceptable";
            return (
              <div
                key={`${preview}-${index}`}
                className="relative shrink-0"
                style={{ width: 60, height: 80 }}
              >
                <img
                  src={preview}
                  alt={`Page ${index + 1}`}
                  className="h-full w-full rounded-lg border border-white/[0.06] object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/70 py-0.5 text-center text-[10px] text-white">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    level === "good" && "bg-[#4ADE80] text-black",
                    level === "acceptable" && "bg-amber-400 text-black",
                    level === "poor" && "bg-red-500 text-white",
                  )}
                  title={q?.warnings.join(" · ")}
                >
                  {level === "good" ? <Check className="h-3 w-3" /> : level === "acceptable" ? "!" : "✗"}
                </span>
                <button
                  type="button"
                  aria-label={`Remove page ${index + 1}`}
                  className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-black"
                  onClick={() => removePage(index)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-5">
        <ImageQualityGuide compact />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#08080E]/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-2xl border border-white/[0.06] bg-[#0F0F18] py-3.5 text-sm font-semibold text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            Add another page
          </button>
          <button
            type="button"
            disabled={pages.length === 0}
            className="w-full rounded-2xl bg-[#8B5CF6] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            onClick={handleSubmit}
          >
            I&apos;m done — evaluate {pages.length} page{pages.length === 1 ? "" : "s"}
          </button>
          <button type="button" className="py-1 text-xs text-white/45" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
