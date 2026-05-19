/**
 * Weakness Diagnosis & Adaptive Remediation Engine.
 *
 * Pure functions over performance records → weakness profile → remediation
 * plan. No Firestore reads/writes here — callers compose with the
 * `performance-records`, `weakness-profiles`, `remediation-plans` services.
 */
export * from "./diagnose";
export * from "./remediate";
export * from "./chapter-intelligence";