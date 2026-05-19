/**
 * Handwritten answer upload service.
 *
 * Responsibilities:
 *  - Upload preprocessed JPEG blobs to Firebase Storage under
 *    `answer-uploads/{userId}/{attemptId}/{imageId}.jpg`.
 *  - Persist `answerUploads` (per-image) and `answerAttempts` (per-session)
 *    Firestore docs, owner-gated by `userId`.
 *  - Expose stub `triggerOcr` / `triggerEvaluation` so future AI pipelines
 *    (OCR via vision LLM, rubric grading via Lovable AI Gateway) can plug in
 *    without changing call sites — they only flip status markers today.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { COLLECTIONS, db, storage } from "../config";
import type {
  AnswerAttemptContext,
  AnswerAttemptDoc,
  AnswerProcessingState,
  AnswerReviewStatus,
  AnswerPreprocessing,
  AnswerUploadDoc,
} from "../types";

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type CreateAttemptInput = {
  userId: string;
  context: AnswerAttemptContext;
  notes?: string;
};

export async function createAnswerAttempt(
  input: CreateAttemptInput,
): Promise<AnswerAttemptDoc> {
  const now = Date.now();
  const id = genId("att");
  const docData: Omit<AnswerAttemptDoc, "id"> = {
    userId: input.userId,
    context: input.context,
    imageIds: [],
    imageCount: 0,
    notes: input.notes,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  const clean: Record<string, unknown> = { ...docData };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  await setDoc(doc(db, COLLECTIONS.ANSWER_ATTEMPTS, id), clean);
  return { id, ...docData };
}

export type UploadImageInput = {
  userId: string;
  attemptId: string;
  blob: Blob;
  width: number;
  height: number;
  preprocessing: AnswerPreprocessing;
  questionId?: string;
  order?: number;
};

/**
 * Upload a single processed JPEG and create its `answerUploads` doc.
 * Caller is responsible for adding the returned id to the attempt's
 * `imageIds` array (use `attachImageToAttempt`).
 */
export async function uploadAnswerImage(
  input: UploadImageInput,
): Promise<AnswerUploadDoc> {
  const id = genId("img");
  const path = `answer-uploads/${input.userId}/${input.attemptId}/${id}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, input.blob, { contentType: "image/jpeg" });
  const downloadUrl = await getDownloadURL(ref);
  const now = Date.now();
  const docData: Omit<AnswerUploadDoc, "id"> = {
    userId: input.userId,
    attemptId: input.attemptId,
    questionId: input.questionId,
    storagePath: path,
    downloadUrl,
    width: input.width,
    height: input.height,
    sizeBytes: input.blob.size,
    mimeType: "image/jpeg",
    preprocessing: input.preprocessing,
    ocr: { status: "pending" },
    evaluation: { status: "pending" },
    order: input.order ?? 0,
    createdAt: now,
  };
  const clean: Record<string, unknown> = { ...docData };
  for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
  await setDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, id), clean);
  return { id, ...docData };
}

export async function attachImageToAttempt(
  attemptId: string,
  imageId: string,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.ANSWER_ATTEMPTS, attemptId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Omit<AnswerAttemptDoc, "id">;
  const imageIds = Array.from(new Set([...(data.imageIds ?? []), imageId]));
  await updateDoc(ref, {
    imageIds,
    imageCount: imageIds.length,
    updatedAt: Date.now(),
  });
}

export async function finalizeAnswerAttempt(
  attemptId: string,
  patch: { notes?: string } = {},
): Promise<void> {
  const now = Date.now();
  const update: Record<string, unknown> = {
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
  };
  if (patch.notes !== undefined) update.notes = patch.notes;
  await updateDoc(doc(db, COLLECTIONS.ANSWER_ATTEMPTS, attemptId), update);
}

export async function fetchUserAnswerAttempts(
  userId: string,
  limit = 50,
): Promise<AnswerAttemptDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.ANSWER_ATTEMPTS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AnswerAttemptDoc, "id">),
  }));
}

export async function fetchAttemptImages(
  attemptId: string,
): Promise<AnswerUploadDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.ANSWER_UPLOADS),
    where("attemptId", "==", attemptId),
    orderBy("order", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AnswerUploadDoc, "id">),
  }));
}

export async function deleteAnswerImage(image: AnswerUploadDoc): Promise<void> {
  try {
    await deleteObject(storageRef(storage, image.storagePath));
  } catch {
    /* ignore storage delete failure — doc cleanup still proceeds */
  }
  await deleteDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, image.id));
}

export async function deleteAnswerAttempt(
  attempt: AnswerAttemptDoc,
): Promise<void> {
  const images = await fetchAttemptImages(attempt.id);
  await Promise.all(images.map(deleteAnswerImage));
  await deleteDoc(doc(db, COLLECTIONS.ANSWER_ATTEMPTS, attempt.id));
}

// ---------------------------------------------------------------------------
// AI pipeline stubs — wired later to Lovable AI Gateway (vision models).
// They only flip status markers today so the UI can render "queued" badges
// without the rest of the system needing to change.
// ---------------------------------------------------------------------------

export async function triggerOcr(imageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "ocr.status": "queued",
    "ocr.reviewStatus": "pending",
    "ocr.updatedAt": Date.now(),
  });
}

export async function triggerEvaluation(imageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "evaluation.status": "queued",
    "evaluation.updatedAt": Date.now(),
  });
}

// ---------------------------------------------------------------------------
// OCR review workflow
//
// Today these helpers drive a simulated extraction pipeline so the review UI
// is fully exercised. The shape is wire-compatible with a real vision-LLM
// pipeline (Lovable AI Gateway / gemini-2.5-flash) — only `runOcrExtraction`
// changes when real OCR is plugged in.
// ---------------------------------------------------------------------------

export async function setAttemptProcessingState(
  attemptId: string,
  state: AnswerProcessingState,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_ATTEMPTS, attemptId), {
    processingState: state,
    updatedAt: Date.now(),
  });
}

export async function markOcrProcessing(imageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "ocr.status": "queued",
    "ocr.reviewStatus": "pending",
    "ocr.updatedAt": Date.now(),
  });
}

export type OcrResultInput = {
  extractedText: string;
  confidence: number; // 0..1
  language?: string;
  words?: { text: string; confidence: number }[];
};

export async function saveOcrResult(
  imageId: string,
  result: OcrResultInput,
): Promise<void> {
  const update: Record<string, unknown> = {
    "ocr.status": "done",
    "ocr.extractedText": result.extractedText,
    "ocr.confidence": result.confidence,
    "ocr.reviewStatus": "pending",
    "ocr.updatedAt": Date.now(),
  };
  if (result.language) update["ocr.language"] = result.language;
  if (result.words) update["ocr.words"] = result.words;
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), update);
}

export async function saveOcrError(
  imageId: string,
  message: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "ocr.status": "error",
    "ocr.error": message,
    "ocr.updatedAt": Date.now(),
  });
}

export async function saveCorrectedText(
  imageId: string,
  correctedText: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "ocr.correctedText": correctedText,
    "ocr.reviewStatus": "in_review",
    "ocr.updatedAt": Date.now(),
  });
}

export async function setImageReviewStatus(
  imageId: string,
  reviewStatus: AnswerReviewStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "ocr.reviewStatus": reviewStatus,
    "ocr.updatedAt": Date.now(),
  });
}

/**
 * Simulated OCR extraction — produces deterministic-ish placeholder text
 * with a believable confidence score. Architected so the call site does not
 * change when this is swapped for a real vision-LLM call.
 */
export async function runOcrExtraction(
  image: AnswerUploadDoc,
): Promise<void> {
  try {
    await markOcrProcessing(image.id);
    // Small artificial delay so the scanning animation is visible.
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    const confidence = 0.72 + Math.random() * 0.23; // 0.72..0.95
    const extractedText = buildPlaceholderExtraction(image, confidence);
    await saveOcrResult(image.id, {
      extractedText,
      confidence,
      language: "en",
    });
  } catch (e) {
    await saveOcrError(image.id, e instanceof Error ? e.message : "OCR failed");
  }
}

function buildPlaceholderExtraction(
  image: AnswerUploadDoc,
  confidence: number,
): string {
  const conf = Math.round(confidence * 100);
  return [
    `[OCR draft — ${conf}% confidence]`,
    ``,
    `Page ${image.order + 1} of your handwritten answer was scanned.`,
    `Review the text below and edit any words the OCR misread before`,
    `submitting for AI evaluation.`,
    ``,
    `(Replace this draft with your actual answer text — your edits are`,
    `saved as the corrected version used for grading.)`,
  ].join("\n");
}

/**
 * Recompute aggregate processing state for an attempt based on its images.
 * Call after OCR finishes or after the user approves a page.
 */
export async function recomputeAttemptState(
  attemptId: string,
): Promise<AnswerProcessingState> {
  const images = await fetchAttemptImages(attemptId);
  let next: AnswerProcessingState = "uploaded";
  if (images.length === 0) {
    next = "uploaded";
  } else if (images.some((i) => i.ocr.status === "queued" || i.ocr.status === "pending")) {
    next = "processing";
  } else if (images.every((i) => i.ocr.reviewStatus === "approved")) {
    next = "ready_for_evaluation";
  } else {
    next = "review_required";
  }
  await setAttemptProcessingState(attemptId, next);
  return next;
}

export async function fetchAttempt(
  attemptId: string,
): Promise<AnswerAttemptDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ANSWER_ATTEMPTS, attemptId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<AnswerAttemptDoc, "id">) };
}