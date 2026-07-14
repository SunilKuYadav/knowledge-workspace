import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deriveInitialDifficulty, adjustDifficulty } from "../lib/difficulty";
import type { DifficultyLevel } from "../lib/types";

/* ─── Unit Tests: deriveInitialDifficulty ────────────────── */

describe("deriveInitialDifficulty", () => {
  describe("base mapping without experience shift", () => {
    it("confidence 1, 10 YOE → easy", () => {
      expect(deriveInitialDifficulty(1, 10)).toBe("easy");
    });

    it("confidence 2, 10 YOE → easy", () => {
      expect(deriveInitialDifficulty(2, 10)).toBe("easy");
    });

    it("confidence 3, 10 YOE → medium", () => {
      expect(deriveInitialDifficulty(3, 10)).toBe("medium");
    });

    it("confidence 4, 10 YOE → hard", () => {
      expect(deriveInitialDifficulty(4, 10)).toBe("hard");
    });

    it("confidence 5, 10 YOE → hard", () => {
      expect(deriveInitialDifficulty(5, 10)).toBe("hard");
    });
  });

  describe("15 YOE shifts one level harder", () => {
    it("confidence 1, 15 YOE → medium (easy + 1)", () => {
      expect(deriveInitialDifficulty(1, 15)).toBe("medium");
    });

    it("confidence 3, 15 YOE → hard (medium + 1)", () => {
      expect(deriveInitialDifficulty(3, 15)).toBe("hard");
    });

    it("confidence 5, 15 YOE → hard (clamped)", () => {
      expect(deriveInitialDifficulty(5, 15)).toBe("hard");
    });
  });

  describe("5 YOE shifts one level easier", () => {
    it("confidence 3, 5 YOE → easy (medium - 1)", () => {
      expect(deriveInitialDifficulty(3, 5)).toBe("easy");
    });

    it("confidence 4, 5 YOE → medium (hard - 1)", () => {
      expect(deriveInitialDifficulty(4, 5)).toBe("medium");
    });

    it("confidence 1, 5 YOE → easy (clamped)", () => {
      expect(deriveInitialDifficulty(1, 5)).toBe("easy");
    });
  });

  describe("all 15 combinations", () => {
    const expectations: [number, 5 | 10 | 15, DifficultyLevel][] = [
      // confidence 1: base=easy
      [1, 5, "easy"],    // easy - 1 → clamped easy
      [1, 10, "easy"],   // easy
      [1, 15, "medium"], // easy + 1

      // confidence 2: base=easy
      [2, 5, "easy"],    // easy - 1 → clamped easy
      [2, 10, "easy"],   // easy
      [2, 15, "medium"], // easy + 1

      // confidence 3: base=medium
      [3, 5, "easy"],    // medium - 1
      [3, 10, "medium"], // medium
      [3, 15, "hard"],   // medium + 1

      // confidence 4: base=hard
      [4, 5, "medium"],  // hard - 1
      [4, 10, "hard"],   // hard
      [4, 15, "hard"],   // hard + 1 → clamped hard

      // confidence 5: base=hard
      [5, 5, "medium"],  // hard - 1
      [5, 10, "hard"],   // hard
      [5, 15, "hard"],   // hard + 1 → clamped hard
    ];

    expectations.forEach(([confidence, yoe, expected]) => {
      it(`confidence ${confidence}, ${yoe} YOE → ${expected}`, () => {
        expect(deriveInitialDifficulty(confidence, yoe)).toBe(expected);
      });
    });
  });
});

/* ─── Unit Tests: adjustDifficulty ───────────────────────── */

describe("adjustDifficulty", () => {
  describe("score >= 8 increases difficulty", () => {
    it("easy + score 8 → medium", () => {
      expect(adjustDifficulty("easy", 8)).toBe("medium");
    });

    it("medium + score 9 → hard", () => {
      expect(adjustDifficulty("medium", 9)).toBe("hard");
    });

    it("hard + score 10 → hard (clamped)", () => {
      expect(adjustDifficulty("hard", 10)).toBe("hard");
    });
  });

  describe("score <= 4 decreases difficulty", () => {
    it("hard + score 4 → medium", () => {
      expect(adjustDifficulty("hard", 4)).toBe("medium");
    });

    it("medium + score 2 → easy", () => {
      expect(adjustDifficulty("medium", 2)).toBe("easy");
    });

    it("easy + score 0 → easy (clamped)", () => {
      expect(adjustDifficulty("easy", 0)).toBe("easy");
    });
  });

  describe("score 5-7 maintains difficulty", () => {
    it("easy + score 5 → easy", () => {
      expect(adjustDifficulty("easy", 5)).toBe("easy");
    });

    it("medium + score 6 → medium", () => {
      expect(adjustDifficulty("medium", 6)).toBe("medium");
    });

    it("hard + score 7 → hard", () => {
      expect(adjustDifficulty("hard", 7)).toBe("hard");
    });
  });
});

/* ─── Property Tests ─────────────────────────────────────── */

describe("Property 3: Initial Difficulty Derivation", () => {
  /**
   * **Validates: Requirements 3.4, 10.5**
   *
   * For any topic confidence value (1-5) and experience level (5, 10, 15 YOE),
   * deriveInitialDifficulty SHALL return a valid DifficultyLevel with correct mappings.
   */
  it("always returns a valid DifficultyLevel with correct mapping rules", () => {
    const validDifficulties: DifficultyLevel[] = ["easy", "medium", "hard"];

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.constantFrom(5 as const, 10 as const, 15 as const),
        (confidence, experienceLevel) => {
          const result = deriveInitialDifficulty(confidence, experienceLevel);

          // Result is always a valid DifficultyLevel
          expect(validDifficulties).toContain(result);

          // Verify base mapping
          let baseIndex: number;
          if (confidence <= 2) baseIndex = 0; // easy
          else if (confidence === 3) baseIndex = 1; // medium
          else baseIndex = 2; // hard

          // Verify shift
          let shift = 0;
          if (experienceLevel === 15) shift = 1;
          if (experienceLevel === 5) shift = -1;

          const expectedIndex = Math.max(0, Math.min(2, baseIndex + shift));
          expect(result).toBe(validDifficulties[expectedIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 4: Difficulty Adjustment", () => {
  /**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.6, 10.7**
   *
   * For any current DifficultyLevel and phase score (integer 0-10), adjustDifficulty SHALL:
   * - Return one level harder if score >= 8 (clamped at hard)
   * - Return one level easier if score <= 4 (clamped at easy)
   * - Return the same difficulty if score is 5-7
   * - Result is always one of easy/medium/hard
   */
  it("always returns correct level based on score thresholds, always clamped", () => {
    const validDifficulties: DifficultyLevel[] = ["easy", "medium", "hard"];

    fc.assert(
      fc.property(
        fc.constantFrom("easy" as const, "medium" as const, "hard" as const),
        fc.integer({ min: 0, max: 10 }),
        (currentDifficulty, phaseScore) => {
          const result = adjustDifficulty(currentDifficulty, phaseScore);

          // Result is always valid
          expect(validDifficulties).toContain(result);

          const currentIndex = validDifficulties.indexOf(currentDifficulty);

          if (phaseScore >= 8) {
            // One level harder, clamped
            const expectedIndex = Math.min(2, currentIndex + 1);
            expect(result).toBe(validDifficulties[expectedIndex]);
          } else if (phaseScore <= 4) {
            // One level easier, clamped
            const expectedIndex = Math.max(0, currentIndex - 1);
            expect(result).toBe(validDifficulties[expectedIndex]);
          } else {
            // Maintain current
            expect(result).toBe(currentDifficulty);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
