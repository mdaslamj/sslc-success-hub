/**
 * Guest-mode mirror of the learning memory subcollections. Mirrors the
 * shape of the Firestore docs so the hook layer can swap stores without
 * branching call sites.
 */

import type {
  ConceptConfidenceDoc,
  LearningProfileDoc,
  LearningTimelineDoc,
  MistakeMemoryDoc,
  ScanHistoryDoc,
  TutoringPreferencesDoc,
} from "@/integrations/firebase/types";

const NS = "aura.learning-memory.v1";

type Bag = {
  profile?: LearningProfileDoc;
  preferences?: TutoringPreferencesDoc;
  mistakes: Record<string, MistakeMemoryDoc>;
  timeline: LearningTimelineDoc[];
  scanHistory: Record<string, ScanHistoryDoc>;
  concepts: Record<string, ConceptConfidenceDoc>;
};

function safeRead(): Record<string, Bag> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NS) || "{}") as Record<string, Bag>;
  } catch {
    return {};
  }
}

function safeWrite(all: Record<string, Bag>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NS, JSON.stringify(all));
  } catch {
    /* quota — ignore */
  }
}

function bag(uid: string): Bag {
  const all = safeRead();
  if (!all[uid]) {
    all[uid] = { mistakes: {}, timeline: [], scanHistory: {}, concepts: {} };
    safeWrite(all);
  }
  return all[uid];
}

function commit(uid: string, b: Bag): void {
  const all = safeRead();
  all[uid] = b;
  safeWrite(all);
}

export const localLearningMemory = {
  // profile
  getProfile(uid: string): LearningProfileDoc | null {
    return bag(uid).profile ?? null;
  },
  setProfile(profile: LearningProfileDoc): void {
    const b = bag(profile.userId);
    b.profile = profile;
    commit(profile.userId, b);
  },

  // preferences
  getPreferences(uid: string): TutoringPreferencesDoc | null {
    return bag(uid).preferences ?? null;
  },
  setPreferences(prefs: TutoringPreferencesDoc): void {
    const b = bag(prefs.userId);
    b.preferences = prefs;
    commit(prefs.userId, b);
  },

  // mistakes
  getMistake(uid: string, id: string): MistakeMemoryDoc | null {
    return bag(uid).mistakes[id] ?? null;
  },
  listMistakes(uid: string): MistakeMemoryDoc[] {
    return Object.values(bag(uid).mistakes).sort(
      (a, b) => b.lastSeenAt - a.lastSeenAt,
    );
  },
  upsertMistake(m: MistakeMemoryDoc): void {
    const b = bag(m.userId);
    b.mistakes[m.id] = m;
    commit(m.userId, b);
  },

  // timeline
  appendTimeline(e: LearningTimelineDoc): void {
    const b = bag(e.userId);
    b.timeline = [e, ...b.timeline].slice(0, 200);
    commit(e.userId, b);
  },
  listTimeline(uid: string, limit = 30): LearningTimelineDoc[] {
    return bag(uid).timeline.slice(0, limit);
  },

  // scan history
  upsertScanHistory(h: ScanHistoryDoc): void {
    const b = bag(h.userId);
    b.scanHistory[h.id] = h;
    commit(h.userId, b);
  },
  listScanHistory(uid: string, limit = 30): ScanHistoryDoc[] {
    return Object.values(bag(uid).scanHistory)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // concepts
  getConcept(uid: string, key: string): ConceptConfidenceDoc | null {
    return bag(uid).concepts[key] ?? null;
  },
  listConcepts(uid: string): ConceptConfidenceDoc[] {
    return Object.values(bag(uid).concepts).sort(
      (a, b) => b.lastSeenAt - a.lastSeenAt,
    );
  },
  upsertConcept(c: ConceptConfidenceDoc): void {
    const b = bag(c.userId);
    b.concepts[c.id] = c;
    commit(c.userId, b);
  },
};