import { useCallback, useEffect, useState } from "react";
import { auth } from "@/integrations/firebase/config";
import { useAuthOptional } from "@/contexts/auth-context";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useServerFn } from "@tanstack/react-start";
import { runSemanticReasoning } from "@/lib/semantic-reasoning";
import {
  createScan,
  fetchScan,
  patchScan,
  setScanUnderstanding,
  saveSolvedQuestion,
  solvedQuestionId,
  fetchSolvedQuestionsForScan,
  saveAiEvaluation,
} from "@/integrations/firebase/services";
import {
  genScanId,
  localScans,
  localSolved,
  parseHints,
  parseStepByStep,
  parseUnderstanding,
  solveSystemPrompt,
  UNDERSTANDING_SYSTEM,
  scheduleScanRevision,
  markScanWeakness,
} from "@/lib/scan-engine";
import type {
  ScanDoc,
  ScanMode,
  ScanSource,
  SolveMode,
  SolvedQuestionDoc,
  AiEvaluationDoc,
} from "@/integrations/firebase/types";

async function tryIdToken(): Promise<string | null> {
  try {
    const u = auth.currentUser;
    if (!u) return null;
    return await u.getIdToken();
  } catch {
    return null;
  }
}

export type CreateScanInput = {
  mode: ScanMode;
  source: ScanSource;
  extractedText: string;
  previewUrl?: string;
};

export function useCreateScan() {
  const userId = useCurrentUserId();
  const authCtx = useAuthOptional();
  const run = useServerFn(runSemanticReasoning);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "ocr" | "understanding" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (input: CreateScanInput): Promise<ScanDoc | null> => {
      setBusy(true);
      setError(null);
      try {
        const now = Date.now();
        const id = genScanId();
        const base: ScanDoc = {
          id,
          userId,
          mode: input.mode,
          source: input.source,
          imageIds: [],
          previewUrl: input.previewUrl,
          extractedText: input.extractedText,
          status: "understanding",
          createdAt: now,
          updatedAt: now,
        };
        // Persist initial scan (Firestore if signed in, else local).
        if (authCtx?.user) {
          await createScan(base);
        } else {
          localScans.upsert(base);
        }
        setStage("understanding");

        // Best-effort AI understanding pass.
        const idToken = await tryIdToken();
        if (idToken) {
          const r = await run({
            data: {
              idToken,
              systemPrompt: UNDERSTANDING_SYSTEM,
              messages: [
                {
                  role: "user",
                  content: `Scanned question text:\n"""\n${input.extractedText}\n"""`,
                },
              ],
              responseFormat: "json_object",
              temperature: 0.2,
            },
          });
          if (r.ok) {
            const understanding = parseUnderstanding(r.content);
            if (authCtx?.user) {
              await setScanUnderstanding(id, understanding);
            } else {
              localScans.patch(id, { understanding, status: "ready" });
            }
            setStage("ready");
            return { ...base, understanding, status: "ready" };
          }
        }
        // No auth or call failed → mark ready with minimal understanding.
        if (authCtx?.user) {
          await patchScan(id, { status: "ready" });
        } else {
          localScans.patch(id, { status: "ready" });
        }
        setStage("ready");
        return { ...base, status: "ready" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Scan failed";
        setError(msg);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [authCtx?.user, run, userId],
  );

  return { create, busy, stage, error };
}

/* ---------------- read a scan ---------------- */

export function useScan(scanId: string | undefined) {
  const userId = useCurrentUserId();
  const authCtx = useAuthOptional();
  const [scan, setScan] = useState<ScanDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!scanId) return;
      setLoading(true);
      try {
        if (authCtx?.user) {
          const s = await fetchScan(scanId);
          if (!cancelled) setScan(s);
        } else {
          if (!cancelled) setScan(localScans.get(scanId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authCtx?.user, scanId, userId]);

  return { scan, loading, setScan };
}

/* ---------------- solve modes ---------------- */

export function useSolveScan(scan: ScanDoc | null) {
  const userId = useCurrentUserId();
  const authCtx = useAuthOptional();
  const run = useServerFn(runSemanticReasoning);
  const [solutions, setSolutions] = useState<Record<string, SolvedQuestionDoc>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Hydrate solved cache.
  useEffect(() => {
    if (!scan) return;
    let cancelled = false;
    async function load() {
      if (authCtx?.user && scan) {
        const list = await fetchSolvedQuestionsForScan(userId, scan.id);
        if (cancelled) return;
        setSolutions(Object.fromEntries(list.map((s) => [`${s.mode}__${s.language}`, s])));
      } else if (scan) {
        const list = localSolved.list(userId, scan.id);
        setSolutions(Object.fromEntries(list.map((s) => [`${s.mode}__${s.language}`, s])));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authCtx?.user, scan, userId]);

  const solve = useCallback(
    async (mode: SolveMode, language: "en" | "kn"): Promise<SolvedQuestionDoc | null> => {
      if (!scan) return null;
      const key = `${mode}__${language}`;
      if (solutions[key]) return solutions[key];
      setPending((p) => ({ ...p, [key]: true }));
      try {
        const idToken = await tryIdToken();
        if (!idToken) {
          // Guest fallback — produce a friendly placeholder so UI still renders.
          const placeholder: SolvedQuestionDoc = {
            id: solvedQuestionId(scan.id, mode, language),
            userId,
            scanId: scan.id,
            mode,
            language,
            content:
              "Sign in to unlock Aura's AI tutor. Once signed in, every solve mode — quick answer, step-by-step, hint mode, board method, and Kannada — is available.",
            model: "guest",
            createdAt: Date.now(),
          };
          localSolved.upsert(placeholder);
          setSolutions((s) => ({ ...s, [key]: placeholder }));
          return placeholder;
        }
        const r = await run({
          data: {
            idToken,
            systemPrompt: solveSystemPrompt(mode, language),
            grounding: scan.understanding
              ? `Subject: ${scan.understanding.subject ?? "n/a"} | Chapter: ${scan.understanding.chapterTitle ?? "n/a"} | Difficulty: ${scan.understanding.difficulty} | Concepts: ${scan.understanding.concepts.join(", ") || "n/a"} | Formulas: ${scan.understanding.formulas.join(", ") || "n/a"}`
              : undefined,
            messages: [
              {
                role: "user",
                content: `Question (scanned):\n"""\n${scan.extractedText}\n"""`,
              },
            ],
            temperature: mode === "hint" ? 0.5 : 0.3,
          },
        });
        if (!r.ok) throw new Error(r.error);
        const doc: SolvedQuestionDoc = {
          id: solvedQuestionId(scan.id, mode, language),
          userId,
          scanId: scan.id,
          mode,
          language,
          content: r.content,
          model: r.model,
          steps: mode === "step_by_step" ? parseStepByStep(r.content).steps : undefined,
          hints: mode === "hint" ? parseHints(r.content) : undefined,
          createdAt: Date.now(),
        };
        if (authCtx?.user) {
          await saveSolvedQuestion(doc);
        } else {
          localSolved.upsert(doc);
        }
        setSolutions((s) => ({ ...s, [key]: doc }));
        return doc;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Aura couldn't reach the tutor.";
        const errDoc: SolvedQuestionDoc = {
          id: `${solvedQuestionId(scan.id, mode, language)}__err`,
          userId,
          scanId: scan.id,
          mode,
          language,
          content: msg,
          model: "error",
          createdAt: Date.now(),
        };
        setSolutions((s) => ({ ...s, [key]: errDoc }));
        return null;
      } finally {
        setPending((p) => ({ ...p, [key]: false }));
      }
    },
    [authCtx?.user, run, scan, solutions, userId],
  );

  return { solutions, solve, pending };
}

/* ---------------- post-solve actions ---------------- */

export function usePostSolveActions(scan: ScanDoc | null) {
  const userId = useCurrentUserId();
  const authCtx = useAuthOptional();

  return {
    async scheduleRevision(days = 2) {
      if (!scan || !authCtx?.user) return null;
      return scheduleScanRevision(userId, scan, { daysAhead: days });
    },
    async markWeak() {
      if (!scan || !authCtx?.user) return null;
      await markScanWeakness(userId, scan);
      return true;
    },
    async saveEvaluation(e: Omit<AiEvaluationDoc, "id" | "userId" | "createdAt">) {
      if (!scan || !authCtx?.user) return null;
      const doc: AiEvaluationDoc = {
        ...e,
        id: `eval_${scan.id}_${Date.now().toString(36)}`,
        userId,
        createdAt: Date.now(),
      };
      await saveAiEvaluation(doc);
      return doc;
    },
  };
}