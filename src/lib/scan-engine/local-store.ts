import type {
  ScanDoc,
  SolvedQuestionDoc,
  SolveMode,
} from "@/integrations/firebase/types";

const SCAN_KEY = "aura.scan.scans.v1";
const SOLVED_KEY = "aura.scan.solved.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export const localScans = {
  list(userId: string): ScanDoc[] {
    return read<ScanDoc>(SCAN_KEY)
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  get(id: string): ScanDoc | null {
    return read<ScanDoc>(SCAN_KEY).find((s) => s.id === id) ?? null;
  },
  upsert(scan: ScanDoc) {
    const all = read<ScanDoc>(SCAN_KEY).filter((s) => s.id !== scan.id);
    all.unshift(scan);
    write(SCAN_KEY, all);
  },
  patch(id: string, patch: Partial<ScanDoc>) {
    const all = read<ScanDoc>(SCAN_KEY);
    const next = all.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
    );
    write(SCAN_KEY, next);
  },
};

export const localSolved = {
  list(userId: string, scanId: string): SolvedQuestionDoc[] {
    return read<SolvedQuestionDoc>(SOLVED_KEY).filter(
      (s) => s.userId === userId && s.scanId === scanId,
    );
  },
  get(
    userId: string,
    scanId: string,
    mode: SolveMode,
    language: "en" | "kn",
  ): SolvedQuestionDoc | null {
    return (
      read<SolvedQuestionDoc>(SOLVED_KEY).find(
        (s) =>
          s.userId === userId &&
          s.scanId === scanId &&
          s.mode === mode &&
          s.language === language,
      ) ?? null
    );
  },
  upsert(item: SolvedQuestionDoc) {
    const all = read<SolvedQuestionDoc>(SOLVED_KEY).filter(
      (s) => s.id !== item.id,
    );
    all.unshift(item);
    write(SOLVED_KEY, all);
  },
};