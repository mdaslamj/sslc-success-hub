/**
 * Learning memory hook — loads the user's profile, preferences, mistakes,
 * concepts and recent scan history (Firestore for signed-in users, local
 * mirror for guests) and exposes mutation helpers that automatically write
 * to the right store and append timeline events.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  appendLearningTimeline,
  fetchAllConceptConfidence,
  fetchAllMistakeMemory,
  fetchLearningProfile,
  fetchScanHistory,
  fetchTutoringPreferences,
  saveConceptConfidence,
  saveMistakeMemory,
  upsertLearningProfile,
  upsertScanHistory,
  upsertTutoringPreferences,
} from "@/integrations/firebase/services";
import type {
  ConceptConfidenceDoc,
  LearningProfileDoc,
  LearningTimelineDoc,
  LearningTimelineKind,
  MistakeMemoryDoc,
  ScanDoc,
  ScanHistoryDoc,
  SolvedQuestionDoc,
  TutoringPreferencesDoc,
} from "@/integrations/firebase/types";
import {
  applyConfidenceDelta,
  applyInteraction,
  buildContinuityHints,
  buildTutoringGrounding,
  conceptKeyFromLabel,
  defaultLearningProfile,
  defaultTutoringPreferences,
  detectMistakePatterns,
  localLearningMemory,
  mergeMistake,
  mistakeId,
} from "@/lib/learning-memory";

export type LearningMemorySnapshot = {
  profile: LearningProfileDoc | null;
  preferences: TutoringPreferencesDoc | null;
  mistakes: MistakeMemoryDoc[];
  concepts: ConceptConfidenceDoc[];
  history: ScanHistoryDoc[];
};

const EMPTY: LearningMemorySnapshot = {
  profile: null,
  preferences: null,
  mistakes: [],
  concepts: [],
  history: [],
};

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useLearningMemory() {
  const userId = useCurrentUserId();
  const authCtx = useAuthOptional();
  const signedIn = !!authCtx?.user;
  const [snap, setSnap] = useState<LearningMemorySnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  // --- load --------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (signedIn) {
          const [profile, preferences, mistakes, concepts, history] =
            await Promise.all([
              fetchLearningProfile(userId),
              fetchTutoringPreferences(userId),
              fetchAllMistakeMemory(userId),
              fetchAllConceptConfidence(userId),
              fetchScanHistory(userId),
            ]);
          if (!cancelled) {
            setSnap({ profile, preferences, mistakes, concepts, history });
          }
        } else {
          const next: LearningMemorySnapshot = {
            profile: localLearningMemory.getProfile(userId),
            preferences: localLearningMemory.getPreferences(userId),
            mistakes: localLearningMemory.listMistakes(userId),
            concepts: localLearningMemory.listConcepts(userId),
            history: localLearningMemory.listScanHistory(userId),
          };
          if (!cancelled) setSnap(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [signedIn, userId]);

  // --- low-level writes --------------------------------------------------
  const persistTimeline = useCallback(
    async (
      kind: LearningTimelineKind,
      summary: string,
      extra: Partial<LearningTimelineDoc> = {},
    ) => {
      const evt: LearningTimelineDoc = {
        id: genId("tl"),
        userId,
        kind,
        summary,
        createdAt: Date.now(),
        ...extra,
      };
      if (signedIn) {
        await appendLearningTimeline(evt);
      } else {
        localLearningMemory.appendTimeline(evt);
      }
    },
    [signedIn, userId],
  );

  const saveProfile = useCallback(
    async (next: LearningProfileDoc) => {
      if (signedIn) await upsertLearningProfile(next);
      else localLearningMemory.setProfile(next);
      setSnap((s) => ({ ...s, profile: next }));
    },
    [signedIn],
  );

  const savePreferences = useCallback(
    async (next: TutoringPreferencesDoc) => {
      if (signedIn) await upsertTutoringPreferences(next);
      else localLearningMemory.setPreferences(next);
      setSnap((s) => ({ ...s, preferences: next }));
      await persistTimeline("preference_changed", "Tutoring preferences updated");
    },
    [persistTimeline, signedIn],
  );

  // --- public mutations --------------------------------------------------
  const updatePreferences = useCallback(
    async (patch: Partial<Omit<TutoringPreferencesDoc, "id" | "userId">>) => {
      const base = snap.preferences ?? defaultTutoringPreferences(userId);
      const next: TutoringPreferencesDoc = {
        ...base,
        ...patch,
        id: "preferences",
        userId,
        updatedAt: Date.now(),
      };
      await savePreferences(next);
      return next;
    },
    [savePreferences, snap.preferences, userId],
  );

  const ensureProfile = useCallback((): LearningProfileDoc => {
    return snap.profile ?? defaultLearningProfile(userId);
  }, [snap.profile, userId]);

  /** Update confidence for a single concept (creates if missing). */
  const recordConceptSignal = useCallback(
    async (input: {
      conceptLabel: string;
      delta: number; // -100..+100
      success: boolean;
      subjectId?: string;
      chapterId?: string;
    }) => {
      const key = conceptKeyFromLabel(input.conceptLabel);
      const existing = snap.concepts.find((c) => c.id === key) ?? null;
      const next = applyConfidenceDelta(existing, { ...input, userId });
      if (signedIn) await saveConceptConfidence(next);
      else localLearningMemory.upsertConcept(next);
      setSnap((s) => ({
        ...s,
        concepts: [next, ...s.concepts.filter((c) => c.id !== next.id)],
      }));
      if (next.chronicWeak && (!existing || !existing.chronicWeak)) {
        await persistTimeline(
          "weakness_detected",
          `${next.conceptLabel} flagged as chronic weak`,
          { conceptKey: next.conceptKey, chapterId: next.chapterId },
        );
      } else if (input.delta >= 15) {
        await persistTimeline(
          "confidence_rise",
          `${next.conceptLabel} confidence +${Math.round(input.delta)}`,
          { conceptKey: next.conceptKey, chapterId: next.chapterId },
        );
      } else if (input.delta <= -15) {
        await persistTimeline(
          "confidence_drop",
          `${next.conceptLabel} confidence ${Math.round(input.delta)}`,
          { conceptKey: next.conceptKey, chapterId: next.chapterId },
        );
      }
      return next;
    },
    [persistTimeline, signedIn, snap.concepts, userId],
  );

  /**
   * Record everything we learned from a single scan + solution into the
   * memory graph (history, mistake patterns, concept confidence, profile).
   */
  const recordScanInteraction = useCallback(
    async (input: {
      scan: ScanDoc;
      solved?: SolvedQuestionDoc | null;
      /** -1..+1 — student-reported confidence with the solution. */
      confidenceSignal?: number;
      /** When the student opened the scan, used to derive solve seconds. */
      startedAt?: number;
    }) => {
      const { scan, solved } = input;
      const understanding = scan.understanding;
      const now = Date.now();

      // 1. Scan history mirror.
      const history: ScanHistoryDoc = {
        id: scan.id,
        userId,
        scanId: scan.id,
        subject: understanding?.subject,
        subjectId: understanding?.subjectId,
        chapterId: understanding?.chapterId,
        chapterTitle: understanding?.chapterTitle,
        conceptHighlights: understanding?.concepts ?? [],
        difficulty: understanding?.difficulty,
        modeUsed: solved?.mode,
        language: solved?.language,
        weakAreasTouched: understanding?.concepts ?? [],
        createdAt: now,
      };
      if (signedIn) await upsertScanHistory(history);
      else localLearningMemory.upsertScanHistory(history);

      // 2. Mistake pattern detection across scan text + AI solution body.
      const hits = detectMistakePatterns(scan.extractedText, solved?.content);
      for (const hit of hits) {
        const id = mistakeId(hit.pattern, {
          chapterId: understanding?.chapterId,
          conceptKey: understanding?.concepts?.[0],
        });
        const existing = snap.mistakes.find((m) => m.id === id) ?? null;
        const merged = mergeMistake(existing, {
          userId,
          pattern: hit.pattern,
          note: hit.note,
          scanId: scan.id,
          subjectId: understanding?.subjectId,
          chapterId: understanding?.chapterId,
          conceptKey: understanding?.concepts?.[0],
        });
        if (signedIn) await saveMistakeMemory(merged);
        else localLearningMemory.upsertMistake(merged);
        if (merged.occurrences >= 2) {
          await persistTimeline(
            "mistake_repeated",
            `Repeated ${hit.pattern} (×${merged.occurrences})`,
            { scanId: scan.id, chapterId: understanding?.chapterId },
          );
        }
      }

      // 3. Concept confidence — softly nudge each detected concept.
      const confidence = input.confidenceSignal ?? 0;
      const delta = Math.round(confidence * 20); // ±20 per scan
      const success = confidence >= 0;
      for (const label of (understanding?.concepts ?? []).slice(0, 4)) {
        await recordConceptSignal({
          conceptLabel: label,
          delta,
          success,
          subjectId: understanding?.subjectId,
          chapterId: understanding?.chapterId,
        });
      }

      // 4. Roll the learning profile.
      const solveSeconds = input.startedAt
        ? Math.max(5, Math.round((now - input.startedAt) / 1000))
        : undefined;
      const profile = applyInteraction(snap.profile, {
        userId,
        confidenceDelta: confidence,
        solveSeconds,
        strengthsAdd: success ? understanding?.concepts?.slice(0, 2) : undefined,
        weaknessesAdd: !success
          ? understanding?.concepts?.slice(0, 2)
          : undefined,
        languageHint: solved?.language === "kn" ? "kn" : undefined,
      });
      await saveProfile(profile);

      // 5. Timeline marker.
      await persistTimeline(
        "scan_solved",
        `Solved scan${understanding?.chapterTitle ? ` — ${understanding.chapterTitle}` : ""}`,
        {
          scanId: scan.id,
          chapterId: understanding?.chapterId,
          subjectId: understanding?.subjectId,
        },
      );
    },
    [
      persistTimeline,
      recordConceptSignal,
      saveProfile,
      signedIn,
      snap.mistakes,
      snap.profile,
      userId,
    ],
  );

  return {
    ...snap,
    loading,
    /** Compact grounding string suitable for AI tutor prompts. */
    grounding: () =>
      buildTutoringGrounding({
        profile: snap.profile,
        preferences: snap.preferences,
        mistakes: snap.mistakes,
        concepts: snap.concepts,
        history: snap.history,
      }),
    /** Short user-facing reassurance strings. */
    continuityHints: (opts?: {
      chapterId?: string;
      conceptLabels?: string[];
    }) =>
      buildContinuityHints(
        {
          profile: snap.profile,
          preferences: snap.preferences,
          mistakes: snap.mistakes,
          concepts: snap.concepts,
          history: snap.history,
        },
        opts,
      ),
    ensureProfile,
    updatePreferences,
    recordConceptSignal,
    recordScanInteraction,
  };
}