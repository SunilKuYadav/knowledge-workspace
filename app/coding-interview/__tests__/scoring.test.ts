import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getReadiness,
  calculatePenalty,
  applyPenalties,
  clampScore,
} from '../lib/scoring';
import { formatTime } from '../lib/constants';

describe('scoring.ts pure functions', () => {
  describe('clampScore', () => {
    it('returns 0 for negative values', () => {
      expect(clampScore(-10)).toBe(0);
    });

    it('returns 100 for values above 100', () => {
      expect(clampScore(150)).toBe(100);
    });

    it('rounds to nearest integer', () => {
      expect(clampScore(72.6)).toBe(73);
      expect(clampScore(72.4)).toBe(72);
    });

    it('passes through valid integers unchanged', () => {
      expect(clampScore(50)).toBe(50);
      expect(clampScore(0)).toBe(0);
      expect(clampScore(100)).toBe(100);
    });
  });

  describe('getReadiness', () => {
    it('returns "not ready" for scores 0-39', () => {
      expect(getReadiness(0)).toBe('not ready');
      expect(getReadiness(20)).toBe('not ready');
      expect(getReadiness(39)).toBe('not ready');
    });

    it('returns "needs practice" for scores 40-59', () => {
      expect(getReadiness(40)).toBe('needs practice');
      expect(getReadiness(50)).toBe('needs practice');
      expect(getReadiness(59)).toBe('needs practice');
    });

    it('returns "almost ready" for scores 60-79', () => {
      expect(getReadiness(60)).toBe('almost ready');
      expect(getReadiness(70)).toBe('almost ready');
      expect(getReadiness(79)).toBe('almost ready');
    });

    it('returns "ready" for scores 80-100', () => {
      expect(getReadiness(80)).toBe('ready');
      expect(getReadiness(90)).toBe('ready');
      expect(getReadiness(100)).toBe('ready');
    });

    it('clamps out-of-range values before mapping', () => {
      expect(getReadiness(-5)).toBe('not ready');
      expect(getReadiness(110)).toBe('ready');
    });
  });

  describe('calculatePenalty', () => {
    it('returns zero penalties for no hints, under time, few executions', () => {
      const result = calculatePenalty(0, 5, 1800, 45);
      expect(result.hintsUsed).toBe(0);
      expect(result.timePenalty).toBe(0);
      expect(result.executionAttempts).toBe(0);
    });

    it('deducts 5 points per hint', () => {
      expect(calculatePenalty(1, 0, 0, 45).hintsUsed).toBe(5);
      expect(calculatePenalty(2, 0, 0, 45).hintsUsed).toBe(10);
      expect(calculatePenalty(4, 0, 0, 45).hintsUsed).toBe(20);
    });

    it('adds time penalty when elapsed exceeds duration', () => {
      // 45 min = 2700 seconds
      const result = calculatePenalty(0, 0, 2701, 45);
      expect(result.timePenalty).toBe(10);
    });

    it('no time penalty when exactly at limit', () => {
      const result = calculatePenalty(0, 0, 2700, 45);
      expect(result.timePenalty).toBe(0);
    });

    it('adds execution penalty for >10 attempts', () => {
      expect(calculatePenalty(0, 10, 0, 45).executionAttempts).toBe(0);
      expect(calculatePenalty(0, 11, 0, 45).executionAttempts).toBe(5);
      expect(calculatePenalty(0, 50, 0, 45).executionAttempts).toBe(5);
    });
  });

  describe('applyPenalties', () => {
    it('subtracts total penalties from base score', () => {
      const result = applyPenalties(80, { hintsUsed: 10, timePenalty: 10, executionAttempts: 5 });
      expect(result).toBe(55);
    });

    it('clamps result to 0 minimum', () => {
      const result = applyPenalties(10, { hintsUsed: 20, timePenalty: 10, executionAttempts: 5 });
      expect(result).toBe(0);
    });

    it('clamps result to 100 maximum', () => {
      const result = applyPenalties(100, { hintsUsed: 0, timePenalty: 0, executionAttempts: 0 });
      expect(result).toBe(100);
    });

    it('returns integer result', () => {
      const result = applyPenalties(75.7, { hintsUsed: 5, timePenalty: 0, executionAttempts: 0 });
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});


/**
 * Property-based tests for scoring logic.
 *
 * **Validates: Requirements 10.4, 10.5, 10.1, 10.2, 10.3**
 */
describe('scoring — property-based tests', () => {
  /* ─── Property 14: Timer Format ────────────────────────── */
  describe('Property 14: Timer format', () => {
    it('formatTime(s) produces "MM:SS" with correct padding', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 99999 }), (seconds) => {
          const result = formatTime(seconds);
          const mm = Math.floor(seconds / 60);
          const ss = seconds % 60;
          const expected = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
          expect(result).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });
  });

  /* ─── Property 15: Score Readiness Mapping ─────────────── */
  describe('Property 15: Readiness mapping', () => {
    it('score 0-39 maps to "not ready"', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 39 }), (s) => {
          expect(getReadiness(s)).toBe('not ready');
        }),
        { numRuns: 100 }
      );
    });

    it('score 40-59 maps to "needs practice"', () => {
      fc.assert(
        fc.property(fc.integer({ min: 40, max: 59 }), (s) => {
          expect(getReadiness(s)).toBe('needs practice');
        }),
        { numRuns: 100 }
      );
    });

    it('score 60-79 maps to "almost ready"', () => {
      fc.assert(
        fc.property(fc.integer({ min: 60, max: 79 }), (s) => {
          expect(getReadiness(s)).toBe('almost ready');
        }),
        { numRuns: 100 }
      );
    });

    it('score 80-100 maps to "ready"', () => {
      fc.assert(
        fc.property(fc.integer({ min: 80, max: 100 }), (s) => {
          expect(getReadiness(s)).toBe('ready');
        }),
        { numRuns: 100 }
      );
    });
  });

  /* ─── Property 16: Penalty Monotonicity ────────────────── */
  describe('Property 16: Penalty monotonicity', () => {
    it('more hints → lower or equal final score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // baseScore
          fc.integer({ min: 0, max: 20 }),   // hintsA (more)
          fc.integer({ min: 0, max: 20 }),   // hintsB (fewer)
          fc.integer({ min: 0, max: 50 }),   // executionAttempts
          fc.integer({ min: 0, max: 10800 }), // elapsedSeconds
          fc.integer({ min: 1, max: 180 }),  // durationMinutes
          (baseScore, rawHintsA, rawHintsB, execAttempts, elapsed, duration) => {
            const hintsA = Math.max(rawHintsA, rawHintsB);
            const hintsB = Math.min(rawHintsA, rawHintsB);

            const penaltiesA = calculatePenalty(hintsA, execAttempts, elapsed, duration);
            const penaltiesB = calculatePenalty(hintsB, execAttempts, elapsed, duration);

            const scoreA = applyPenalties(baseScore, penaltiesA);
            const scoreB = applyPenalties(baseScore, penaltiesB);

            expect(scoreA).toBeLessThanOrEqual(scoreB);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /* ─── Property 17: Score Range Validity ────────────────── */
  describe('Property 17: Score ranges', () => {
    it('clampScore always returns integer in [0, 100]', () => {
      fc.assert(
        fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), (score) => {
          const result = clampScore(score);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 }
      );
    });

    it('applyPenalties always returns integer in [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: 200, noNaN: true }),
          fc.record({
            hintsUsed: fc.integer({ min: 0, max: 100 }),
            timePenalty: fc.integer({ min: 0, max: 100 }),
            executionAttempts: fc.integer({ min: 0, max: 100 }),
          }),
          (baseScore, penalties) => {
            const result = applyPenalties(baseScore, penalties);
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
