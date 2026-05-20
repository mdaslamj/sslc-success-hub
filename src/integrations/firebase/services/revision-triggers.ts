import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type { RevisionTriggerDoc } from "../types";

/** Append a revision-trigger audit row. */
export async function logRevisionTrigger(
  input: Omit<RevisionTriggerDoc, "id">,
): Promise<RevisionTriggerDoc> {
  const ref = await addDoc(collection(db, COLLECTIONS.REVISION_TRIGGERS), input);
  return { id: ref.id, ...input };
}