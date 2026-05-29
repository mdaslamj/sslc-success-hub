import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { auth } from "@/integrations/firebase/config";
import { runSemanticReasoning } from "@/lib/semantic-reasoning";
import {
  appendVoiceTurns,
  fetchVoicePreferences,
  saveVoicePreferences,
  saveVoiceSession,
  saveSpokenHint,
  saveAudioRevision,
  saveConversationalHistory,
} from "@/integrations/firebase/services";
import { useCurrentUserId } from "./use-current-user";
import {
  audioRevisionPrompt,
  cancelSpeech,
  DEFAULT_VOICE_PREFS,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  spokenHintPrompt,
  startRecognition,
  voiceTutorSystemPrompt,
  type RecognitionHandle,
  type VoiceLanguage,
  type VoicePreferences,
  type VoiceSessionContext,
  type VoiceTurn,
  type VoiceTutorMode,
} from "@/lib/voice-tutor";
import type {
  VoicePreferencesDoc,
  VoiceSessionDoc,
} from "@/integrations/firebase/types";

type Status = "idle" | "listening" | "thinking" | "speaking" | "error";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function requireIdToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u.getIdToken();
}

export interface UseVoiceTutorOptions {
  context?: VoiceSessionContext;
  /** Pre-seeded grounding context — e.g. a scanned question's extracted text. */
  grounding?: string;
}

export interface UseVoiceTutorApi {
  status: Status;
  partial: string;
  turns: VoiceTurn[];
  error: string | null;
  prefs: VoicePreferences;
  supported: { stt: boolean; tts: boolean };

  startListening: () => Promise<void>;
  stopListening: () => void;
  stopSpeaking: () => void;
  sendText: (text: string) => Promise<void>;
  reset: () => void;

  setLanguage: (language: VoiceLanguage) => Promise<void>;
  setMode: (mode: VoiceTutorMode) => Promise<void>;
  setPrefs: (next: Partial<VoicePreferences>) => Promise<void>;

  /** Record an audio-revision capsule for a chapter/topic. */
  generateAudioRevision: (topic: string, chapterId?: string) => Promise<string>;
  /** Speak a quick hint and persist it. */
  speakHint: (
    questionText: string,
    level: "nudge" | "step" | "full",
    questionId?: string,
    chapterId?: string,
  ) => Promise<string>;
}

export function useVoiceTutor(opts: UseVoiceTutorOptions = {}): UseVoiceTutorApi {
  const userId = useCurrentUserId();
  const run = useServerFn(runSemanticReasoning);

  const [status, setStatus] = useState<Status>("idle");
  const [partial, setPartial] = useState("");
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<VoicePreferences>(DEFAULT_VOICE_PREFS);

  const sessionIdRef = useRef<string>(uid());
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const prefsLoaded = useRef(false);

  const supported = useMemo(
    () => ({ stt: isSpeechRecognitionSupported(), tts: isSpeechSynthesisSupported() }),
    [],
  );

  // Hydrate preferences from Firestore (best-effort — failure stays silent).
  useEffect(() => {
    let cancelled = false;
    if (!userId || prefsLoaded.current) return;
    prefsLoaded.current = true;
    (async () => {
      try {
        const doc = await fetchVoicePreferences(userId);
        if (!cancelled && doc) {
          setPrefsState({
            language: doc.language,
            mode: doc.mode,
            rate: doc.rate,
            pitch: doc.pitch,
            autoListen: doc.autoListen,
            updatedAt: doc.updatedAt,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Cancel speech + recognition on unmount — prevents the tutor from
  // continuing to talk after the student navigates away.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      cancelSpeech();
    };
  }, []);

  const persistTurns = useCallback(
    async (studentTurn: VoiceTurn, tutorTurn: VoiceTurn) => {
      if (!userId) return;
      const sessionId = sessionIdRef.current;
      const ctx = opts.context ?? { kind: "free_talk" as const };
      const now = Date.now();
      // Upsert the session first so appendVoiceTurns can find it.
      const sessionDoc: VoiceSessionDoc = {
        id: sessionId,
        userId,
        context: ctx.kind,
        language: prefs.language,
        mode: prefs.mode,
        scanId: ctx.scanId,
        questionId: ctx.questionId,
        chapterId: ctx.chapterId,
        subjectId: ctx.subjectId,
        turns: [],
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      try {
        await saveVoiceSession(sessionDoc);
        await appendVoiceTurns(userId, sessionId, [
          {
            id: studentTurn.id,
            role: "student",
            text: studentTurn.text,
            createdAt: studentTurn.createdAt,
          },
          {
            id: tutorTurn.id,
            role: "tutor",
            text: tutorTurn.text,
            spokenMs: tutorTurn.spokenMs,
            createdAt: tutorTurn.createdAt,
          },
        ]);
      } catch {
        /* offline / rules — keep local state intact */
      }
    },
    [opts.context, prefs.language, prefs.mode, userId],
  );

  const speakAndTrack = useCallback(
    (text: string, onDone?: () => void) => {
      if (!supported.tts) {
        onDone?.();
        return;
      }
      const startedAt = Date.now();
      setStatus("speaking");
      speak(text, {
        language: prefs.language,
        rate: prefs.rate,
        pitch: prefs.pitch,
        onEnd: () => {
          const ms = Date.now() - startedAt;
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "tutor") last.spokenMs = ms;
            return next;
          });
          setStatus("idle");
          onDone?.();
        },
        onError: (msg) => {
          setError(msg);
          setStatus("idle");
          onDone?.();
        },
      });
    },
    [prefs.language, prefs.pitch, prefs.rate, supported.tts],
  );

  const askTutor = useCallback(
    async (studentText: string) => {
      if (!studentText.trim()) return;
      setError(null);
      const studentTurn: VoiceTurn = {
        id: uid(),
        role: "student",
        text: studentText,
        createdAt: Date.now(),
      };
      setTurns((prev) => [...prev, studentTurn]);
      setStatus("thinking");

      try {
        const idToken = await requireIdToken();
        const priorTurns = turns.map((t) => ({
          role: (t.role === "tutor" ? "assistant" : "user") as "assistant" | "user",
          content: t.text,
        }));
        const result = await run({
          data: {
            idToken,
            taskType: "coach-message",
            systemPrompt: voiceTutorSystemPrompt(prefs.mode, prefs.language),
            grounding: opts.grounding,
            messages: [...priorTurns, { role: "user", content: studentText }],
            temperature: 0.55,
          },
        });
        if (!result.ok) throw new Error(result.error);
        const tutorTurn: VoiceTurn = {
          id: uid(),
          role: "tutor",
          text: result.content.trim(),
          createdAt: Date.now(),
        };
        setTurns((prev) => [...prev, tutorTurn]);
        await persistTurns(studentTurn, tutorTurn);
        speakAndTrack(tutorTurn.text, () => {
          if (prefs.autoListen && supported.stt) {
            void startListeningRef.current?.();
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
      }
    },
    [opts.grounding, persistTurns, prefs.autoListen, prefs.language, prefs.mode, run, speakAndTrack, supported.stt, turns],
  );

  // forward ref so speakAndTrack -> startListening doesn't trigger a circular
  // dependency that breaks React's exhaustive-deps lint.
  const startListeningRef = useRef<(() => Promise<void>) | null>(null);

  const startListening = useCallback(async () => {
    if (!supported.stt) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    cancelSpeech(); // barge-in: cut tutor speech the instant the student taps the mic
    recognitionRef.current?.stop();
    setError(null);
    setPartial("");
    setStatus("listening");

    const handle = startRecognition(prefs.language, {
      onPartial: (t) => setPartial(t),
      onFinal: (t) => {
        setPartial("");
        recognitionRef.current = null;
        void askTutor(t);
      },
      onError: (msg) => {
        setError(msg);
        setStatus("idle");
      },
      onEnd: () => {
        recognitionRef.current = null;
        setStatus((s) => (s === "listening" ? "idle" : s));
      },
    });
    recognitionRef.current = handle;
  }, [askTutor, prefs.language, supported.stt]);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const stopSpeaking = useCallback(() => {
    cancelSpeech();
    setStatus((s) => (s === "speaking" ? "idle" : s));
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      await askTutor(text);
    },
    [askTutor],
  );

  const reset = useCallback(() => {
    stopListening();
    cancelSpeech();
    sessionIdRef.current = uid();
    setTurns([]);
    setPartial("");
    setError(null);
    setStatus("idle");
  }, [stopListening]);

  const persistPrefs = useCallback(
    async (next: VoicePreferences) => {
      if (!userId) return;
      const doc: VoicePreferencesDoc = {
        userId,
        language: next.language,
        mode: next.mode,
        rate: next.rate,
        pitch: next.pitch,
        autoListen: next.autoListen,
        updatedAt: Date.now(),
      };
      try {
        await saveVoicePreferences(doc);
      } catch {
        /* ignore — offline or auth not ready */
      }
    },
    [userId],
  );

  const setPrefs = useCallback(
    async (patch: Partial<VoicePreferences>) => {
      const next: VoicePreferences = { ...prefs, ...patch, updatedAt: Date.now() };
      setPrefsState(next);
      await persistPrefs(next);
    },
    [persistPrefs, prefs],
  );

  const setLanguage = useCallback(
    (language: VoiceLanguage) => setPrefs({ language }),
    [setPrefs],
  );
  const setMode = useCallback(
    (mode: VoiceTutorMode) => setPrefs({ mode }),
    [setPrefs],
  );

  const generateAudioRevision = useCallback(
    async (topic: string, chapterId?: string) => {
      setError(null);
      setStatus("thinking");
      try {
        const idToken = await requireIdToken();
        const result = await run({
          data: {
            idToken,
            taskType: "general",
            systemPrompt: audioRevisionPrompt(prefs.language, topic),
            messages: [
              { role: "user", content: `Create a 60-second audio revision capsule for ${topic}.` },
            ],
            temperature: 0.5,
          },
        });
        if (!result.ok) throw new Error(result.error);
        const transcript = result.content.trim();
        const startedAt = Date.now();
        speakAndTrack(transcript, async () => {
          const durationSec = Math.max(15, Math.round((Date.now() - startedAt) / 1000));
          if (userId) {
            try {
              await saveAudioRevision({
                id: uid(),
                userId,
                chapterId,
                topic,
                language: prefs.language,
                durationSec,
                transcript,
                createdAt: Date.now(),
              });
            } catch {
              /* ignore */
            }
          }
        });
        return transcript;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
        throw err;
      }
    },
    [prefs.language, run, speakAndTrack, userId],
  );

  const speakHint = useCallback(
    async (questionText: string, level: "nudge" | "step" | "full", questionId?: string, chapterId?: string) => {
      setError(null);
      setStatus("thinking");
      try {
        const idToken = await requireIdToken();
        const result = await run({
          data: {
            idToken,
            taskType: "coach-message",
            systemPrompt: spokenHintPrompt(prefs.language, level),
            grounding: opts.grounding,
            messages: [{ role: "user", content: `Question: ${questionText}` }],
            temperature: 0.4,
          },
        });
        if (!result.ok) throw new Error(result.error);
        const text = result.content.trim();
        speakAndTrack(text);
        if (userId) {
          try {
            await saveSpokenHint({
              id: uid(),
              userId,
              questionId,
              chapterId,
              text,
              level,
              language: prefs.language,
              createdAt: Date.now(),
            });
          } catch {
            /* ignore */
          }
        }
        return text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
        throw err;
      }
    },
    [opts.grounding, prefs.language, run, speakAndTrack, userId],
  );

  // Summarize + persist conversational history when the session naturally ends
  // (component unmount with at least one full exchange). Fire-and-forget.
  useEffect(() => {
    return () => {
      if (!userId) return;
      const studentTurns = turns.filter((t) => t.role === "student");
      if (studentTurns.length === 0) return;
      const summary = studentTurns
        .slice(-3)
        .map((t) => t.text)
        .join(" • ");
      const topics = Array.from(
        new Set(studentTurns.flatMap((t) => extractTopics(t.text))),
      ).slice(0, 5);
      void saveConversationalHistory({
        id: uid(),
        userId,
        sessionId: sessionIdRef.current,
        summary,
        topics,
        language: prefs.language,
        createdAt: Date.now(),
      }).catch(() => undefined);
    };
    // We intentionally depend only on userId so this runs on final unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    status,
    partial,
    turns,
    error,
    prefs,
    supported,
    startListening,
    stopListening,
    stopSpeaking,
    sendText,
    reset,
    setLanguage,
    setMode,
    setPrefs,
    generateAudioRevision,
    speakHint,
  };
}

/** Naive topic extractor — picks capitalised / math-y noun-ish tokens. */
function extractTopics(text: string): string[] {
  const matches = text.match(/[A-Z][a-zA-Z]{3,}/g);
  return matches ? matches.slice(0, 4) : [];
}