import { describe, it, expect } from "vitest";
import { categorizeRevisionItem, getDueItems, sortByPriority } from "../spaced";
import type { RevisionData } from "@/types";

describe("categorizeRevisionItem", () => {
  it('returns "overdue" when nextReview is before currentDate', () => {
    expect(categorizeRevisionItem("2024-01-10", "2024-01-15")).toBe("overdue");
  });

  it('returns "due-today" when nextReview equals currentDate', () => {
    expect(categorizeRevisionItem("2024-01-15", "2024-01-15")).toBe(
      "due-today",
    );
  });

  it('returns "upcoming" when nextReview is after currentDate', () => {
    expect(categorizeRevisionItem("2024-01-20", "2024-01-15")).toBe("upcoming");
  });

  it("ignores time component when comparing dates", () => {
    expect(
      categorizeRevisionItem("2024-01-15T23:59:59Z", "2024-01-15T00:00:00Z"),
    ).toBe("due-today");
  });
});

function makeItem(overrides: Partial<RevisionData>): RevisionData {
  return {
    itemId: "test",
    itemType: "topic",
    lastReviewed: null,
    nextReview: "2024-01-15",
    confidence: 3,
    history: [],
    ...overrides,
  };
}

describe("getDueItems", () => {
  const currentDate = "2024-01-15";

  it("returns overdue items", () => {
    const items = [makeItem({ itemId: "a", nextReview: "2024-01-10" })];
    const result = getDueItems(items, currentDate);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe("a");
  });

  it("returns due-today items", () => {
    const items = [makeItem({ itemId: "b", nextReview: "2024-01-15" })];
    const result = getDueItems(items, currentDate);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe("b");
  });

  it("excludes upcoming items", () => {
    const items = [makeItem({ itemId: "c", nextReview: "2024-01-20" })];
    const result = getDueItems(items, currentDate);
    expect(result).toHaveLength(0);
  });

  it("returns mixed overdue and due-today items", () => {
    const items = [
      makeItem({ itemId: "a", nextReview: "2024-01-10" }),
      makeItem({ itemId: "b", nextReview: "2024-01-15" }),
      makeItem({ itemId: "c", nextReview: "2024-01-20" }),
    ];
    const result = getDueItems(items, currentDate);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.itemId)).toContain("a");
    expect(result.map((r) => r.itemId)).toContain("b");
  });
});

describe("sortByPriority", () => {
  const currentDate = "2024-01-15";

  it("sorts overdue items before due-today items", () => {
    const items = [
      makeItem({ itemId: "today", nextReview: "2024-01-15" }),
      makeItem({ itemId: "overdue", nextReview: "2024-01-10" }),
    ];
    const result = sortByPriority(items, currentDate);
    expect(result[0].itemId).toBe("overdue");
    expect(result[1].itemId).toBe("today");
  });

  it("sorts due-today items before upcoming items", () => {
    const items = [
      makeItem({ itemId: "upcoming", nextReview: "2024-01-20" }),
      makeItem({ itemId: "today", nextReview: "2024-01-15" }),
    ];
    const result = sortByPriority(items, currentDate);
    expect(result[0].itemId).toBe("today");
    expect(result[1].itemId).toBe("upcoming");
  });

  it("sorts overdue items by oldest first within category", () => {
    const items = [
      makeItem({ itemId: "recent-overdue", nextReview: "2024-01-13" }),
      makeItem({ itemId: "old-overdue", nextReview: "2024-01-05" }),
    ];
    const result = sortByPriority(items, currentDate);
    expect(result[0].itemId).toBe("old-overdue");
    expect(result[1].itemId).toBe("recent-overdue");
  });

  it("does not mutate the original array", () => {
    const items = [
      makeItem({ itemId: "b", nextReview: "2024-01-20" }),
      makeItem({ itemId: "a", nextReview: "2024-01-10" }),
    ];
    const original = [...items];
    sortByPriority(items, currentDate);
    expect(items).toEqual(original);
  });

  it("handles full mix of categories", () => {
    const items = [
      makeItem({ itemId: "upcoming2", nextReview: "2024-01-25" }),
      makeItem({ itemId: "today", nextReview: "2024-01-15" }),
      makeItem({ itemId: "overdue1", nextReview: "2024-01-05" }),
      makeItem({ itemId: "upcoming1", nextReview: "2024-01-18" }),
      makeItem({ itemId: "overdue2", nextReview: "2024-01-12" }),
    ];
    const result = sortByPriority(items, currentDate);
    expect(result.map((r) => r.itemId)).toEqual([
      "overdue1",
      "overdue2",
      "today",
      "upcoming1",
      "upcoming2",
    ]);
  });
});
