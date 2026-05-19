import { useCallback, useState } from "react";
import {
  attachImageToAttempt,
  createAnswerAttempt,
  finalizeAnswerAttempt,
  recomputeAttemptState,
  runOcrExtraction,
  setAttemptProcessingState,
  uploadAnswerImage,
} from "@/integrations/firebase/services/answer-uploads";
import type {
  AnswerAttemptContext,
  AnswerAttemptDoc,
  AnswerPreprocessing,
  AnswerUploadDoc,
} from "@/integrations/firebase/types";
import { useCurrentUserId } from "./use-current-user";
import { useAuthOptional } from "@/contexts/auth-context";

export type StagedImage = {
  id: string; // local-only id
  blob: Blob;
  width: number;
  height: number;
  preprocessing: AnswerPreprocessing;
  previewUrl: string;
};

export type UploadProgress = {
  total: number;
  done: number;
  error?: string;
};

export function useAnswerUpload(context: AnswerAttemptContext) {
  const userId = useCurrentUserId();
  const auth = useAuthOptional();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ total: 0, done: 0 });

  const submit = useCallback(
    async (
      staged: StagedImage[],
      opts: { notes?: string; queueAi?: boolean } = {},
    ): Promise<{ attempt: AnswerAttemptDoc; uploads: AnswerUploadDoc[] } | null> => {
      if (!auth?.user) {
        setProgress({ total: 0, done: 0, error: "Please sign in to upload answers." });
        return null;
      }
      if (staged.length === 0) return null;
      setBusy(true);
      setProgress({ total: staged.length, done: 0 });
      try {
        const attempt = await createAnswerAttempt({ userId, context, notes: opts.notes });
        const uploads: AnswerUploadDoc[] = [];
        for (let i = 0; i < staged.length; i++) {
          const s = staged[i];
          const up = await uploadAnswerImage({
            userId,
            attemptId: attempt.id,
            blob: s.blob,
            width: s.width,
            height: s.height,
            preprocessing: s.preprocessing,
            order: i,
          });
          await attachImageToAttempt(attempt.id, up.id);
          uploads.push(up);
          setProgress({ total: staged.length, done: i + 1 });
        }
        await finalizeAnswerAttempt(attempt.id, { notes: opts.notes });
        // Kick off OCR for every page. Fire-and-forget so the submit
        // flow returns immediately; the review screen will poll for results.
        if (opts.queueAi !== false) {
          await setAttemptProcessingState(attempt.id, "processing");
          void (async () => {
            for (const up of uploads) {
              await runOcrExtraction(up).catch(() => {});
            }
            await recomputeAttemptState(attempt.id).catch(() => {});
          })();
        } else {
          await setAttemptProcessingState(attempt.id, "uploaded");
        }
        return {
          attempt: {
            ...attempt,
            imageIds: uploads.map((u) => u.id),
            imageCount: uploads.length,
            status: "submitted",
            processingState: opts.queueAi === false ? "uploaded" : "processing",
          },
          uploads,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed.";
        setProgress((p) => ({ ...p, error: msg }));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [auth?.user, context, userId],
  );

  const reset = useCallback(() => setProgress({ total: 0, done: 0 }), []);
  return { busy, progress, submit, reset, signedIn: !!auth?.user };
}