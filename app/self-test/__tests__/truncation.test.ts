import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { truncateContent } from "../lib/validation";
import { CONTENT_TRUNCATION_LIMIT } from "../lib/constants";

/* ─── Property 9: Content Truncation ────────────────────── */

describe("Property 9: Content Truncation (Integration)", () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any string input, the content truncation function SHALL return a string of at most
   * 12,000 characters, and if the input length is <= 12,000 then the output SHALL equal
   * the input exactly.
   */
  it("output never exceeds CONTENT_TRUNCATION_LIMIT characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30000 }),
        (content) => {
          const result = truncateContent(content);
          expect(result.length).toBeLessThanOrEqual(CONTENT_TRUNCATION_LIMIT);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns input unchanged when length <= 12,000", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: CONTENT_TRUNCATION_LIMIT }),
        (content) => {
          const result = truncateContent(content);
          expect(result).toBe(content);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("truncates to exactly 12,000 characters when input exceeds limit", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: CONTENT_TRUNCATION_LIMIT + 1, maxLength: 30000 }),
        (content) => {
          const result = truncateContent(content);
          expect(result.length).toBe(CONTENT_TRUNCATION_LIMIT);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("truncated output is a prefix of the original input", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30000 }),
        (content) => {
          const result = truncateContent(content);
          expect(content.startsWith(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("respects custom limit parameter", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 10000 }),
        fc.integer({ min: 1, max: 5000 }),
        (content, limit) => {
          const result = truncateContent(content, limit);
          expect(result.length).toBeLessThanOrEqual(limit);

          if (content.length <= limit) {
            expect(result).toBe(content);
          } else {
            expect(result.length).toBe(limit);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
