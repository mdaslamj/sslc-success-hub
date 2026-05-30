import assert from "node:assert/strict";

import fixtureProfile from "@/data/StudentLearningProfile.json";
import {
  PROFILE_STORAGE_KEY,
  PROFILE_SCHEMA_VERSION,
  PROFILE_VERSION_KEY,
  applyAppendSession,
  applyUpdateMastery,
  deriveTrendFromReadings,
  loadInitialProfileStorage,
  readStoredProfile,
  toProfileStorage,
  writeStoredProfile,
} from "@/hooks/useStudentProfile";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

type MemoryStorage = {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function withMockLocalStorage<T>(run: (storage: MemoryStorage) => T): T {
  const memory = createMemoryStorage();
  const original = globalThis.localStorage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memory,
  });

  try {
    return run(memory);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: original,
    });
  }
}

function testLoadFallsBackToEmptyProfileWhenEmpty(): void {
  withMockLocalStorage((storage) => {
    storage.clear();
    const loaded = loadInitialProfileStorage();

    assert.equal(loaded.sessionHistory.length, 0);
    assert.equal(Object.keys(loaded.chapterMastery.math).length, 0);
    assert.ok(storage.getItem(PROFILE_STORAGE_KEY));
    assert.equal(storage.getItem(PROFILE_VERSION_KEY), PROFILE_SCHEMA_VERSION);
  });
}

function testPersistAndReloadFromLocalStorage(): void {
  withMockLocalStorage((storage) => {
    storage.clear();

    const updated = applyUpdateMastery(
      toProfileStorage(fixtureProfile as StudentLearningProfile, {}),
      "science",
      "electricity",
      52,
    );
    writeStoredProfile(updated);

    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    assert.ok(raw);

    const reloaded = readStoredProfile();
    assert.ok(reloaded);
    assert.equal(reloaded.chapterMastery.science.electricity.mastery, 52);
  });
}

function testUpdateMasteryTrendFromPreviousReadings(): void {
  const base = toProfileStorage(fixtureProfile as StudentLearningProfile, {
    "science:electricity": [40, 42, 44],
  });

  const updated = applyUpdateMastery(base, "science", "electricity", 50);
  assert.equal(updated.chapterMastery.science.electricity.trend, "improving");
  assert.deepEqual(updated._masteryReadings?.["science:electricity"], [42, 44, 50]);
}

function testAppendSessionPersistsHistory(): void {
  withMockLocalStorage((storage) => {
    storage.clear();

    const base = toProfileStorage(fixtureProfile as StudentLearningProfile, {});
    const appended = applyAppendSession(base, {
      date: "2025-05-28",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 35,
      questionsAttempted: 10,
      questionsCorrect: 7,
      score: 70,
      hintsUsed: 1,
      retriesOnWrong: 2,
      completedPlan: true,
      panicSignal: false,
      engineType: "adaptive",
    });

    writeStoredProfile(appended);
    const reloaded = readStoredProfile();
    assert.ok(reloaded);
    assert.equal(reloaded.sessionHistory.length, base.sessionHistory.length + 1);
    assert.ok(reloaded.chapterMastery.math.triangles.mastery > 0);
  });
}

function testDeriveTrendStableDecliningImproving(): void {
  assert.equal(deriveTrendFromReadings([70, 71, 72], 73), "stable");
  assert.equal(deriveTrendFromReadings([80, 79, 78], 70), "declining");
  assert.equal(deriveTrendFromReadings([40, 42, 44], 50), "improving");
}

function testFixtureProfileShape(): void {
  const profile = fixtureProfile as unknown as StudentLearningProfile;
  assert.ok(profile.chapterMastery.science.electricity);
  assert.ok(profile.sessionHistory.length > 0);
}

export function runUseStudentProfileTests(): void {
  testLoadFallsBackToEmptyProfileWhenEmpty();
  testPersistAndReloadFromLocalStorage();
  testUpdateMasteryTrendFromPreviousReadings();
  testAppendSessionPersistsHistory();
  testDeriveTrendStableDecliningImproving();
  testFixtureProfileShape();
  console.log("useStudentProfile tests passed");
}

runUseStudentProfileTests();
