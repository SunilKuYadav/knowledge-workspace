/**
 * Spaced repetition categorization and prioritization utilities.
 *
 * All functions are pure — no side effects.
 */

import type { RevisionData } from '@/types';

export type RevisionCategory = 'overdue' | 'due-today' | 'upcoming';

/**
 * Categorize a revision item based on its next review date relative to the current date.
 * Comparison is date-only (ignoring time).
 *
 * @param nextReview - ISO date string for next scheduled review
 * @param currentDate - ISO date string for the current date
 * @returns 'overdue' | 'due-today' | 'upcoming'
 */
export function categorizeRevisionItem(
  nextReview: string,
  currentDate: string
): RevisionCategory {
  const next = nextReview.split('T')[0];
  const current = currentDate.split('T')[0];

  if (next < current) return 'overdue';
  if (next === current) return 'due-today';
  return 'upcoming';
}

/**
 * Get items that are due for review (overdue or due today).
 *
 * @param items - Array of RevisionData items
 * @param currentDate - ISO date string for the current date
 * @returns Items where category is 'overdue' or 'due-today'
 */
export function getDueItems(
  items: RevisionData[],
  currentDate: string
): RevisionData[] {
  return items.filter((item) => {
    const category = categorizeRevisionItem(item.nextReview, currentDate);
    return category === 'overdue' || category === 'due-today';
  });
}

/**
 * Sort revision items by priority:
 *   1. Overdue items first (oldest nextReview first within overdue)
 *   2. Due-today items
 *   3. Upcoming items
 *
 * @param items - Array of RevisionData items
 * @param currentDate - ISO date string for the current date
 * @returns A new sorted array (does not mutate the original)
 */
export function sortByPriority(
  items: RevisionData[],
  currentDate: string
): RevisionData[] {
  const categoryOrder: Record<RevisionCategory, number> = {
    overdue: 0,
    'due-today': 1,
    upcoming: 2,
  };

  return [...items].sort((a, b) => {
    const catA = categorizeRevisionItem(a.nextReview, currentDate);
    const catB = categorizeRevisionItem(b.nextReview, currentDate);

    const orderDiff = categoryOrder[catA] - categoryOrder[catB];
    if (orderDiff !== 0) return orderDiff;

    // Within the same category, sort by nextReview date ascending (oldest first)
    const dateA = a.nextReview.split('T')[0];
    const dateB = b.nextReview.split('T')[0];
    return dateA.localeCompare(dateB);
  });
}
