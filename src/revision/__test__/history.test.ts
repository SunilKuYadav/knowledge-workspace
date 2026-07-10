import { describe, it, expect } from "vitest";
import { addRevisionEntry, getConfidenceTrend } from "../history";
import type { RevisionData, RevisionEntry } from "@/types";

describe("addRevisionEntry", () => {
  const baseRevisionData: RevisionData = {
    itemId: "binary-trees",
    itemType: "topic",
    lastReviewed: null,
    nextReview: "2024-01-15",
    confidence: 3,
    history: [],
  };

  it("adds entry to history array", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 4,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toEqual(entry);
  });

  it("updates lastReviewed to entry date on first review", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 4,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.lastReviewed).toBe("2024-01-15");
  });

  it("updates confidence to entry confidence on first review", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 5,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.confidence).toBe(5);
  });

  it("computes nextReview as exactly 7 days on first review (no multiplier)", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 3,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    // First review: always 7 days, regardless of confidence
    expect(result.nextReview).toBe("2024-01-22");
  });

  it("first review with confidence 1 still uses exactly 7 days", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 1,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.nextReview).toBe("2024-01-22");
  });

  it("first review with confidence 5 still uses exactly 7 days", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 5,
    };
    const result = addRevisionEntry(baseRevisionData, entry);
    expect(result.nextReview).toBe("2024-01-22");
  });

  it("does not mutate the original RevisionData", () => {
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 4,
    };
    const original = {
      ...baseRevisionData,
      history: [...baseRevisionData.history],
    };
    addRevisionEntry(baseRevisionData, entry);
    expect(baseRevisionData).toEqual(original);
  });

  it("appends to existing history when reviewed on schedule", () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: "2024-01-10",
      nextReview: "2024-01-15",
      history: [{ id: "rev-000", date: "2024-01-10", confidence: 2 }],
    };
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 4,
    };
    const result = addRevisionEntry(existing, entry);
    expect(result.history).toHaveLength(2);
    expect(result.history[1]).toEqual(entry);
  });

  it("computes interval based on previous lastReviewed and nextReview gap", () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: "2024-01-10",
      nextReview: "2024-01-15", // 5 day interval
      confidence: 3,
      history: [{ id: "rev-000", date: "2024-01-10", confidence: 3 }],
    };
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15",
      confidence: 3,
    };
    const result = addRevisionEntry(existing, entry);
    // previousInterval = 5, conf 3 → 5 * 2 = 10 days
    expect(result.nextReview).toBe("2024-01-25");
  });

  it("does NOT update nextReview when practicing before review date", () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: "2024-01-10",
      nextReview: "2024-01-20", // review due on Jan 20
      confidence: 3,
      history: [{ id: "rev-000", date: "2024-01-10", confidence: 3 }],
    };
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15", // practicing on Jan 15 — before review date
      confidence: 5,
    };
    const result = addRevisionEntry(existing, entry);
    // nextReview should remain unchanged
    expect(result.nextReview).toBe("2024-01-20");
    // lastReviewed and confidence should remain unchanged
    expect(result.lastReviewed).toBe("2024-01-10");
    expect(result.confidence).toBe(3);
    // But history should still include the entry
    expect(result.history).toHaveLength(2);
    expect(result.history[1]).toEqual(entry);
  });

  it("updates nextReview when practicing on the review date", () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: "2024-01-10",
      nextReview: "2024-01-15", // review due today
      confidence: 3,
      history: [{ id: "rev-000", date: "2024-01-10", confidence: 3 }],
    };
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-15", // practicing on review date
      confidence: 4,
    };
    const result = addRevisionEntry(existing, entry);
    // previousInterval = 5, conf 4 → 5 * 3 = 15 days
    expect(result.nextReview).toBe("2024-01-30");
    expect(result.lastReviewed).toBe("2024-01-15");
    expect(result.confidence).toBe(4);
  });

  it("updates nextReview when practicing after the review date (overdue)", () => {
    const existing: RevisionData = {
      ...baseRevisionData,
      lastReviewed: "2024-01-10",
      nextReview: "2024-01-15", // was due Jan 15
      confidence: 3,
      history: [{ id: "rev-000", date: "2024-01-10", confidence: 3 }],
    };
    const entry: RevisionEntry = {
      id: "rev-001",
      date: "2024-01-18", // practicing 3 days late
      confidence: 2,
    };
    const result = addRevisionEntry(existing, entry);
    // previousInterval = 5, conf 2 → 5 * 1 = 5 days from Jan 18
    expect(result.nextReview).toBe("2024-01-23");
    expect(result.lastReviewed).toBe("2024-01-18");
    expect(result.confidence).toBe(2);
  });
});

describe("getConfidenceTrend", () => {
  it("returns empty array for empty history", () => {
    expect(getConfidenceTrend([])).toEqual([]);
  });

  it("maps history entries to date/confidence pairs", () => {
    const history: RevisionEntry[] = [
      { id: "r1", date: "2024-01-10", confidence: 2 },
      { id: "r2", date: "2024-01-15", confidence: 3 },
      { id: "r3", date: "2024-01-25", confidence: 4 },
    ];
    const result = getConfidenceTrend(history);
    expect(result).toEqual([
      { date: "2024-01-10", confidence: 2 },
      { date: "2024-01-15", confidence: 3 },
      { date: "2024-01-25", confidence: 4 },
    ]);
  });

  it("preserves input order", () => {
    const history: RevisionEntry[] = [
      { id: "r1", date: "2024-01-25", confidence: 5 },
      { id: "r2", date: "2024-01-10", confidence: 1 },
    ];
    const result = getConfidenceTrend(history);
    expect(result[0].date).toBe("2024-01-25");
    expect(result[1].date).toBe("2024-01-10");
  });
});
