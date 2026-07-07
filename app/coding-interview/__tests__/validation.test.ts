import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateInterviewProps, validateDuration } from "../lib/validation";
import type {
  InterviewModuleProps,
  InterviewSource,
  InterviewContext,
} from "../lib/types";

/**
 * Property-based tests for validation logic.
 *
 * **Validates: Requirements 1.2, 1.8**
 */
describe("validation — property-based tests", () => {
  const VALID_SOURCES: InterviewSource[] = [
    "problem",
    "topic",
    "self-test",
    "revision",
    "practice",
    "interview",
  ];

  /* ─── Property 1: Configuration Validation ─────────────── */
  describe("Property 1: Config validation", () => {
    it("valid source with matching context returns valid=true", () => {
      const arbValidProps: fc.Arbitrary<InterviewModuleProps> = fc.oneof(
        // problem source with matching context
        fc.record({
          source: fc.constant("problem" as InterviewSource),
          context: fc.record({
            source: fc.constant("problem" as const),
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            category: fc.string({ minLength: 1 }),
            tags: fc.array(fc.string()),
          }),
        }),
        // topic source with matching context
        fc.record({
          source: fc.constant("topic" as InterviewSource),
          context: fc.record({
            source: fc.constant("topic" as const),
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            concepts: fc.array(fc.string()),
          }),
        }),
        // revision source with matching context
        fc.record({
          source: fc.constant("revision" as InterviewSource),
          context: fc.record({
            source: fc.constant("revision" as const),
            sessionId: fc.string({ minLength: 1 }),
            topicIds: fc.array(fc.string()),
          }),
        }),
        // self-test/practice/interview with matching context
        fc
          .constantFrom(
            "self-test" as InterviewSource,
            "practice" as InterviewSource,
            "interview" as InterviewSource,
          )
          .chain((src) =>
            fc.record({
              source: fc.constant(src),
              context: fc.record({
                source: fc.constant(
                  src as "self-test" | "practice" | "interview",
                ),
              }),
            }),
          ),
        // any valid source with no context (context optional)
        fc.constantFrom(...VALID_SOURCES).map((src) => ({ source: src })),
      );

      fc.assert(
        fc.property(arbValidProps, (props) => {
          const result = validateInterviewProps(props as InterviewModuleProps);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("invalid source (not in valid set) returns valid=false", () => {
      const arbInvalidSource = fc
        .string()
        .filter((s) => !VALID_SOURCES.includes(s as InterviewSource));

      fc.assert(
        fc.property(arbInvalidSource, (source) => {
          const props = { source } as unknown as InterviewModuleProps;
          const result = validateInterviewProps(props);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("valid source with wrong context type returns valid=false", () => {
      // Generate props where context.source doesn't match prop source
      const arbMismatchedContext = fc
        .constantFrom(...VALID_SOURCES)
        .chain((src) => {
          const otherSources = VALID_SOURCES.filter((s) => s !== src);
          return fc.constantFrom(...otherSources).map((otherSrc) => ({
            source: src,
            context: { source: otherSrc } as unknown as InterviewContext,
          }));
        });

      fc.assert(
        fc.property(arbMismatchedContext, (props) => {
          const result = validateInterviewProps(props as InterviewModuleProps);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  /* ─── Property 2: Duration Range Validation ────────────── */
  describe("Property 2: Duration range", () => {
    it("integers in [1, 180] return valid=true", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 180 }), (n) => {
          const result = validateDuration(n);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("integers < 1 return valid=false", () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: 0 }), (n) => {
          const result = validateDuration(n);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("integers > 180 return valid=false", () => {
      fc.assert(
        fc.property(fc.integer({ min: 181, max: 10000 }), (n) => {
          const result = validateDuration(n);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it("undefined returns valid=true", () => {
      const result = validateDuration(undefined);
      expect(result.valid).toBe(true);
    });
  });
});
