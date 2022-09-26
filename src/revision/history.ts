/**
 * Revision history management utilities.
 *
 * Pure functions for updating revision data and extracting confidence trends.
 */

import type { RevisionData, RevisionEntry } from '@/types';
import { computeNextReview } from './scheduler';

/**
 * Add a revision entry to an existing RevisionData, returning a new RevisionData
 * with updated history, lastReviewed, nextReview, and confidence.
 *
 * The nextReview date is computed using the spaced repetition scheduler based on
 * the entry's confidence and the current interval (days between lastReviewed and
 * the current nextReview, or 1 if no previous review exists).
 *
 * @param current - The current RevisionData
 * @param entry - The new RevisionEntry to add
 * @returns A new RevisionData object (does not mutate the original)
 */
export function addRevisionEntry(
  current: RevisionData,
  entry: RevisionEntry
): RevisionData {
  // Determine previous interval
  let previousInterval = 1;
  if (current.lastReviewed) {
    const last = new Date(current.lastReviewed);
    const next = new Date(current.nextReview);
    const diffMs = next.getTime() - last.getTime();
    previousInterval = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

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
  history: RevisionEntry[]
): { date: string; confidence: number }[] {
  return history.map((entry) => ({
    date: entry.date,
    confidence: entry.confidence,
  }));
}
