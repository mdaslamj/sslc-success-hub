/**
 * One-time batch generator for pre-computed WHY texts.
 * Scope: Science, Mathematics, and Social Science only.
 *
 * Run full batch:
 *   npx vite-node src/scripts/generateWhyTexts.ts
 *
 * End-to-end smoke test (one doc):
 *   npx vite-node src/scripts/generateWhyTexts.ts --dry-run
 *
 * Requires GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env.
 * Firestore writes use firebase-admin + serviceAccount.json(.json) when present
 * (bypasses rules); otherwise client SDK (needs signed-in user per rules).
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin/app";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { doc, getDoc, getFirestore as getClientFirestore, setDoc } from "firebase/firestore";
import { SAMPLE_CHAPTERS, SAMPLE_SUBJECTS } from "@/lib/taskPriorityEngine";
import {
  getWhyTextKey,
  MASTERY_LEVELS,
  type MasteryLevel,
} from "@/lib/whyTextCache";

config({ override: true });

const COLLECTION = "why_texts";
const DELAY_MS = 13_000; // free tier: 5 req/min for gemini-2.5-flash
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 4;

const WHY_TEXT_SUBJECT_IDS = new Set(["science", "math", "social"]);

type WhyTextFields = {
  text: string;
  chapterId: string;
  level: MasteryLevel;
  subjectId: string;
  generatedAt: number;
  blueprintMarks: number;
};

type FirestoreWriter = {
  mode: string;
  getExistingText: (key: string) => Promise<string | null>;
  save: (key: string, data: WhyTextFields) => Promise<void>;
};

type GenerationJob = {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  subject: string;
  level: MasteryLevel;
  blueprintMarks: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function geminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add GEMINI_API_KEY=... to .env",
    );
  }
  return key;
}

function readServiceAccountJson(): ServiceAccount | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    return JSON.parse(inline) as ServiceAccount;
  }

  for (const name of ["serviceAccount.json", "serviceAccount.json.json"]) {
    const path = join(process.cwd(), name);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
    }
  }
  return null;
}

function clientFirebaseConfig() {
  const get = (key: string) => process.env[key];
  const apiKey = get("VITE_FIREBASE_API_KEY");
  const authDomain = get("VITE_FIREBASE_AUTH_DOMAIN");
  const projectId = get("VITE_FIREBASE_PROJECT_ID");
  const storageBucket = get("VITE_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = get("VITE_FIREBASE_MESSAGING_SENDER_ID");
  const appId = get("VITE_FIREBASE_APP_ID");

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

async function createFirestoreWriter(): Promise<FirestoreWriter> {
  // Prefer admin SDK + service account for batch writes (bypasses rules).
  const serviceAccount = readServiceAccountJson();
  if (serviceAccount) {
    if (!getAdminApps().length) {
      initAdminApp({ credential: cert(serviceAccount) });
    }
    const db = getAdminFirestore();
    return {
      mode: `firebase-admin (project: ${process.env.VITE_FIREBASE_PROJECT_ID ?? "unknown"})`,
      async getExistingText(key) {
        const snap = await db.collection(COLLECTION).doc(key).get();
        const text = snap.data()?.text;
        return typeof text === "string" && text.trim() ? text : null;
      },
      async save(key, data) {
        await db.collection(COLLECTION).doc(key).set(data);
      },
    };
  }

  // Fallback: client SDK (requires authenticated user per why_texts rules).
  const config = clientFirebaseConfig();
  if (!config) {
    throw new Error("Missing VITE_FIREBASE_* values in .env");
  }
  if (!getClientApps().length) {
    initClientApp(config);
  }
  const clientDb = getClientFirestore();
  return {
    mode: `Firebase client SDK (project: ${config.projectId})`,
    async getExistingText(key) {
      const snap = await getDoc(doc(clientDb, COLLECTION, key));
      const text = snap.data()?.text;
      return typeof text === "string" && text.trim() ? text : null;
    },
    async save(key, data) {
      await setDoc(doc(clientDb, COLLECTION, key), data);
    },
  };
}

function subjectName(subjectId: string): string {
  return SAMPLE_SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId;
}

function buildPrompt(
  chapterName: string,
  subject: string,
  blueprintMarks: number,
  level: MasteryLevel,
): string {
  return (
    "You are writing study motivation text for a Karnataka SSLC Class 10 student. " +
    "Write exactly 2 sentences.\n" +
    "Sentence 1: State what this chapter carries and the student's current mastery level.\n" +
    "Sentence 2: State the specific benefit of completing this session.\n" +
    `Chapter: ${chapterName}\n` +
    `Subject: ${subject}\n` +
    `Blueprint marks: ${blueprintMarks}\n` +
    `Mastery level: ${level}\n` +
    "Keep it factual, specific, and under 40 words total."
  );
}

async function generateWhyText(prompt: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey());
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (!text) throw new Error("Empty Gemini response");
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|503|Too Many Requests|high demand/i.test(msg);
      if (!retryable || attempt === MAX_RETRIES) break;
      const waitMs = DELAY_MS * (attempt + 1);
      console.warn(`Rate limited — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function buildJobs(dryRun: boolean): GenerationJob[] {
  if (dryRun) {
    const chapter = SAMPLE_CHAPTERS.find((c) => c.id === "electricity");
    if (!chapter) throw new Error("Dry-run chapter 'electricity' not found in SAMPLE_CHAPTERS");
    return [
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        subjectId: chapter.subjectId,
        subject: subjectName(chapter.subjectId),
        level: "Novice",
        blueprintMarks: chapter.blueprintMarks ?? 4,
      },
    ];
  }

  const jobs: GenerationJob[] = [];
  for (const chapter of SAMPLE_CHAPTERS.filter((c) => WHY_TEXT_SUBJECT_IDS.has(c.subjectId))) {
    for (const level of MASTERY_LEVELS) {
      jobs.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        subjectId: chapter.subjectId,
        subject: subjectName(chapter.subjectId),
        level,
        blueprintMarks: chapter.blueprintMarks ?? 4,
      });
    }
  }
  return jobs;
}

async function processJob(
  store: FirestoreWriter,
  job: GenerationJob,
  index: number,
  total: number,
  dryRun: boolean,
): Promise<"succeeded" | "failed" | "skipped"> {
  const key = getWhyTextKey(job.chapterId, job.level);

  try {
    if (!dryRun) {
      const existingText = await store.getExistingText(key);
      if (existingText) {
        console.log(`Skipped ${index}/${total}: ${job.chapterId} ${job.level}`);
        return "skipped";
      }
    }

    const prompt = buildPrompt(
      job.chapterTitle,
      job.subject,
      job.blueprintMarks,
      job.level,
    );
    const text = await generateWhyText(prompt);

    console.log(`\n--- Generated text (${job.chapterId} / ${job.level}) ---\n${text}\n`);

    await store.save(key, {
      text,
      chapterId: job.chapterId,
      level: job.level,
      subjectId: job.subjectId,
      generatedAt: Date.now(),
      blueprintMarks: job.blueprintMarks,
    });

    console.log(`Generated ${index}/${total}: ${job.chapterId} ${job.level}`);
    return "succeeded";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed ${index}/${total}: ${job.chapterId} ${job.level} — ${msg}`);
    return "failed";
  }
}

async function main() {
  const dryRun = isDryRun();
  const store = await createFirestoreWriter();
  const jobs = buildJobs(dryRun);
  const total = jobs.length;

  console.log(`Firestore auth: ${store.mode}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
  if (dryRun) {
    console.log("DRY RUN — generating one WHY text for electricity / Novice only\n");
  } else {
    console.log(
      `Generating WHY texts for ${SAMPLE_CHAPTERS.filter((c) => WHY_TEXT_SUBJECT_IDS.has(c.subjectId)).length} chapters × 3 levels = ${total} docs…`,
    );
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < jobs.length; i++) {
    const outcome = await processJob(store, jobs[i], i + 1, total, dryRun);
    if (outcome === "succeeded") succeeded++;
    else if (outcome === "failed") failed++;
    else skipped++;

    if (i < jobs.length - 1) await sleep(DELAY_MS);
  }

  console.log(`Summary: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
