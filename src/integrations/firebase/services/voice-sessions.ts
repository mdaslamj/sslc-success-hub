/**
 * Firestore services for the Voice AI Tutor + Conversational Learning System.
 * Five subcollections under users/{uid}. Owner-gated by security rules.
 * Stores transcripts only — never raw microphone audio.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { COLLECTIONS, VOICE_SUBCOLLECTIONS, db } from "../config";
import type {
  AudioRevisionHistoryDoc,
  ConversationalHistoryDoc,
  SpokenHintDoc,
  VoicePreferencesDoc,
  VoiceSessionDoc,
  VoiceTurnDoc,
} from "../types";

const SUB = VOICE_SUBCOLLECTIONS;

function userCol(uid: string, sub: string) {
  return collection(db, COLLECTIONS.USERS, uid, sub);
}
function userDoc(uid: string, sub: string, id: string) {
  return doc(db, COLLECTIONS.USERS, uid, sub, id);
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as T;
}

/* ---------------------------- voice sessions ---------------------------- */

export async function saveVoiceSession(s: VoiceSessionDoc): Promise<void> {
  await setDoc(userDoc(s.userId, SUB.VOICE_SESSIONS, s.id), clean(s));
}

export async function fetchVoiceSession(
  uid: string,
  sessionId: string,
): Promise<VoiceSessionDoc | null> {
  const snap = await getDoc(userDoc(uid, SUB.VOICE_SESSIONS, sessionId));
  return snap.exists() ? (snap.data() as VoiceSessionDoc) : null;
}

export async function fetchRecentVoiceSessions(
  uid: string,
  limit = 20,
): Promise<VoiceSessionDoc[]> {
  const q = query(
    userCol(uid, SUB.VOICE_SESSIONS),
    orderBy("updatedAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as VoiceSessionDoc);
}

export async function appendVoiceTurns(
  uid: string,
  sessionId: string,
  turns: VoiceTurnDoc[],
): Promise<void> {
  const existing = await fetchVoiceSession(uid, sessionId);
  if (!existing) return;
  const next: VoiceSessionDoc = {
    ...existing,
    turns: [...existing.turns, ...turns],
    updatedAt: Date.now(),
  };
  await saveVoiceSession(next);
}

/* ---------------------- conversational long-term history ---------------------- */

export async function saveConversationalHistory(
  entry: ConversationalHistoryDoc,
): Promise<void> {
  await setDoc(
    userDoc(entry.userId, SUB.CONVERSATIONAL_HISTORY, entry.id),
    clean(entry),
  );
}

export async function fetchConversationalHistory(
  uid: string,
  limit = 30,
): Promise<ConversationalHistoryDoc[]> {
  const q = query(
    userCol(uid, SUB.CONVERSATIONAL_HISTORY),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ConversationalHistoryDoc);
}

/* ------------------------------ spoken hints ------------------------------ */

export async function saveSpokenHint(hint: SpokenHintDoc): Promise<void> {
  await setDoc(userDoc(hint.userId, SUB.SPOKEN_HINTS, hint.id), clean(hint));
}

export async function fetchSpokenHintsForQuestion(
  uid: string,
  questionId: string,
): Promise<SpokenHintDoc[]> {
  const q = query(
    userCol(uid, SUB.SPOKEN_HINTS),
    orderBy("createdAt", "desc"),
    qLimit(20),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as SpokenHintDoc)
    .filter((h) => h.questionId === questionId);
}

/* --------------------------- audio revision capsules --------------------------- */

export async function saveAudioRevision(
  entry: AudioRevisionHistoryDoc,
): Promise<void> {
  await setDoc(
    userDoc(entry.userId, SUB.AUDIO_REVISION_HISTORY, entry.id),
    clean(entry),
  );
}

export async function fetchAudioRevisionHistory(
  uid: string,
  limit = 30,
): Promise<AudioRevisionHistoryDoc[]> {
  const q = query(
    userCol(uid, SUB.AUDIO_REVISION_HISTORY),
    orderBy("createdAt", "desc"),
    qLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AudioRevisionHistoryDoc);
}

/* ------------------------------ preferences ------------------------------ */

const PREFS_DOC = "profile";

export async function saveVoicePreferences(
  prefs: VoicePreferencesDoc,
): Promise<void> {
  await setDoc(
    userDoc(prefs.userId, SUB.VOICE_PREFERENCES, PREFS_DOC),
    clean(prefs),
  );
}

export async function fetchVoicePreferences(
  uid: string,
): Promise<VoicePreferencesDoc | null> {
  const snap = await getDoc(userDoc(uid, SUB.VOICE_PREFERENCES, PREFS_DOC));
  return snap.exists() ? (snap.data() as VoicePreferencesDoc) : null;
}