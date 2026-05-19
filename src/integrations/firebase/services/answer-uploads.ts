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
    "ocr.updatedAt": Date.now(),
  });
}

export async function triggerEvaluation(imageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ANSWER_UPLOADS, imageId), {
    "evaluation.status": "queued",
    "evaluation.updatedAt": Date.now(),
  });
}