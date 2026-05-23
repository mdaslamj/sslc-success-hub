#!/usr/bin/env node
/**
 * Auto-discovers every chapter JSON inside
 * `public/content/chapters/social-science/` and writes a manifest.json the
 * runtime loader can consume. Re-run any time chapters are added/removed:
 *
 *   bun scripts/generate-social-science-manifest.mjs
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const DIR = "public/content/chapters/social-science";

const SECTION_KN = {
  History: "ಇತಿಹಾಸ",
  Geography: "ಭೂಗೋಳಶಾಸ್ತ್ರ",
  Economics: "ಅರ್ಥಶಾಸ್ತ್ರ",
  Sociology: "ಸಮಾಜಶಾಸ್ತ್ರ",
  "Business Studies": "ವ್ಯಾಪಾರ ಅಧ್ಯಯನ",
  "Political Science": "ರಾಜ್ಯಶಾಸ್ತ್ರ",
  Civics: "ಪೌರನೀತಿ",
};

const SECTION_DIFFICULTY = {
  History: "medium",
  Geography: "medium",
  Economics: "hard",
  Sociology: "easy",
  "Business Studies": "medium",
};

const SECTION_BLUEPRINT = {
  History: 4,
  Geography: 4,
  Economics: 5,
  Sociology: 3,
  "Business Studies": 3,
};

// Official Karnataka SSLC Social Science chapter sequence (1–33).
// Maps file basename (without .json) → fixed official chapter number.
// DO NOT derive numbering from folders, sections, or filename prefixes.
const OFFICIAL_ORDER = {
  chapter_01_advent_of_europeans: 1,
  chapter_02_extension_british_rule: 2,
  chapter_03_impact_british_rule: 3,
  chapter_04_opposition_british_karnataka: 4,
  chapter_05_social_religious_reform: 5,
  chapter_01_public_administration: 6,
  chapter_02_challenges_india: 7,
  chapter_01_social_stratification: 8,
  chapter_02_work_economic_life: 9,
  chapter_01_india__geographical_position_and_physica: 10,
  chapter_02_india__seasons: 11,
  chapter_03_india__soils: 12,
  chapter_04_india_forest_resources: 13,
  chapter_05_india__water_resources: 14,
  chapter_01_economy_government: 15,
  chapter_01_banking_transactions: 16,
  chapter_06_first_war_independence: 17,
  chapter_07_freedom_struggle: 18,
  chapter_08_india_after_independence: 19,
  chapter_09_world_wars: 20,
  chapter_03_foreign_policy: 21,
  chapter_04_world_organisations: 22,
  chapter_03_collective_behaviour: 23,
  chapter_04_social_challenges: 24,
  chapter_06_india__land_use_and_agriculture: 25,
  chapter_07_india__mineral_and_power_resources: 26,
  chapter_08_india_transport_and_communication: 27,
  chapter_09_india__major_industries: 28,
  chapter_10_india__natural_disasters: 29,
  chapter_02_rural_development: 30,
  chapter_03_public_finance_budget: 31,
  chapter_02_entrepreneurship: 32,
  chapter_03_consumer_education: 33,
};

// Recursive scan — accept ANY .json file regardless of name pattern.
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) out.push(p);
  }
  return out;
}

const allJson = (await walk(DIR)).filter((p) => !p.endsWith("manifest.json")).sort();
console.log(`[manifest] discovered ${allJson.length} .json file(s) under ${DIR}:`);
for (const p of allJson) console.log(`  • ${relative(DIR, p)}`);

const chapters = [];
const skipped = [];
let emptyCount = 0;

for (const fullPath of allJson) {
  const rel = relative(DIR, fullPath);
  const id = rel.replace(/\.json$/i, "").replace(/[\\/]/g, "__");
  let raw;
  try {
    raw = await readFile(fullPath, "utf8");
  } catch (err) {
    skipped.push({ file: rel, reason: `read error: ${err.message}` });
    continue;
  }
  if (!raw.trim()) {
    skipped.push({ file: rel, reason: "empty file" });
    emptyCount++;
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    skipped.push({ file: rel, reason: `invalid JSON — ${err.message}` });
    continue;
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    skipped.push({ file: rel, reason: "JSON root is not an object" });
    continue;
  }
  const section = doc.section ?? "General";
  const officialNumber = OFFICIAL_ORDER[id];
  if (officialNumber === undefined) {
    skipped.push({ file: rel, reason: `not in OFFICIAL_ORDER (id=${id})` });
    continue;
  }
  chapters.push({
    id,
    chapterRef: doc.chapter_id ?? id,
    chapterNumber: officialNumber,
    title: doc.chapter_name ?? id,
    titleKn: doc.chapter_name_kn ?? null,
    section,
    sectionKn: SECTION_KN[section] ?? null,
    difficulty: SECTION_DIFFICULTY[section] ?? "medium",
    blueprintMarks: SECTION_BLUEPRINT[section] ?? 3,
    status: "ready",
    filePath: `chapters/social-science/${rel.replace(/\\/g, "/")}`,
  });
}

// Strict official order 1–33 (never re-derived from section/folder).
const SECTION_ORDER = ["History", "Political Science", "Sociology", "Geography", "Economics", "Business Studies"];
chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

const manifest = {
  subjectId: "social-science",
  subjectTitle: "Social Science",
  subjectTitleKn: "ಸಮಾಜ ವಿಜ್ಞಾನ",
  subjectCode: "85-E",
  board: "Karnataka SSLC",
  totalChapters: chapters.length,
  version: "1.1",
  lastUpdated: new Date().toISOString().slice(0, 7),
  schemaVersion: "1.0",
  features: ["mcqs", "one-mark", "two-mark", "three-mark", "key-terms", "kannada-labels"],
  sections: SECTION_ORDER.filter((s) => chapters.some((c) => c.section === s)).map((s) => ({
    id: s,
    title: s,
    titleKn: SECTION_KN[s] ?? null,
    chapterCount: chapters.filter((c) => c.section === s).length,
  })),
  chapters,
};

await writeFile(join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log("\n[manifest] ───── Discovery report ─────");
console.log(`  Total .json files discovered : ${allJson.length}`);
console.log(`  Indexed chapters             : ${chapters.length}`);
console.log(`  Skipped / rejected           : ${skipped.length}`);
if (skipped.length) {
  console.log("  Rejection details:");
  for (const s of skipped) console.log(`    ✗ ${s.file}  →  ${s.reason}`);
}
console.log(`  Sections                     : ${manifest.sections.length}`);
console.log(`[manifest] wrote ${chapters.length} chapters to manifest.json`);
