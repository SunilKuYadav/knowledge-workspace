import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { applyFifoEviction } from "@/filesystem/FileAssessmentRepository";
import type { AssessmentRecord } from "../lib/types";
import { MAX_HISTORY_RECORDS } from "../lib/constants";

/* ─── Helpers ────────────────────────────────────────────── */

/**
 * Creates a minimal valid AssessmentRecord for testing purposes.
 */
function createRecord(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: crypto.randomUUID(),
    topicId: "test-topic",
    status: "completed",
    startedAt: new Date().toISOString(),
    experienceLevel: 10,
    phases: [],
    initialDifficulty: "medium",
    ...overrides,
  };
}

/**
 * fast-check arbitrary for generating a valid AssessmentRecord.
 */
const assessmentRecordArb = fc
  .record({
    id: fc.uuid(),
    topicId: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constant("completed" as const),
    startedAt: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(
      (ms) => new Date(ms).toISOString(),
    ),
    experienceLevel: fc.constantFrom(5 as const, 10 as const, 15 as const),
    phases: fc.constant([]),
    initialDifficulty: fc.constantFrom("easy" as const, "medium" as const, "hard" as const),
  })
  .map((r) => r as AssessmentRecord);

/* ─── Unit Tests: FIFO Eviction ──────────────────────────── */

describe("applyFifoEviction", () => {
  it("returns the same array when length <= 50", () => {
    const records = Array.from({ length: 30 }, () => createRecord());
    const result = applyFifoEviction(records);
    expect(result).toHaveLength(30);
  });

  it("returns exactly 50 records when input exceeds 50", () => {
    const records = Array.from({ length: 55 }, (_, i) =>
      createRecord({
        startedAt: new Date(2024, 0, i + 1).toISOString(),
      }),
    );
    const result = applyFifoEviction(records);
    expect(result).toHaveLength(50);
  });

  it("removes the oldest records (by startedAt) first", () => {
    const records = Array.from({ length: 52 }, (_, i) =>
      createRecord({
        id: `id-${i}`,
        startedAt: new Date(2024, 0, i + 1).toISOString(),
      }),
    );
    const result = applyFifoEviction(records);
    // The oldest 2 (id-0 and id-1) should be evicted
    expect(result.find((r) => r.id === "id-0")).toBeUndefined();
    expect(result.find((r) => r.id === "id-1")).toBeUndefined();
    // The newest should remain
    expect(result.find((r) => r.id === "id-51")).toBeDefined();
  });

  it("preserves the newest record when exactly at 51", () => {
    const newestRecord = createRecord({
      id: "newest",
      startedAt: new Date(2025, 0, 1).toISOString(),
    });
    const olderRecords = Array.from({ length: 50 }, (_, i) =>
      createRecord({
        startedAt: new Date(2024, 0, i + 1).toISOString(),
      }),
    );
    const result = applyFifoEviction([...olderRecords, newestRecord]);
    expect(result).toHaveLength(50);
    expect(result.find((r) => r.id === "newest")).toBeDefined();
  });

  it("returns an empty array unchanged", () => {
    const result = applyFifoEviction([]);
    expect(result).toHaveLength(0);
  });

  it("returns exactly 50 records when input has exactly 50", () => {
    const records = Array.from({ length: 50 }, () => createRecord());
    const result = applyFifoEviction(records);
    expect(result).toHaveLength(50);
  });
});

/* ─── Property Test: Property 10 ─────────────────────────── */

describe("Property 10: Assessment History Max Records with FIFO Eviction", () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * For any assessment history array and a new record to append,
   * if the array length is at 50, the oldest record (by startedAt) SHALL
   * be removed before appending, and the resulting array SHALL never
   * exceed 50 records. The new record SHALL always be present in the result.
   */
  it("resulting array never exceeds 50 records after append + eviction", () => {
    fc.assert(
      fc.property(
        fc.array(assessmentRecordArb, { minLength: 0, maxLength: 60 }),
        assessmentRecordArb,
        (existingRecords, newRecord) => {
          // Simulate: append, then evict
          const combined = [...existingRecords, newRecord];
          const result = applyFifoEviction(combined);

          // Result never exceeds MAX_HISTORY_RECORDS
          expect(result.length).toBeLessThanOrEqual(MAX_HISTORY_RECORDS);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("the new record is always present in the result after eviction", () => {
    fc.assert(
      fc.property(
        fc.array(assessmentRecordArb, { minLength: 0, maxLength: 60 }),
        assessmentRecordArb.map((r) => ({
          ...r,
          // Ensure the new record has the latest timestamp so it's never evicted
          startedAt: new Date("2030-06-15T00:00:00.000Z").toISOString(),
        })),
        (existingRecords, newRecord) => {
          const combined = [...existingRecords, newRecord];
          const result = applyFifoEviction(combined);

          // The new record should always be present (it has the newest timestamp)
          expect(result.find((r) => r.id === newRecord.id)).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("when array is at exactly 50 and a new record is appended, oldest is removed", () => {
    fc.assert(
      fc.property(
        // Generate exactly 50 records with distinct timestamps in the past
        fc.array(assessmentRecordArb, { minLength: 50, maxLength: 50 }).map((records) =>
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

          // The oldest record (Jan 1, 2024) was evicted
          const oldestOriginal = existingRecords.reduce((oldest, r) =>
            new Date(r.startedAt) < new Date(oldest.startedAt) ? r : oldest,
          );
          expect(result.find((r) => r.id === oldestOriginal.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
