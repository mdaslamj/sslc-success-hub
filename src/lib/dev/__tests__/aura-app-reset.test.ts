import assert from "node:assert/strict";
import {
  AURA_CACHE_VERSION,
  isAuraLocalStorageKey,
} from "@/lib/dev/aura-cache-registry";
import {
  readAuraCacheVersion,
  repairCorruptedAuraStorage,
  sweepAuraLocalStorage,
  writeAuraCacheVersion,
} from "@/lib/dev/aura-app-reset";

assert.equal(AURA_CACHE_VERSION, "v3");
assert.equal(isAuraLocalStorageKey("aura_profile"), true);
assert.equal(isAuraLocalStorageKey("exam:exam:mock_math"), true);
assert.equal(isAuraLocalStorageKey("v2_chapter_math_real-numbers"), true);
assert.equal(isAuraLocalStorageKey("v3_chapter_math_real-numbers"), true);
assert.equal(isAuraLocalStorageKey("vidyapath.planner.v1"), true);
assert.equal(isAuraLocalStorageKey("unrelated-app-key"), false);
assert.equal(isAuraLocalStorageKey("google-analytics"), false);

const storage = new Map<string, string>();
const mockLocalStorage = {
  get length() {
    return storage.size;
  },
  key(index: number) {
    return [...storage.keys()][index] ?? null;
  },
  getItem(key: string) {
    return storage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    storage.set(key, value);
  },
  removeItem(key: string) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  },
};

(globalThis as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

storage.set("aura_profile", "{not-json");
storage.set("exam:exam:mock_1", "{}");
storage.set("unrelated", "keep");

const corrupted = repairCorruptedAuraStorage();
assert.ok(corrupted.includes("aura_profile"));
assert.equal(storage.has("exam:exam:mock_1"), true);
assert.equal(storage.has("unrelated"), true);

writeAuraCacheVersion("v2");
assert.equal(readAuraCacheVersion(), "v2");

const sweep = sweepAuraLocalStorage();
assert.ok(sweep.localStorageRemoved >= 1);
assert.equal(storage.has("unrelated"), true);
assert.equal(storage.has("exam:exam:mock_1"), false);

writeAuraCacheVersion(AURA_CACHE_VERSION);
assert.equal(readAuraCacheVersion(), AURA_CACHE_VERSION);

console.log("aura-app-reset tests passed");
