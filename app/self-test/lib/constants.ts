import type { AssessmentPhaseType } from "./types";

/* ─── Phase Configuration ────────────────────────────────── */

/** Ordered array of assessment phases */
export const PHASE_ORDER: readonly AssessmentPhaseType[] = [
  "conceptual",
  "mcq",
  "applied",
  "code-challenge",
] as const;

/** Number of questions generated per phase */
export const PHASE_QUESTION_COUNTS = {
  min: 2,
  max: 3,
} as const;

/* ─── Scoring Weights ────────────────────────────────────── */

/**
 * Weights for computing overall confidence score.
 * Applied and Code Challenge weighted higher (30% each) because
 * they better validate real understanding.
 */
export const SCORING_WEIGHTS: Record<AssessmentPhaseType, number> = {
  conceptual: 0.2,
  mcq: 0.2,
  applied: 0.3,
  "code-challenge": 0.3,
} as const;

/* ─── Thresholds ─────────────────────────────────────────── */

/** Minimum confidence score (1-5) required to mark a topic as completed */
export const COMPLETION_THRESHOLD = 4.5;

/** Phase score below which early exit is offered (Conceptual phase only) */
export const EARLY_EXIT_THRESHOLD = 3;

/** Phase score at or above which difficulty increases for next phase */
export const DIFFICULTY_UP_THRESHOLD = 8;

/** Phase score at or below which difficulty decreases for next phase */
export const DIFFICULTY_DOWN_THRESHOLD = 4;

/** Maximum number of assessment records retained per topic */
export const MAX_HISTORY_RECORDS = 50;

/** Maximum character count for topic content sent to AI */
export const CONTENT_TRUNCATION_LIMIT = 12000;
