import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import type { ParentShareDoc, ParentSummary } from "@/types/parentView";

const COLLECTION = "parent_shares";
const SHARE_TTL_MS = 30 * 86_400_000;

function randomToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export async function saveParentShare(
  studentId: string,
  summary: ParentSummary,
): Promise<ParentShareDoc> {
  const token = randomToken();
  const now = new Date();
  const docBody: ParentShareDoc = {
    token,
    studentId,
    summary,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SHARE_TTL_MS).toISOString(),
  };

  await setDoc(doc(db, COLLECTION, token), docBody);
  return docBody;
}

export function buildShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/parent/share/${token}`;
}

export async function loadParentShare(token: string): Promise<ParentShareDoc | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, token));
    if (!snap.exists()) return null;
    const data = snap.data() as ParentShareDoc;
    if (new Date(data.expiresAt).getTime() < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
