import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import type { ParentShareDoc, ParentSummary } from "@/types/parentView";

const COLLECTION = "parent_shares";
const SHARE_TTL_MS = 30 * 86_400_000;

function randomToken(): string {
  // SECURITY: tokens grant unauthenticated access to a student's parent
  // summary, so they must be unpredictable. Use the Web Crypto CSPRNG
  // (available in browsers, Node 18+, and Cloudflare Workers).
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += alphabet[arr[i] % alphabet.length];
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

/** Public parent view — share via WhatsApp without login. */
export function buildParentViewUrl(studentId: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/parent-view?id=${encodeURIComponent(studentId)}`;
}

export async function loadLatestParentShareForStudent(
  studentId: string,
): Promise<ParentShareDoc | null> {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTION), where("studentId", "==", studentId)),
    );
    const now = Date.now();
    let latest: ParentShareDoc | null = null;
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as ParentShareDoc;
      if (new Date(data.expiresAt).getTime() < now) continue;
      if (!latest || data.createdAt > latest.createdAt) latest = data;
    }
    return latest;
  } catch {
    return null;
  }
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
