/* ─── Duration Constants ─────────────────────────────────── */

/** Default interview duration in minutes */
export const DEFAULT_DURATION = 45;

/** Minimum allowed interview duration in minutes */
export const MIN_DURATION = 1;

/** Maximum allowed interview duration in minutes */
export const MAX_DURATION = 180;

/* ─── Execution Constants ────────────────────────────────── */

/** Timeout for a single test case execution in milliseconds */
export const EXECUTION_TIMEOUT = 5000;

/** Timeout for AI service calls in milliseconds */
export const AI_TIMEOUT = 300000;

/** Maximum length of console output before truncation */
export const MAX_OUTPUT_LENGTH = 10000;

/* ─── Timer Constants ────────────────────────────────────── */

/** Seconds remaining at which the warning indicator activates */
export const WARNING_THRESHOLD_SECONDS = 300;

/* ─── Utility Functions ──────────────────────────────────── */

/**
 * Formats a number of seconds into MM:SS string with zero-padding.
 * Examples: 0 → "00:00", 65 → "01:05", 3600 → "60:00"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${mm}:${ss}`;
}
