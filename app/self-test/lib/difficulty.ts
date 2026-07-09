import type { DifficultyLevel } from "./types";
import { DIFFICULTY_UP_THRESHOLD, DIFFICULTY_DOWN_THRESHOLD } from "./constants";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["easy", "medium", "hard"];

/**
 * Derive initial difficulty from topic confidence + experience level.
 * - confidence 1-2 → easy, 3 → medium, 4-5 → hard
 * - 15 YOE shifts one level harder (clamped at hard)
 * - 5 YOE shifts one level easier (clamped at easy)
 * - 10 YOE no shift
 */
export function deriveInitialDifficulty(
  confidence: number,
  experienceLevel: 5 | 10 | 15
): DifficultyLevel {
  let baseIndex: number;
  if (confidence <= 2) {
    baseIndex = 0; // easy
  } else if (confidence === 3) {
    baseIndex = 1; // medium
  } else {
    baseIndex = 2; // hard
  }

  let shift = 0;
  if (experienceLevel === 15) shift = 1;
  if (experienceLevel === 5) shift = -1;

  const finalIndex = Math.max(0, Math.min(2, baseIndex + shift));
  return DIFFICULTY_LEVELS[finalIndex];
}

/**
 * Adjust difficulty for next phase based on current phase score.
 * - score >= 8 → one level harder (clamped at hard)
 * - score <= 4 → one level easier (clamped at easy)
 * - 5-7 → maintain current
 */
export function adjustDifficulty(
  currentDifficulty: DifficultyLevel,
  phaseScore: number
): DifficultyLevel {
  const currentIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);

  if (phaseScore >= DIFFICULTY_UP_THRESHOLD) {
    return DIFFICULTY_LEVELS[Math.min(2, currentIndex + 1)];
  }

  if (phaseScore <= DIFFICULTY_DOWN_THRESHOLD) {
    return DIFFICULTY_LEVELS[Math.max(0, currentIndex - 1)];
  }

  return currentDifficulty;
}
