import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { SessionResultDoc } from "../types";

/** Upsert a session result. Doc id == sessionId (one-to-one with studySessions). */
export async function upsertSessionResult(r: SessionResultDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SESSION_RESULTS, r.id), r, { merge: true });
}