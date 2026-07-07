import { describe, it, expect } from "vitest";
import { computeNextReview } from "./scheduler";

describe("computeNextReview", () => {
  it("computes next review date by adding interval days to review date", () => {
    const result = computeNextReview({
      currentConfidence: 3,
      previousInterval: 5,
      reviewDate: "2024-01-15",
    });

    // conf 3, prev 5 → 5 * 2 = 10 days
    expect(result.intervalDays).toBe(10);
    expect(result.nextReview).toBe("2024-01-25");
  });

  it("handles confidence 1 reducing interval", () => {
    const result = computeNextReview({
      currentConfidence: 1,
      previousInterval: 10,
      reviewDate: "2024-03-01",
    });

    // conf 1, prev 10 → 10 * 0.5 = 5 days
    expect(result.intervalDays).toBe(5);
    expect(result.nextReview).toBe("2024-03-06");
  });

  it("handles confidence 5 with large multiplier", () => {
    const result = computeNextReview({
      currentConfidence: 5,
      previousInterval: 7,
      reviewDate: "2024-06-01",
    });

    // conf 5, prev 7 → 7 * 5 = 35 days
    expect(result.intervalDays).toBe(35);
    expect(result.nextReview).toBe("2024-07-06");
  });

  it("handles month boundaries correctly", () => {
    const result = computeNextReview({
      currentConfidence: 2,
      previousInterval: 5,
      reviewDate: "2024-01-28",
    });

    // conf 2, prev 5 → 5 * 1 = 5 days → Jan 28 + 5 = Feb 2
    expect(result.intervalDays).toBe(5);
    expect(result.nextReview).toBe("2024-02-02");
  });

  it("ensures minimum interval of 1 day", () => {
    const result = computeNextReview({
      currentConfidence: 1,
      previousInterval: 1,
      reviewDate: "2024-01-01",
    });

    // conf 1, prev 1 → 1 * 0.5 = 0.5 → rounds to 1 (minimum)
    expect(result.intervalDays).toBe(1);
    expect(result.nextReview).toBe("2024-01-02");
  });

  it("returns ISO date string format (YYYY-MM-DD)", () => {
    const result = computeNextReview({
      currentConfidence: 3,
      previousInterval: 1,
      reviewDate: "2024-01-01T10:30:00Z",
    });

    expect(result.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
