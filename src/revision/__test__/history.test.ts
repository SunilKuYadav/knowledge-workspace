import { describe, it, expect } from 'vitest';
import { addRevisionEntry, getConfidenceTrend } from './history';
import type { RevisionData, RevisionEntry } from '@/types';

describe('addRevisionEntry', () => {
  const baseRevisionData: RevisionData = {
    itemId: 'binary-trees',
    itemType: 'topic',
    lastReviewed: null,
    nextReview: '2024-01-15',
    confidence: 3,
    history: [],
  };

  it('adds entry to history array', () => {
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 4,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toEqual(entry);
  });

  it('updates lastReviewed to entry date', () => {
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 4,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.lastReviewed).toBe('2024-01-15');
  });

  it('updates confidence to entry confidence', () => {
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 5,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.confidence).toBe(5);
  });

  it('computes nextReview date', () => {
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 3,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    // First review: previousInterval defaults to 1, conf 3 → 1 * 2 = 2 days
    expect(result.nextReview).toBe('2024-01-17');
  });

  it('does not mutate the original RevisionData', () => {
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 4,
    };
    const original = { ...baseRevisionData, history: [...baseRevisionData.history] };
    addRevisionEntry(baseRevisionData, entry);
    expect(baseRevisionData).toEqual(original);
  });

  it('appends to existing history', () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: '2024-01-10',
      nextReview: '2024-01-15',
      history: [{ id: 'rev-000', date: '2024-01-10', confidence: 2 }],
    };
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 4,
    };
    const result = addRevisionEntry(existing, entry);
    expect(result.history).toHaveLength(2);
    expect(result.history[1]).toEqual(entry);
  });

  it('computes interval based on previous lastReviewed and nextReview gap', () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: '2024-01-10',
      nextReview: '2024-01-15', // 5 day interval
      confidence: 3,
      history: [{ id: 'rev-000', date: '2024-01-10', confidence: 3 }],
    };
    const entry: RevisionEntry = {
      id: 'rev-001',
      date: '2024-01-15',
      confidence: 3,
    };
    const result = addRevisionEntry(existing, entry);
    // previousInterval = 5, conf 3 → 5 * 2 = 10 days
    expect(result.nextReview).toBe('2024-01-25');
  });
});

describe('getConfidenceTrend', () => {
  it('returns empty array for empty history', () => {
    expect(getConfidenceTrend([])).toEqual([]);
  });

  it('maps history entries to date/confidence pairs', () => {
    const history: RevisionEntry[] = [
      { id: 'r1', date: '2024-01-10', confidence: 2 },
      { id: 'r2', date: '2024-01-15', confidence: 3 },
      { id: 'r3', date: '2024-01-25', confidence: 4 },
    ];
    const result = getConfidenceTrend(history);
    expect(result).toEqual([
      { date: '2024-01-10', confidence: 2 },
      { date: '2024-01-15', confidence: 3 },
      { date: '2024-01-25', confidence: 4 },
    ]);
  });

  it('preserves input order', () => {
    const history: RevisionEntry[] = [
      { id: 'r1', date: '2024-01-25', confidence: 5 },
      { id: 'r2', date: '2024-01-10', confidence: 1 },
    ];
    const result = getConfidenceTrend(history);
    expect(result[0].date).toBe('2024-01-25');
    expect(result[1].date).toBe('2024-01-10');
  });
});
