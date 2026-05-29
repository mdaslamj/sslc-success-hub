import { db } from "@/integrations/firebase/config";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import type { MarkScheme } from "@/types/markScheme";

const COLLECTION = "mark_schemes";

export async function getMarkScheme(paperId: string): Promise<MarkScheme | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, paperId));
    return snap.exists() ? (snap.data() as MarkScheme) : null;
  } catch {
    return null;
  }
}

export async function getMarkSchemesBySubject(subjectId: string): Promise<MarkScheme[]> {
  try {
    const q = query(collection(db, COLLECTION), where("subject", "==", subjectId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MarkScheme);
  } catch {
    return [];
  }
}

export async function saveMarkScheme(scheme: MarkScheme): Promise<void> {
  await setDoc(doc(db, COLLECTION, scheme.id), scheme);
}

export async function listAllMarkSchemes(): Promise<MarkScheme[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => d.data() as MarkScheme);
  } catch {
    return [];
  }
}
