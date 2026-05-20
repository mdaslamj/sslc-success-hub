import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { SessionFeedbackDoc } from "../types";

/** Upsert session feedback. Doc id == sessionId. */
export async function upsertSessionFeedback(f: SessionFeedbackDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SESSION_FEEDBACK, f.id), f, { merge: true });
}