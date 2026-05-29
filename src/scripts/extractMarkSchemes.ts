/**
 * Extract mark schemes from Karnataka SSLC question paper PDFs via Gemini.
 *
 * Run:
 *   npx vite-node src/scripts/extractMarkSchemes.ts
 *   npx vite-node src/scripts/extractMarkSchemes.ts --seed-science
 *   npx vite-node src/scripts/extractMarkSchemes.ts --pdf path/to/paper.pdf
 *
 * Requires GEMINI_API_KEY in .env.
 * Firestore writes use firebase-admin + serviceAccount when present.
 */
import { config } from "dotenv";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin/app";
import type {
  MarkScheme,
  MarkSchemeExamType,
  MarkSchemeQuestion,
} from "@/types/markScheme";
import { SCIENCE_CHAPTER_SEED_SCHEMES } from "@/data/markSchemes/scienceSeed";

config({ override: true });

const COLLECTION = "mark_schemes";
const DELAY_MS = 300;
const GEMINI_MODEL = "gemini-2.0-flash";
const PDF_DIR = join(process.cwd(), "public", "papers");

const EXTRACTION_PROMPT = `You are extracting a mark scheme from a Karnataka SSLC question paper PDF.

For each question in the paper, extract:
- Question number and text
- Total marks
- Expected answer points (each worth how many marks)
- Key terms that must appear for full credit
- Whether a diagram is required
- Common mistakes students make

Respond ONLY in this JSON format, no other text:
{
  "questions": [{
    "id": "string",
    "questionText": "string",
    "totalMarks": number,
    "markPoints": [{
      "description": "string",
      "marks": number,
      "mandatory": boolean,
      "gapType": "conceptual"|"procedural"|"expression"
    }],
    "keyTerms": ["string"],
    "requiresDiagram": boolean,
    "commonErrors": ["string"]
  }]
}`;

type ExtractedPayload = {
  questions: Array<{
    id: string;
    questionText: string;
    totalMarks: number;
    markPoints: Array<{
      description: string;
      marks: number;
      mandatory: boolean;
      gapType: "conceptual" | "procedural" | "expression";
    }>;
    keyTerms: string[];
    requiresDiagram: boolean;
    commonErrors: string[];
  }>;
};

type FirestoreWriter = {
  mode: string;
  exists: (id: string) => Promise<boolean>;
  save: (scheme: MarkScheme) => Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function geminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim() ||
    "";
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }
  return key;
}

function readServiceAccountJson(): ServiceAccount | null {
  for (const name of ["serviceAccount.json", "serviceAccount.json.json"]) {
    const path = join(process.cwd(), name);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
    }
  }
  return null;
}

async function createFirestoreWriter(): Promise<FirestoreWriter> {
  const serviceAccount = readServiceAccountJson();
  if (!serviceAccount) {
    throw new Error("serviceAccount.json not found — required for batch mark scheme writes");
  }

  if (!getAdminApps().length) {
    initAdminApp({ credential: cert(serviceAccount) });
  }
  const db = getAdminFirestore();

  return {
    mode: `firebase-admin (project: ${process.env.VITE_FIREBASE_PROJECT_ID ?? "unknown"})`,
    async exists(id) {
      const snap = await db.collection(COLLECTION).doc(id).get();
      return snap.exists;
    },
    async save(scheme) {
      await db.collection(COLLECTION).doc(scheme.id).set(scheme);
    },
  };
}

function shouldSkipDir(name: string): boolean {
  return name === "node_modules" || name === "dist" || name === ".git";
}

export function findProjectPdfFiles(root = PDF_DIR): string[] {
  const results: string[] = [];

  if (!existsSync(root)) {
    return results;
  }

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry);
      if (shouldSkipDir(entry)) continue;

      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile() && extname(entry).toLowerCase() === ".pdf") {
        results.push(full);
      }
    }
  }

  walk(root);
  return results.sort();
}

function slugify(value: string): string {
  return value
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function inferSubjectId(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("science") || lower.includes("sci")) return "science";
  if (lower.includes("math") || lower.includes("mathematics")) return "math";
  if (lower.includes("social")) return "social";
  if (lower.includes("english")) return "english";
  if (lower.includes("kannada")) return "kannada";
  if (lower.includes("hindi")) return "hindi";
  return "unknown";
}

function inferExamType(filename: string): MarkSchemeExamType {
  const lower = filename.toLowerCase();
  if (lower.includes("sa1") || lower.includes("summative-1")) return "sa1";
  if (lower.includes("sa2") || lower.includes("summative-2")) return "sa2";
  if (lower.includes("preparatory") || lower.includes("prep")) return "preparatory";
  if (lower.includes("board")) return "board";
  if (lower.includes("chapter")) return "chapter";
  return "board";
}

function inferYear(filename: string): number {
  const match = filename.match(/20\d{2}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}

function parseJsonFromModel(text: string): ExtractedPayload {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw) as ExtractedPayload;
}

function toMarkSchemeQuestion(
  q: ExtractedPayload["questions"][number],
  subjectId: string,
): MarkSchemeQuestion {
  return {
    id: q.id,
    questionText: q.questionText,
    chapterIds: [],
    subjectId,
    totalMarks: q.totalMarks,
    markPoints: q.markPoints.map((mp, index) => ({
      id: `mp${index + 1}`,
      description: mp.description,
      marks: mp.marks,
      mandatory: mp.mandatory,
      alternatives: [],
      gapType: mp.gapType,
    })),
    keyTerms: q.keyTerms ?? [],
    requiresDiagram: q.requiresDiagram ?? false,
    acceptableAlternatives: [],
    commonErrors: q.commonErrors ?? [],
  };
}

function buildMarkScheme(paperId: string, subjectId: string, payload: ExtractedPayload): MarkScheme {
  const questions = payload.questions.map((q) => toMarkSchemeQuestion(q, subjectId));
  const totalMarks = questions.reduce((sum, q) => sum + q.totalMarks, 0);

  return {
    id: paperId,
    paperId,
    subject: subjectId,
    examType: inferExamType(paperId),
    year: inferYear(paperId),
    totalMarks,
    questions,
    validatedByExpert: false,
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

async function extractFromPdf(pdfPath: string): Promise<ExtractedPayload> {
  const base64 = readFileSync(pdfPath).toString("base64");
  const genAI = new GoogleGenerativeAI(geminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    { text: EXTRACTION_PROMPT },
  ]);

  return parseJsonFromModel(result.response.text());
}

async function seedScienceSchemes(writer: FirestoreWriter): Promise<void> {
  console.log(`\nSeeding ${SCIENCE_CHAPTER_SEED_SCHEMES.length} Science chapter mark schemes…`);
  for (const scheme of SCIENCE_CHAPTER_SEED_SCHEMES) {
    const existed = await writer.exists(scheme.id);
    await writer.save(scheme);
    console.log(
      `  ${existed ? "updated" : "saved"}: ${scheme.id} (v${scheme.version}, ${scheme.questions.length} questions)`,
    );
  }
}

async function extractAllPdfs(writer: FirestoreWriter, pdfPaths: string[]): Promise<void> {
  if (pdfPaths.length === 0) {
    console.log(`\nNo PDF files found in ${PDF_DIR} — skipping Gemini extraction.`);
    console.log("Add Karnataka SSLC question paper PDFs to public/papers/ and re-run.");
    return;
  }

  console.log(`\nFound ${pdfPaths.length} PDF(s):`);
  for (const path of pdfPaths) {
    console.log(`  - ${relative(process.cwd(), path)}`);
  }

  for (let i = 0; i < pdfPaths.length; i++) {
    const pdfPath = pdfPaths[i];
    const filename = basename(pdfPath);
    const paperId = slugify(filename);
    const subjectId = inferSubjectId(filename);

    if (await writer.exists(paperId)) {
      console.log(`\n[${i + 1}/${pdfPaths.length}] skip (exists): ${paperId}`);
      continue;
    }

    console.log(`\n[${i + 1}/${pdfPaths.length}] extracting: ${filename}`);
    try {
      const payload = await extractFromPdf(pdfPath);
      const scheme = buildMarkScheme(paperId, subjectId, payload);
      await writer.save(scheme);
      console.log(`  saved: ${scheme.id} (${scheme.questions.length} questions, ${scheme.totalMarks} marks)`);
    } catch (err) {
      console.error(`  failed: ${filename}`, err instanceof Error ? err.message : err);
    }

    if (i < pdfPaths.length - 1) {
      await sleep(DELAY_MS);
    }
  }
}

async function main(): Promise<void> {
  const seedOnly = process.argv.includes("--seed-science");
  const pdfArgIndex = process.argv.indexOf("--pdf");
  const singlePdf = pdfArgIndex >= 0 ? process.argv[pdfArgIndex + 1] : null;

  const writer = await createFirestoreWriter();
  console.log(`Firestore writer: ${writer.mode}`);

  await seedScienceSchemes(writer);

  if (seedOnly) {
    console.log("\nDone (--seed-science only).");
    return;
  }

  const pdfPaths = singlePdf
    ? [singlePdf]
    : findProjectPdfFiles();

  await extractAllPdfs(writer, pdfPaths);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
