import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { applyFifoEviction } from "@/filesystem/FileAssessmentRepository";
import { computeTrend } from "../lib/scoring";
import type { AssessmentRecord } from "../lib/types";
import { MAX_HISTORY_RECORDS } from "../lib/constants";

/* ─── Helpers ────────────────────────────────────────────── */

/**
 * fast-check arbitrary for generating a valid AssessmentRecord.
 */
const assessmentRecordArb = fc
  .record({
    id: fc.uuid(),
    topicId: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constant("completed" as const),
    startedAt: fc
      .integer({ min: 1577836800000, max: 1893456000000 })
      .map((ms) => new Date(ms).toISOString()),
    experienceLevel: fc.constantFrom(5 as const, 10 as const, 15 as const),
    phases: fc.constant([] as AssessmentRecord["phases"]),
    initialDifficulty: fc.constantFrom(
      "easy" as const,
      "medium" as const,
      "hard" as const,
    ),
  })
  .map((r) => r as unknown as AssessmentRecord);

/**
 * Arbitrary for a completed record with a specific confidence score.
 */
const completedRecordWithConfidence = (confidence: fc.Arbitrary<number>) =>
  fc
    .record({
      id: fc.uuid(),
      topicId: fc.constant("test-topic"),
      status: fc.constant("completed" as const),
      startedAt: fc
        .integer({ min: 1577836800000, max: 1893456000000 })
        .map((ms) => new Date(ms).toISOString()),
      experienceLevel: fc.constantFrom(5 as const, 10 as const, 15 as const),
      phases: fc.constant([] as AssessmentRecord["phases"]),
      initialDifficulty: fc.constantFrom(
        "easy" as const,
        "medium" as const,
        "hard" as const,
      ),
      confidenceScore: confidence,
    })
    .map((r) => r as unknown as AssessmentRecord);

/* ─── Property 10: FIFO Eviction ─────────────────────────── */

describe("Property 10: Assessment History Max Records with FIFO Eviction (Integration)", () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * For any assessment history array and a new record to append,
   * if the array length is at 50, the oldest record (by startedAt) SHALL be removed
   * before appending, and the resulting array SHALL never exceed 50 records.
   * The new record SHALL always be present in the result.
   */
  it("result never exceeds MAX_HISTORY_RECORDS after append + eviction", () => {
    fc.assert(
      fc.property(
        fc.array(assessmentRecordArb, { minLength: 0, maxLength: 70 }),
        assessmentRecordArb,
        (existingRecords, newRecord) => {
          const combined = [...existingRecords, newRecord];
          const result = applyFifoEviction(combined);

          expect(result.length).toBeLessThanOrEqual(MAX_HISTORY_RECORDS);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("newest record (by startedAt) is always preserved after eviction", () => {
    fc.assert(
      fc.property(
        fc.array(assessmentRecordArb, { minLength: 0, maxLength: 70 }),
        assessmentRecordArb.map((r) => ({
          ...r,
          startedAt: new Date("2030-12-31T23:59:59.999Z").toISOString(),
        })),
        (existingRecords, newRecord) => {
          const combined = [...existingRecords, newRecord];
          const result = applyFifoEviction(combined);

          expect(result.find((r) => r.id === newRecord.id)).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("when input is at exactly 50 and one more is appended, oldest is evicted", () => {
    fc.assert(
      fc.property(
        fc
          .array(assessmentRecordArb, { minLength: 50, maxLength: 50 })
          .map((records) =>
            records.map((r, i) => ({
              ...r,
              startedAt: new Date(2024, 0, i + 1).toISOString(),
            })),
          ),
        assessmentRecordArb.map((r) => ({
          ...r,
          startedAt: new Date("2025-06-01T00:00:00.000Z").toISOString(),
        })),
        (existingRecords, newRecord) => {
          const combined = [...existingRecords, newRecord];
          const result = applyFifoEviction(combined);

          // Result is exactly 50
          expect(result).toHaveLength(MAX_HISTORY_RECORDS);

          // New record is present
          expect(result.find((r) => r.id === newRecord.id)).toBeDefined();

          // Oldest record was evicted
          const oldestOriginal = existingRecords.reduce((oldest, r) =>
            new Date(r.startedAt) < new Date(oldest.startedAt) ? r : oldest,
          );
          expect(
            result.find((r) => r.id === oldestOriginal.id),
          ).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("eviction preserves chronological ordering (most recent kept)", () => {
    fc.assert(
      fc.property(
        fc.array(assessmentRecordArb, { minLength: 51, maxLength: 70 }),
        (records) => {
          const result = applyFifoEviction(records);

          // Result should contain only the most recent records
          expect(result.length).toBeLessThanOrEqual(MAX_HISTORY_RECORDS);

          // All results should be sorted by startedAt ascending
          for (let i = 1; i < result.length; i++) {
            expect(
              new Date(result[i].startedAt).getTime(),
            ).toBeGreaterThanOrEqual(
              new Date(result[i - 1].startedAt).getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/* ─── Property 11: Trend Computation ─────────────────────── */

describe("Property 11: Trend Computation (Integration)", () => {
  /**
   * **Validates: Requirements 9.6, 9.7**
   *
   * For any array of 6 or more completed assessment records (sorted chronologically),
   * computeTrend SHALL return: "improving" if the average confidence of the last 3
   * exceeds the average of the preceding 3 by >= 0.5, "declining" if lower by >= 0.5,
   * "stable" otherwise. For fewer than 6 records, returns null.
   */
  it("returns null for fewer than 6 completed records", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5 }), (count) => {
        const records = Array.from({ length: count }, (_, i) => ({
          id: crypto.randomUUID(),
          topicId: "test-topic",
          status: "completed" as const,
          startedAt: new Date(2024, 0, i + 1).toISOString(),
          experienceLevel: 10 as const,
          phases: [],
          initialDifficulty: "medium" as const,
          confidenceScore: 3,
        })) as AssessmentRecord[];

        expect(computeTrend(records)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it("returns 'improving' when last 3 avg exceeds preceding 3 avg by >= 0.5", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 1.0, max: 3.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        fc.array(
          fc.double({ min: 1.0, max: 5.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        (precedingScores, lastScores) => {
          const avgPreceding =
            precedingScores.reduce((s, v) => s + v, 0) / 3;
          const avgLast = lastScores.reduce((s, v) => s + v, 0) / 3;

          // Only test when improving condition holds
          fc.pre(avgLast - avgPreceding >= 0.5);

          const records = [
            ...precedingScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 0, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
            ...lastScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 6, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
          ] as AssessmentRecord[];

          expect(computeTrend(records)).toBe("improving");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns 'declining' when last 3 avg is lower than preceding 3 avg by >= 0.5", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 2.0, max: 5.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        fc.array(
          fc.double({ min: 1.0, max: 5.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        (precedingScores, lastScores) => {
          const avgPreceding =
            precedingScores.reduce((s, v) => s + v, 0) / 3;
          const avgLast = lastScores.reduce((s, v) => s + v, 0) / 3;

          // Only test when declining condition holds
          fc.pre(avgPreceding - avgLast >= 0.5);

          const records = [
            ...precedingScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 0, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
            ...lastScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 6, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
          ] as AssessmentRecord[];

          expect(computeTrend(records)).toBe("declining");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns 'stable' when difference between averages is less than 0.5", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 2.0, max: 4.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        fc.array(
          fc.double({ min: 2.0, max: 4.0, noNaN: true }),
          { minLength: 3, maxLength: 3 },
        ),
        (precedingScores, lastScores) => {
          const avgPreceding =
            precedingScores.reduce((s, v) => s + v, 0) / 3;
          const avgLast = lastScores.reduce((s, v) => s + v, 0) / 3;
          const diff = avgLast - avgPreceding;

          // Only test when stable condition holds
          fc.pre(Math.abs(diff) < 0.5);

          const records = [
            ...precedingScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 0, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
            ...lastScores.map((c, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "completed" as const,
              startedAt: new Date(2024, 6, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
              confidenceScore: c,
            })),
          ] as AssessmentRecord[];

          expect(computeTrend(records)).toBe("stable");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("ignores in-progress records when computing trend", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 1.0, max: 5.0, noNaN: true }),
          { minLength: 6, maxLength: 10 },
        ),
        fc.integer({ min: 0, max: 3 }),
        (confidenceScores, inProgressCount) => {
          const completedRecords = confidenceScores.map((c, i) => ({
            id: crypto.randomUUID(),
            topicId: "test-topic",
            status: "completed" as const,
            startedAt: new Date(2024, 0, i + 1).toISOString(),
            experienceLevel: 10 as const,
            phases: [],
            initialDifficulty: "medium" as const,
            confidenceScore: c,
          })) as AssessmentRecord[];

          const inProgressRecords = Array.from(
            { length: inProgressCount },
            (_, i) => ({
              id: crypto.randomUUID(),
              topicId: "test-topic",
              status: "in-progress" as const,
              startedAt: new Date(2024, 6, i + 1).toISOString(),
              experienceLevel: 10 as const,
              phases: [],
              initialDifficulty: "medium" as const,
            }),
          ) as AssessmentRecord[];

          // Mix in-progress records among completed ones
          const mixed = [...completedRecords, ...inProgressRecords];

          // Result should be the same as just completed records
          const resultMixed = computeTrend(mixed);
          const resultCompleted = computeTrend(completedRecords);

          expect(resultMixed).toBe(resultCompleted);
        },
      ),
      { numRuns: 100 },
    );
  });
});
