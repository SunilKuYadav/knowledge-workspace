/**
 * Pure scoring functions for the coding interview module.
 *
 * These functions handle readiness mapping, penalty calculation, and score
 * clamping without any AI calls or side effects.
 *
 * Requirements: 10 (AC 1-8)
 */

/* ─── Readiness Mapping ──────────────────────────────────── */

export type Readiness = 'not ready' | 'needs practice' | 'almost ready' | 'ready';

/**
 * Maps an overall score (0-100) to an interview readiness rating.
 *
 * Thresholds:
 * - 0-39  → 'not ready'
 * - 40-59 → 'needs practice'
 * - 60-79 → 'almost ready'
 * - 80-100 → 'ready'
 */
export function getReadiness(score: number): Readiness {
  const clamped = clampScore(score);
  if (clamped <= 39) return 'not ready';
  if (clamped <= 59) return 'needs practice';
  if (clamped <= 79) return 'almost ready';
  return 'ready';
}

/* ─── Penalty Calculation ────────────────────────────────── */

export interface Penalties {
  hintsUsed: number;
  timePenalty: number;
  executionAttempts: number;
}

/** Points deducted per hint used */
const HINT_PENALTY_PER_HINT = 5;

/** Points deducted for exceeding the time limit */
const TIME_EXCEEDED_PENALTY = 10;

/** Threshold for excessive execution attempts */
const EXCESSIVE_EXECUTION_THRESHOLD = 10;

/** Points deducted for excessive execution attempts */
const EXCESSIVE_EXECUTION_PENALTY = 5;

/**
 * Calculates penalty values based on session behavior.
 *
 * - Each hint deducts 5 points
 * - Exceeding the configured time limit adds a 10-point penalty
 * - More than 10 execution attempts adds a 5-point penalty
 */
export function calculatePenalty(
  hintsUsed: number,
  executionAttempts: number,
  elapsedSeconds: number,
  durationMinutes: number
): Penalties {
  const hintPenalty = hintsUsed * HINT_PENALTY_PER_HINT;

  const timeLimitSeconds = durationMinutes * 60;
  const timePenalty = elapsedSeconds > timeLimitSeconds ? TIME_EXCEEDED_PENALTY : 0;

  const executionPenalty =
    executionAttempts > EXCESSIVE_EXECUTION_THRESHOLD ? EXCESSIVE_EXECUTION_PENALTY : 0;

  return {
    hintsUsed: hintPenalty,
    timePenalty,
    executionAttempts: executionPenalty,
  };
}

/* ─── Score Application ──────────────────────────────────── */

/**
 * Applies penalties to a base score and clamps the result to [0, 100].
 */
export function applyPenalties(baseScore: number, penalties: Penalties): number {
  const total = penalties.hintsUsed + penalties.timePenalty + penalties.executionAttempts;
  return clampScore(baseScore - total);
}

/* ─── Score Clamping ─────────────────────────────────────── */

/**
 * Clamps a score to an integer in the range [0, 100].
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
