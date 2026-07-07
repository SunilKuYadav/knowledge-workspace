import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deepEqual } from "../services/deepEqual";

describe("deepEqual", () => {
  describe("primitives", () => {
    it("returns true for equal numbers", () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual(0, 0)).toBe(true);
      expect(deepEqual(-5, -5)).toBe(true);
    });

    it("returns false for different numbers", () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual(0, 1)).toBe(false);
    });

    it("returns true for equal strings", () => {
      expect(deepEqual("hello", "hello")).toBe(true);
      expect(deepEqual("", "")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(deepEqual("hello", "world")).toBe(false);
    });

    it("returns true for equal booleans", () => {
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(false, false)).toBe(true);
    });

    it("returns false for different booleans", () => {
      expect(deepEqual(true, false)).toBe(false);
    });

    it("handles null equality", () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
    });

    it("handles undefined equality", () => {
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(undefined, null)).toBe(false);
      expect(deepEqual(undefined, "")).toBe(false);
    });

    it("handles NaN", () => {
      expect(deepEqual(NaN, NaN)).toBe(true);
      expect(deepEqual(NaN, 0)).toBe(false);
    });
  });

  describe("arrays", () => {
    it("returns true for equal arrays", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([], [])).toBe(true);
    });

    it("returns false for arrays with different lengths", () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("returns false for arrays with different elements", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("returns false when comparing array to non-array", () => {
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
    });
  });

  describe("objects", () => {
    it("returns true for equal objects", () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({}, {})).toBe(true);
    });

    it("returns false for objects with different keys", () => {
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("returns false for objects with different values", () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("is not order-sensitive for object keys", () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });
  });

  describe("nested structures", () => {
    it("handles nested arrays", () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true);
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ],
        ),
      ).toBe(false);
    });

    it("handles nested objects", () => {
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
        true,
      );
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
        false,
      );
    });

    it("handles mixed nested structures", () => {
      const a = { items: [1, 2, { nested: true }], count: 3 };
      const b = { items: [1, 2, { nested: true }], count: 3 };
      const c = { items: [1, 2, { nested: false }], count: 3 };
      expect(deepEqual(a, b)).toBe(true);
      expect(deepEqual(a, c)).toBe(false);
    });

    it("handles arrays of objects", () => {
      expect(
        deepEqual(
          [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
          [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
        ),
      ).toBe(true);
    });
  });

  describe("type coercion", () => {
    it("does not coerce types", () => {
      expect(deepEqual(1, "1")).toBe(false);
      expect(deepEqual(0, false)).toBe(false);
      expect(deepEqual("", false)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
      expect(deepEqual(undefined, 0)).toBe(false);
    });
  });
});

/**
 * Property-based tests for deep equality.
 *
 * **Validates: Requirements 3.6**
 */
describe("deepEqual — property-based tests", () => {
  // Arbitrary that generates JSON-safe values (no NaN, no undefined, no circular refs)
  const arbJsonValue: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
    value: fc.oneof(
      { depthSize: "small" },
      fc.string(),
      fc.integer(),
      fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
      fc.boolean(),
      fc.constant(null),
      fc.array(tie("value"), { maxLength: 4 }),
      fc.dictionary(fc.string({ maxLength: 5 }), tie("value"), { maxKeys: 4 }),
    ),
  })).value;

  /* ─── Property 8: Deep Equality ────────────────────────── */
  describe("Property 8: Deep equality", () => {
    it("reflexivity: deepEqual(v, v) === true", () => {
      fc.assert(
        fc.property(arbJsonValue, (v) => {
          expect(deepEqual(v, v)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("symmetry: deepEqual(a, b) === deepEqual(b, a)", () => {
      fc.assert(
        fc.property(arbJsonValue, arbJsonValue, (a, b) => {
          expect(deepEqual(a, b)).toBe(deepEqual(b, a));
        }),
        { numRuns: 100 },
      );
    });
  });
});
