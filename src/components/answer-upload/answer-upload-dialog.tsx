import { useCallback, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAnswerUpload, type StagedImage } from "@/hooks/use-answer-upload";
import {
  AUTO_ENHANCE,
  DEFAULT_PREPROCESSING,
  fileToDataUrl,
  preprocessImage,
  type PreprocessOptions,
} from "@/lib/image-preprocess";
import type { AnswerAttemptContext } from "@/integrations/firebase/types";
import { cn } from "@/lib/utils";

type Draft = {
  id: string;
  sourceDataUrl: string;
  options: PreprocessOptions;
  staged: StagedImage | null;
  processing: boolean;
};

let DRAFT_SEQ = 0;

export type AnswerUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AnswerAttemptContext;
  onSubmitted?: (attemptId: string) => void;
};

export function AnswerUploadDialog({
  open,
  onOpenChange,
  context,
  onSubmitted,
}: AnswerUploadDialogProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { busy, progress, submit, signedIn } = useAnswerUpload(context);

  const active = useMemo(
    () => drafts.find((d) => d.id === activeId) ?? null,
    [drafts, activeId],
  );

  const reprocess = useCallback(
    async (id: string, options: PreprocessOptions) => {
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, options, processing: true } : d)),
      );
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      try {
        const result = await preprocessImage(draft.sourceDataUrl, options);
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  processing: false,
                  staged: {
                    id,
                    blob: result.blob,
                    width: result.width,
                    height: result.height,
                    previewUrl: result.dataUrl,
                    preprocessing: {
                      rotation: options.rotation,
                      brightness: options.brightness,
                      contrast: options.contrast,
                      cropped: false,
                      autoEnhanced:
                        options.brightness !== 1 || options.contrast !== 1,
                    },
                  },
                }
              : d,
          ),
        );
      } catch {
        setDrafts((prev) =>
          prev.map((d) => (d.id === id ? { ...d, processing: false } : d)),
        );
        toast.error("Couldn't process image");
      }
    },
    [drafts],
  );

  const ingestFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files).slice(0, 10);
      for (const file of arr) {
        const id = `d_${++DRAFT_SEQ}_${Date.now()}`;
        try {
          const dataUrl = await fileToDataUrl(file);
          const draft: Draft = {
            id,
            sourceDataUrl: dataUrl,
            options: { ...DEFAULT_PREPROCESSING },
            staged: null,
            processing: true,
          };
          setDrafts((prev) => [...prev, draft]);
          setActiveId(id);
          // Process initial.
          const result = await preprocessImage(dataUrl, DEFAULT_PREPROCESSING);
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    processing: false,
                    staged: {
                      id,
                      blob: result.blob,
                      width: result.width,
                      height: result.height,
                      previewUrl: result.dataUrl,
                      preprocessing: {
                        rotation: 0,
                        brightness: 1,
                        contrast: 1,
                        cropped: false,
                        autoEnhanced: false,
                      },
                    },
                  }
                : d,
            ),
          );
        } catch {
          toast.error("Couldn't read image");
        }
      }
    },
    [],
  );

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const onSubmit = async () => {
    const staged = drafts.map((d) => d.staged).filter((s): s is StagedImage => !!s);
    if (staged.length === 0) {
      toast.error("Add at least one image");
      return;
    }
    if (!signedIn) {
      toast.error("Sign in to upload your answers");
      return;
    }
    const result = await submit(staged, { notes: notes.trim() || undefined });
    if (result) {
      toast.success(`Uploaded ${result.uploads.length} page${result.uploads.length === 1 ? "" : "s"}`);
      onSubmitted?.(result.attempt.id);
      setDrafts([]);
      setNotes("");
      setActiveId(null);
      onOpenChange(false);
    } else {
      toast.error(progress.error || "Upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Handwritten Answers
          </DialogTitle>
          <DialogDescription>
            Snap or upload photos of your written answers. We'll save them for review
            and (soon) AI evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-20 flex-col gap-1"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Camera</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-1"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs">From Gallery</span>
          </Button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void ingestFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void ingestFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {drafts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {drafts.length} page{drafts.length === 1 ? "" : "s"}
              </span>
              <Badge variant="secondary">{context.type}</Badge>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {drafts.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveId(d.id)}
                  className={cn(
                    "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-muted",
                    activeId === d.id ? "border-primary" : "border-transparent",
                  )}
                >
                  {d.staged?.previewUrl ? (
                    <img
                      src={d.staged.previewUrl}
                      alt={`Page ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white">
                    {i + 1}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDraft(d.id);
                    }}
                    className="absolute right-0 top-0 rounded-bl bg-black/70 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>

            {active && (
              <EditorPanel
                draft={active}
                onChange={(opts) => reprocess(active.id, opts)}
              />
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Q3 attempted partially, ran out of time"
            rows={2}
            className="mt-1"
          />
        </div>

        {busy && (
          <div className="text-xs text-muted-foreground">
            Uploading {progress.done}/{progress.total}…
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy || drafts.length === 0}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Submit {drafts.length || ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorPanel({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (opts: PreprocessOptions) => void;
}) {
  const opts = draft.options;

  const update = (patch: Partial<PreprocessOptions>) =>
    onChange({ ...opts, ...patch });

  const rotate = () => {
    const order: PreprocessOptions["rotation"][] = [0, 90, 180, 270];
    const next = order[(order.indexOf(opts.rotation) + 1) % 4];
    update({ rotation: next });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <div className="relative max-h-72 overflow-hidden rounded-lg bg-background">
        {draft.staged?.previewUrl ? (
          <img
            src={draft.staged.previewUrl}
            alt="Preview"
            className="mx-auto max-h-72 object-contain"
          />
        ) : (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={rotate}>
          <RefreshCw className="mr-1 h-3 w-3" /> Rotate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => update({ ...AUTO_ENHANCE })}
        >
          <Sparkles className="mr-1 h-3 w-3" /> Auto-enhance
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => update({ brightness: 1, contrast: 1, rotation: 0 })}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Reset
        </Button>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <div className="flex justify-between">
            <span>Brightness</span>
            <span>{opts.brightness.toFixed(2)}×</span>
          </div>
          <Slider
            value={[opts.brightness * 100]}
            min={50}
            max={150}
            step={5}
            onValueChange={([v]) => update({ brightness: v / 100 })}
          />
        </div>
        <div>
          <div className="flex justify-between">
            <span>Contrast</span>
            <span>{opts.contrast.toFixed(2)}×</span>
          </div>
          <Slider
            value={[opts.contrast * 100]}
            min={50}
            max={150}
            step={5}
            onValueChange={([v]) => update({ contrast: v / 100 })}
          />
        </div>
      </div>
    </div>
  );
}