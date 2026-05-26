/**
 * use-mock-exam-history.ts — Task 13
 * Saves and retrieves past mock exam results from localStorage.
 */

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockExamRecord = {
  id: string;
  dateTaken: number;        // timestamp
  score: number;
  total: number;
  accuracy: number;         // 0-100
  timeTakenSecs: number;
  subjectBreakdown: {
    subjectName: string;
    correct: number;
    total: number;
  }[];
};

const STORAGE_KEY = "aura_mock_exam_history_v1";
const MAX_RECORDS = 20;

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadHistory(): MockExamRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(records: MockExamRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {}
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type MockExamHistoryEngine = {
  history: MockExamRecord[];
  addRecord: (record: Omit<MockExamRecord, "id" | "dateTaken">) => void;
  clearHistory: () => void;
  bestScore: number | null;
  averageAccuracy: number | null;
  totalExamsTaken: number;
};

export function useMockExamHistory(): MockExamHistoryEngine {
  const [history, setHistory] = useState<MockExamRecord[]>(loadHistory);

  const addRecord = useCallback((record: Omit<MockExamRecord, "id" | "dateTaken">) => {
    const newRecord: MockExamRecord = {
      ...record,
      id: `exam-${Date.now()}`,
      dateTaken: Date.now(),
    };
    setHistory((prev) => {
      const updated = [newRecord, ...prev].slice(0, MAX_RECORDS);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const bestScore = history.length > 0
    ? Math.max(...history.map((r) => r.accuracy))
    : null;

  const averageAccuracy = history.length > 0
    ? Math.round(history.reduce((s, r) => s + r.accuracy, 0) / history.length)
    : null;

  return {
    history,
    addRecord,
    clearHistory,
    bestScore,
    averageAccuracy,
    totalExamsTaken: history.length,
  };
}
