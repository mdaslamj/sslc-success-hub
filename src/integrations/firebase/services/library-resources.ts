import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../config";
import type {
  LibraryCategory,
  LibraryCategoryDoc,
  LibraryLanguage,
  LibraryResourceDoc,
} from "../types";

export type LibraryFilter = {
  category?: LibraryCategory;
  subjectId?: string;
  chapterId?: string;
  language?: LibraryLanguage;
  featured?: boolean;
  year?: number;
};

/**
 * Fetch library resources. All filters are optional and applied server-side
 * when possible; the result is sorted by featured-first, then most recent.
 */
export async function fetchLibraryResources(
  filter: LibraryFilter = {},
): Promise<LibraryResourceDoc[]> {
  const constraints: QueryConstraint[] = [];
  if (filter.category) constraints.push(where("category", "==", filter.category));
  if (filter.subjectId) constraints.push(where("subjectId", "==", filter.subjectId));
  if (filter.chapterId) constraints.push(where("chapterId", "==", filter.chapterId));
  if (filter.language) constraints.push(where("language", "==", filter.language));
  if (filter.featured !== undefined)
    constraints.push(where("isFeatured", "==", filter.featured));
  if (filter.year !== undefined) constraints.push(where("year", "==", filter.year));

  const ref = collection(db, COLLECTIONS.LIBRARY_RESOURCES);
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<LibraryResourceDoc, "id">),
  }));
  return rows.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });
}

export async function fetchFeaturedLibraryResources(
  limit = 8,
): Promise<LibraryResourceDoc[]> {
  const rows = await fetchLibraryResources({ featured: true });
  return rows.slice(0, limit);
}

export async function fetchLibraryCategories(): Promise<LibraryCategoryDoc[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.LIBRARY_CATEGORIES));
  const rows = snap.docs.map((d) => ({
    id: d.id as LibraryCategory,
    ...(d.data() as Omit<LibraryCategoryDoc, "id">),
  }));
  return rows.sort((a, b) => a.order - b.order);
}

export async function upsertLibraryResource(
  r: Omit<LibraryResourceDoc, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<void> {
  const now = Date.now();
  const payload: Omit<LibraryResourceDoc, "id"> = {
    title: r.title,
    titleKn: r.titleKn,
    description: r.description,
    descriptionKn: r.descriptionKn,
    category: r.category,
    resourceType: r.resourceType,
    subjectId: r.subjectId,
    chapterId: r.chapterId,
    url: r.url,
    pdfPath: r.pdfPath,
    thumbnailUrl: r.thumbnailUrl,
    icon: r.icon,
    language: r.language,
    tags: r.tags ?? [],
    isFeatured: r.isFeatured ?? false,
    isOfficial: r.isOfficial ?? false,
    year: r.year,
    views: r.views ?? 0,
    createdAt: r.createdAt ?? now,
    updatedAt: r.updatedAt ?? now,
    createdBy: r.createdBy,
  };
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) if (v !== undefined) clean[k] = v;
  await setDoc(doc(db, COLLECTIONS.LIBRARY_RESOURCES, r.id), clean, { merge: true });
}

export async function bulkUpsertLibraryResources(
  resources: LibraryResourceDoc[],
): Promise<number> {
  const chunkSize = 450;
  const now = Date.now();
  for (let i = 0; i < resources.length; i += chunkSize) {
    const batch = writeBatch(db);
    for (const r of resources.slice(i, i + chunkSize)) {
      const ref = doc(db, COLLECTIONS.LIBRARY_RESOURCES, r.id);
      const data: Record<string, unknown> = {
        ...r,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
      };
      for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
      batch.set(ref, data, { merge: true });
    }
    await batch.commit();
  }
  return resources.length;
}

export async function upsertLibraryCategory(
  c: LibraryCategoryDoc,
): Promise<void> {
  const { id, ...rest } = c;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) if (v !== undefined) clean[k] = v;
  await setDoc(doc(db, COLLECTIONS.LIBRARY_CATEGORIES, id), clean, { merge: true });
}

export async function bulkUpsertLibraryCategories(
  categories: LibraryCategoryDoc[],
): Promise<number> {
  const batch = writeBatch(db);
  for (const c of categories) {
    const { id, ...rest } = c;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) clean[k] = v;
    batch.set(doc(db, COLLECTIONS.LIBRARY_CATEGORIES, id), clean, { merge: true });
  }
  await batch.commit();
  return categories.length;
}

/** Best-effort popularity counter — failures swallowed to never block UX. */
export async function incrementLibraryResourceViews(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.LIBRARY_RESOURCES, id), {
      views: increment(1),
    });
  } catch {
    /* ignore — rules may block anon writes */
  }
}

export async function fetchLibraryResource(
  id: string,
): Promise<LibraryResourceDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.LIBRARY_RESOURCES, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<LibraryResourceDoc, "id">) };
}
