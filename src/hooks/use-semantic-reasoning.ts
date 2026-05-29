import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { auth } from "@/integrations/firebase/config";
import {
  appendTutoringTurns,
  closeTutoringSession,
  createTutoringSession,
  fetchHintsForQuestion,
  fetchReasoningFeedbackForChapter,
  fetchSemanticEvaluationsForChapter,
  fetchSemanticEvaluationsForQuestion,
  fetchTutoringSession,
  fetchTutoringSessionsForChapter,
  markHintRevealed,
  saveHint,
  saveReasoningFeedback,
  saveSemanticEvaluation,
} from "@/integrations/firebase/services";
import type {
  AiTutoringSessionDoc,
  HintLevel,
  ReasoningFeedbackDoc,
  SemanticEvaluationDoc,
  TutoringExplanationLevel,
  TutoringTurn,
} from "@/integrations/firebase/types";
import {
  type GroundingPayload,
  buildGroundingPrompt,
  hintSystemPrompt,
  runSemanticReasoning,
  safeParseSemanticEvaluation,
  SEMANTIC_EVAL_SYSTEM,
  tutorSystemPrompt,
} from "@/lib/semantic-reasoning";
import { useCurrentUserId } from "./use-current-user";

async function requireIdToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u.getIdToken();
}

/* --------------------------- adaptive tutoring --------------------------- */

export function useTutoringSession(sessionId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "tutoring", userId, sessionId],
    queryFn: () => fetchTutoringSession(userId!, sessionId!),
    enabled: !!userId && !!sessionId,
  });
}

export function useTutoringSessionsForChapter(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "tutoring", userId, "chapter", chapterId],
    queryFn: () => fetchTutoringSessionsForChapter(userId!, chapterId!),
    enabled: !!userId && !!chapterId,
  });
}

export function useAskTutor() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const run = useServerFn(runSemanticReasoning);

  return useMutation({
    mutationFn: async (vars: {
      sessionId?: string;
      chapterId: string;
      subjectId: string;
      questionId?: string;
      level: TutoringExplanationLevel;
      studentMessage: string;
      grounding: GroundingPayload;
      model?: string;
      priorTurns?: TutoringTurn[];
    }) => {
      if (!userId) throw new Error("Not signed in");
      const groundingText = buildGroundingPrompt(vars.grounding);
      const messages = [
        ...(vars.priorTurns ?? []).map((t) => ({
          role: (t.role === "tutor" ? "assistant" : "user") as
            | "assistant"
            | "user",
          content: t.text,
        })),
        { role: "user" as const, content: vars.studentMessage },
      ];
      const idToken = await requireIdToken();
      const result = await run({
        data: {
          idToken,
          taskType: "general",
          model: vars.model,
          systemPrompt: tutorSystemPrompt(vars.level),
          grounding: groundingText,
          messages,
          temperature: 0.4,
        },
      });
      if (!result.ok) throw new Error(result.error);

      const now = Date.now();
      const studentTurn: TutoringTurn = {
        role: "student",
        text: vars.studentMessage,
        createdAt: now,
      };
      const tutorTurn: TutoringTurn = {
        role: "tutor",
        text: result.content,
        createdAt: now + 1,
      };

      let sessionId = vars.sessionId;
      if (!sessionId) {
        const created = await createTutoringSession({
          userId,
          chapterId: vars.chapterId,
          subjectId: vars.subjectId,
          questionId: vars.questionId,
          level: vars.level,
          model: result.model,
          turns: [studentTurn, tutorTurn],
          status: "open",
          groundingRefs: {
            chapterId: vars.chapterId,
            formulaIds: vars.grounding.formulas?.map((f) => f.id),
            rubricId: vars.grounding.rubric?.id,
            keywordIds: vars.grounding.keywords?.map((k) => k.id),
            memoryChapterIds: vars.grounding.memory
              ? [vars.grounding.memory.chapterId]
              : [],
            weaknessChapterIds: vars.grounding.weakness
              ? [vars.grounding.weakness.chapterId]
              : [],
          },
        });
        sessionId = created.id;
      } else {
        await appendTutoringTurns(userId, sessionId, [studentTurn, tutorTurn]);
      }
      return { sessionId, reply: result.content, model: result.model };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["semantic", "tutoring", userId],
      });
      qc.invalidateQueries({
        queryKey: ["semantic", "tutoring", userId, "chapter", vars.chapterId],
      });
    },
  });
}

export function useCloseTutoringSession() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!userId) throw new Error("Not signed in");
      await closeTutoringSession(userId, sessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["semantic", "tutoring", userId] });
    },
  });
}

/* ------------------------------ hint system ------------------------------ */

export function useHintsForQuestion(questionId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "hints", userId, questionId],
    queryFn: () => fetchHintsForQuestion(userId!, questionId!),
    enabled: !!userId && !!questionId,
  });
}

export function useRequestHint() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const run = useServerFn(runSemanticReasoning);

  return useMutation({
    mutationFn: async (vars: {
      chapterId: string;
      subjectId: string;
      questionId: string;
      level: HintLevel;
      grounding: GroundingPayload;
      sessionId?: string;
      model?: string;
    }) => {
      if (!userId) throw new Error("Not signed in");
      const idToken = await requireIdToken();
      const result = await run({
        data: {
          idToken,
          taskType: "general",
          model: vars.model,
          systemPrompt: hintSystemPrompt(vars.level),
          grounding: buildGroundingPrompt(vars.grounding),
          messages: [
            {
              role: "user",
              content: `Give me a ${vars.level} hint for the question above.`,
            },
          ],
          temperature: 0.3,
        },
      });
      if (!result.ok) throw new Error(result.error);
      const hint = await saveHint({
        userId,
        chapterId: vars.chapterId,
        subjectId: vars.subjectId,
        questionId: vars.questionId,
        sessionId: vars.sessionId,
        level: vars.level,
        text: result.content,
        revealed: false,
        model: result.model,
      });
      return hint;
    },
    onSuccess: (_h, vars) => {
      qc.invalidateQueries({
        queryKey: ["semantic", "hints", userId, vars.questionId],
      });
    },
  });
}

export function useRevealHint() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hintId: string) => {
      if (!userId) throw new Error("Not signed in");
      await markHintRevealed(userId, hintId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["semantic", "hints", userId] });
    },
  });
}

/* ------------------------ semantic answer evaluation --------------------- */

export function useSemanticEvaluationsForQuestion(
  questionId: string | undefined,
) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "evaluations", userId, "q", questionId],
    queryFn: () => fetchSemanticEvaluationsForQuestion(userId!, questionId!),
    enabled: !!userId && !!questionId,
  });
}

export function useSemanticEvaluationsForChapter(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "evaluations", userId, "ch", chapterId],
    queryFn: () => fetchSemanticEvaluationsForChapter(userId!, chapterId!),
    enabled: !!userId && !!chapterId,
  });
}

export function useEvaluateAnswerSemantically() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const run = useServerFn(runSemanticReasoning);

  return useMutation({
    mutationFn: async (vars: {
      chapterId: string;
      subjectId: string;
      questionId: string;
      evaluationId?: string;
      attemptId?: string;
      studentAnswer: string;
      grounding: GroundingPayload;
      model?: string;
    }): Promise<SemanticEvaluationDoc> => {
      if (!userId) throw new Error("Not signed in");
      const groundingText = buildGroundingPrompt({
        ...vars.grounding,
        ocrStudentAnswer: vars.grounding.ocrStudentAnswer ?? vars.studentAnswer,
      });
      const idToken = await requireIdToken();
      const result = await run({
        data: {
          idToken,
          taskType: "paper-evaluation",
          model: vars.model,
          systemPrompt: SEMANTIC_EVAL_SYSTEM,
          grounding: groundingText,
          messages: [
            {
              role: "user",
              content: `Student answer to evaluate semantically:\n${vars.studentAnswer}`,
            },
          ],
          responseFormat: "json_object",
          temperature: 0.2,
        },
      });
      if (!result.ok) throw new Error(result.error);
      const parsed = safeParseSemanticEvaluation(result.content);
      const saved = await saveSemanticEvaluation({
        userId,
        chapterId: vars.chapterId,
        subjectId: vars.subjectId,
        questionId: vars.questionId,
        evaluationId: vars.evaluationId,
        attemptId: vars.attemptId,
        verdict: parsed?.verdict ?? "partially_correct",
        confidence: Math.max(0, Math.min(100, parsed?.confidence ?? 50)),
        alternateMethod: parsed?.alternateMethod,
        reasoningSummary:
          parsed?.reasoningSummary ?? result.content.slice(0, 1000),
        mistakeInterpretations: parsed?.mistakeInterpretations ?? [],
        feedback: parsed?.feedback ?? "",
        model: result.model,
      });
      return saved;
    },
    onSuccess: (_s, vars) => {
      qc.invalidateQueries({
        queryKey: ["semantic", "evaluations", userId, "q", vars.questionId],
      });
      qc.invalidateQueries({
        queryKey: ["semantic", "evaluations", userId, "ch", vars.chapterId],
      });
    },
  });
}

/* --------------------------- reasoning feedback -------------------------- */

export function useReasoningFeedbackForChapter(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["semantic", "feedback", userId, chapterId],
    queryFn: () => fetchReasoningFeedbackForChapter(userId!, chapterId!),
    enabled: !!userId && !!chapterId,
  });
}

export function useSaveReasoningFeedback() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      f: Omit<ReasoningFeedbackDoc, "id" | "createdAt" | "userId">,
    ) => {
      if (!userId) throw new Error("Not signed in");
      return saveReasoningFeedback({ ...f, userId });
    },
    onSuccess: (_f, vars) => {
      qc.invalidateQueries({
        queryKey: ["semantic", "feedback", userId, vars.chapterId],
      });
    },
  });
}

/* convenience re-exports for call sites */
export type { AiTutoringSessionDoc, GroundingPayload };