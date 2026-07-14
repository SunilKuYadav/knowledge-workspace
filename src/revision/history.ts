/**
 * Revision history management utilities.
 *
 * Pure functions for updating revision data and extracting confidence trends.
 */

import type { RevisionData, RevisionEntry } from "@/types";
import { computeNextReview } from "./scheduler";

/** Initial interval for first-ever review: 7 days from first solve. */
const INITIAL_INTERVAL_DAYS = 7;

/**
 * Check if a review date is on or after the scheduled nextReview date.
 * Comparison is date-only (ignoring time).
 */
function isOnOrAfterReviewDate(reviewDate: string, nextReview: string): boolean {
  const review = reviewDate.split("T")[0];
  const scheduled = nextReview.split("T")[0];
  return review >= scheduled;
}

/**
 * Add a revision entry to an existing RevisionData, returning a new RevisionData
 * with updated history, lastReviewed, nextReview, and confidence.
 *
 * Rules:
 * - First review ever (problem just started): nextReview is set to exactly
 *   7 days from the review date. No multiplier applied.
 * - Subsequent reviews: only update nextReview if the practice happens on or after
 *   the scheduled review date. If the user practices before the review date,
 *   the entry is logged in history but nextReview remains unchanged.
 * - Maximum interval is capped at 350 days (enforced by calculateInterval).
 *
 * @param current - The current RevisionData
 * @param entry - The new RevisionEntry to add
 * @returns A new RevisionData object (does not mutate the original)
 */
export function addRevisionEntry(
  current: RevisionData,
  entry: RevisionEntry,
): RevisionData {
  // First-ever review — set fixed initial interval of 7 days (no multiplier)
  if (!current.lastReviewed || current.history.length === 0) {
    const reviewDateObj = new Date(entry.date);
    reviewDateObj.setDate(reviewDateObj.getDate() + INITIAL_INTERVAL_DAYS);
    const nextReview = reviewDateObj.toISOString().split("T")[0];

    return {
      ...current,
      lastReviewed: entry.date,
      nextReview,
      confidence: entry.confidence,
      history: [...current.history, entry],
    };
  }

  // Practicing before the scheduled review date — log it but don't reschedule
  if (!isOnOrAfterReviewDate(entry.date, current.nextReview)) {
    return {
      ...current,
      // Keep lastReviewed, nextReview, and confidence unchanged
      history: [...current.history, entry],
    };
  }

  // On or after review date — apply normal spaced repetition scheduling
  const last = new Date(current.lastReviewed);
  const next = new Date(current.nextReview);
  const diffMs = next.getTime() - last.getTime();
  const previousInterval = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  const { nextReview } = computeNextReview({
    currentConfidence: entry.confidence,
    previousInterval,
    reviewDate: entry.date,
  });

  return {
    ...current,
    lastReviewed: entry.date,
    nextReview,
    confidence: entry.confidence,
    history: [...current.history, entry],
  };
}

/**
 * Extract a confidence trend from revision history entries.
 *
 * @param history - Array of RevisionEntry items
 * @returns Array of { date, confidence } pairs in the same order as the input
 */
export function getConfidenceTrend(
  history: RevisionEntry[],
): { date: string; confidence: number }[] {
  return history.map((entry) => ({
    date: entry.date,
    confidence: entry.confidence,
  }));
}
