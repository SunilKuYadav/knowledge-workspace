/**
 * Spaced repetition scheduler.
 *
 * Computes the next review date by applying confidence-based interval
 * calculation to the review date.
 */

import { calculateInterval } from "./confidence";

export interface SchedulerInput {
  currentConfidence: 1 | 2 | 3 | 4 | 5;
  previousInterval: number; // days since last review
  reviewDate: string; // ISO date string
}

export interface SchedulerOutput {
  nextReview: string; // ISO date string
  intervalDays: number;
}

/**
 * Compute the next review date based on confidence and previous interval.
 *
 * Internally calls `calculateInterval()` to determine the number of days,
 * then adds those days to the reviewDate.
 *
 * @param input - Scheduler input with confidence, previous interval, and review date
 * @returns The next review ISO date string and the computed interval in days
 */
export function computeNextReview(input: SchedulerInput): SchedulerOutput {
  const { currentConfidence, previousInterval, reviewDate } = input;

  const intervalDays = calculateInterval(currentConfidence, previousInterval);

  const reviewDateObj = new Date(reviewDate);
  reviewDateObj.setDate(reviewDateObj.getDate() + intervalDays);

  const nextReview = reviewDateObj.toISOString().split("T")[0];

  return { nextReview, intervalDays };
}
