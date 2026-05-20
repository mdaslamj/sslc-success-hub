/**
 * Thin wrappers around the browser Web Speech API. Works fully offline once
 * voices are cached. We avoid any external SDK so there are no extra secrets
 * to manage and microphone permissions stay native.
 */

import { browserSpeechTag, type VoiceLanguage } from "./types";

type SR = typeof globalThis extends { SpeechRecognition: infer T }
  ? T
  : never;

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function isSpeechRecognitionSupported(): boolean {
  return !!getRecognitionCtor();
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface RecognitionHandle {
  stop: () => void;
}

export interface RecognitionCallbacks {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

/**
 * Start continuous speech recognition. Returns a handle the caller can stop
 * manually (e.g. when the student taps the mic again or the tutor begins
 * speaking — natural barge-in / interruption).
 */
export function startRecognition(
  language: VoiceLanguage,
  cb: RecognitionCallbacks,
): RecognitionHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    cb.onError?.("Speech recognition is not supported in this browser.");
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = browserSpeechTag(language);
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (ev: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (ev as any).results as ArrayLike<
      ArrayLike<{ transcript: string }> & { isFinal: boolean }
    >;
    let interim = "";
    let final = "";
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const text = res[0]?.transcript ?? "";
      if (res.isFinal) final += text;
      else interim += text;
    }
    if (interim) cb.onPartial?.(interim.trim());
    if (final) cb.onFinal(final.trim());
  };

  recognition.onerror = (ev: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (ev as any).error ?? "Unknown speech error";
    cb.onError?.(String(msg));
  };

  recognition.onend = () => cb.onEnd?.();

  try {
    recognition.start();
  } catch (err) {
    cb.onError?.(err instanceof Error ? err.message : String(err));
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

export interface SpeakOptions {
  language: VoiceLanguage;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

/** Cancel any in-progress speech. Used for interruptible tutoring flow. */
export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

function pickVoice(tag: string): SpeechSynthesisVoice | undefined {
  if (!isSpeechSynthesisSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  // Exact match first, then language-prefix match.
  return (
    voices.find((v) => v.lang === tag) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()))
  );
}

export function speak(text: string, opts: SpeakOptions): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    opts.onError?.("Speech synthesis unavailable.");
    return;
  }
  cancelSpeech();
  const utter = new SpeechSynthesisUtterance(text);
  const tag = browserSpeechTag(opts.language);
  utter.lang = tag;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  const voice = pickVoice(tag);
  if (voice) utter.voice = voice;
  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onerror = (ev) => {
    opts.onError?.(
      "error" in ev && typeof ev.error === "string" ? ev.error : "TTS error",
    );
  };
  try {
    window.speechSynthesis.speak(utter);
  } catch (err) {
    opts.onError?.(err instanceof Error ? err.message : String(err));
  }
}

// Touch type so unused imports don't bite us in tsc strict mode.
export type { SR };