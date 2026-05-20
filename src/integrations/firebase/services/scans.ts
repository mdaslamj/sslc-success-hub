import {
  collection,
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
import { COLLECTIONS, db } from "../config";
import type { ScanDoc, ScanUnderstanding } from "../types";

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as T;
}

export async function createScan(scan: ScanDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SCANS, scan.id), clean({ ...scan }));
}

export async function patchScan(
  id: string,
  patch: Partial<Omit<ScanDoc, "id" | "userId">>,
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTIONS.SCANS, id),
    clean({ ...patch, updatedAt: Date.now() }),
  );
}

export async function setScanUnderstanding(
  id: string,
  understanding: ScanUnderstanding,
): Promise<void> {
  await patchScan(id, { understanding, status: "ready" });
}

export async function fetchScan(id: string): Promise<ScanDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.SCANS, id));
  return snap.exists() ? (snap.data() as ScanDoc) : null;
}

export async function fetchUserScans(
  userId: string,
  limit = 30,
): Promise<ScanDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.SCANS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ScanDoc);
}