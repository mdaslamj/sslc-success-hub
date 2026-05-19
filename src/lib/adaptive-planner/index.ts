/**
 * Adaptive Study Planner & Academic Intervention Engine.
 *
 * Pure functions over weakness profiles + chapter context → intervention
 * plans, adaptive schedules, revision queue cards, remediation sessions.
 * No Firestore reads/writes — callers compose with the matching services.
 */
export * from "./priority";
export * from "./difficulty";
export * from "./plan-builder";