/**
 * Beta feedback + bug reporting queue. Stored locally so it survives
 * offline mode; flushed to Firestore by the offline sync engine when
 * connectivity returns. The admin ops panel can inspect everything
 * in-app while testers run private beta cycles.
 */

import { recordEvent } from "./monitoring";
import { getEnvConfig } from "./env-config";

export type FeedbackKind = "bug" | "idea" | "praise" | "confusion";

export type FeedbackEntry = {
  id: string;
  kind: FeedbackKind;
  message: string;
  route: string;
  release: string;
  env: string;
  at: number;
  contact?: string;
  attachments?: string[]; // data URIs
};

const STORAGE_KEY = "aura:beta-feedback:v1";

function load(): FeedbackEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: FeedbackEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-200)));
  } catch {
    /* swallow */
  }
}

export function submitFeedback(input: {
  kind: FeedbackKind;
  message: string;
  contact?: string;
  attachments?: string[];
}): FeedbackEntry {
  const cfg = getEnvConfig();
  const entry: FeedbackEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.kind,
    message: input.message.slice(0, 4000),
    contact: input.contact?.slice(0, 200),
    attachments: input.attachments,
    route: typeof window !== "undefined" ? window.location.pathname : "/",
    release: cfg.release,
    env: cfg.env,
    at: Date.now(),
  };
  const buf = load();
  buf.push(entry);
  save(buf);
  recordEvent("info", "beta_feedback", undefined, { kind: input.kind });
  return entry;
}

export function listFeedback(): FeedbackEntry[] {
  return load().sort((a, b) => b.at - a.at);
}

export function deleteFeedback(id: string) {
  save(load().filter((e) => e.id !== id));
}

export function clearFeedback() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}