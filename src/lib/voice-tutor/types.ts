/**
 * Voice tutor types — shared between the speech layer, the hook, and the
 * Firestore service. Kept dependency-free so it can be imported anywhere.
 */

export type VoiceLanguage =
  | "en-IN"
  | "kn-IN"
  | "ur-IN"
  | "hi-IN"
  | "hinglish"
  | "kanglish";

export const VOICE_LANGUAGE_LABEL: Record<VoiceLanguage, string> = {
  "en-IN": "English",
  "kn-IN": "Kannada",
  "ur-IN": "Urdu",
  "hi-IN": "Hindi",
  hinglish: "Hinglish",
  kanglish: "Kanglish",
};

/** Maps our app language tag to a browser SpeechRecognition / SpeechSynthesis BCP-47 tag. */
export function browserSpeechTag(lang: VoiceLanguage): string {
  switch (lang) {
    case "hinglish":
      return "en-IN";
    case "kanglish":
      return "en-IN";
    default:
      return lang;
  }
}

export type VoiceTutorMode =
  | "beginner"
  | "concise"
  | "board"
  | "motivational"
  | "deep";

export const VOICE_MODE_LABEL: Record<VoiceTutorMode, string> = {
  beginner: "Beginner-friendly",
  concise: "Concise",
  board: "Board-exam style",
  motivational: "Motivational",
  deep: "Deep concept",
};

export type VoiceTurnRole = "student" | "tutor";

export interface VoiceTurn {
  id: string;
  role: VoiceTurnRole;
  text: string;
  /** Spoken word duration in ms — set on tutor turns once TTS finishes. */
  spokenMs?: number;
  createdAt: number;
}

export interface VoicePreferences {
  language: VoiceLanguage;
  mode: VoiceTutorMode;
  rate: number; // SpeechSynthesis rate, 0.5-1.5
  pitch: number; // 0-2
  autoListen: boolean; // re-open mic after tutor finishes
  updatedAt: number;
}

export const DEFAULT_VOICE_PREFS: VoicePreferences = {
  language: "en-IN",
  mode: "beginner",
  rate: 1,
  pitch: 1,
  autoListen: true,
  updatedAt: 0,
};

export type VoiceSessionContextKind =
  | "free_talk"
  | "scan_explain"
  | "remediation"
  | "audio_revision";

export interface VoiceSessionContext {
  kind: VoiceSessionContextKind;
  /** Optional anchor IDs for analytics + grounding. */
  scanId?: string;
  questionId?: string;
  chapterId?: string;
  subjectId?: string;
}