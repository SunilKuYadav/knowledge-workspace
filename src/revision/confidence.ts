/**
 * Confidence-based interval calculation for spaced repetition.
 *
 * Multipliers:
 *   confidence 1 → 0.5x (reduce interval — struggling)
 *   confidence 2 → 1x   (maintain interval — unsure)
 *   confidence 3 → 2x   (double interval — comfortable)
 *   confidence 4 → 3x   (triple interval — confident)
 *   confidence 5 → 5x   (5x interval — mastered)
 *
 * Minimum interval is always 1 day.
 * Default previousInterval (for first review) is 1 day.
 */

type Confidence = 1 | 2 | 3 | 4 | 5;

const INTERVAL_MULTIPLIERS: Record<Confidence, number> = {
  1: 0.5,
  2: 1,
  3: 2,
  4: 3,
  5: 5,
};

/**
 * Calculate the next review interval in days based on confidence and previous interval.
 *
 * @param confidence - User's confidence level (1-5)
 * @param previousInterval - Days since last review (defaults to 1 for first review)
 * @returns The new interval in days (minimum 1)
 */
export function calculateInterval(
  confidence: Confidence,
  previousInterval: number = 1,
): number {
  const interval = previousInterval <= 0 ? 1 : previousInterval;
  const multiplier = INTERVAL_MULTIPLIERS[confidence];
  const newInterval = Math.round(interval * multiplier);
  return Math.max(1, newInterval);
}
