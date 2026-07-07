import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { shouldRestore, MAX_AGE_MS } from "../store/persistence";
import type {
  InterviewState,
  InterviewPhase,
  InterviewSource,
} from "../lib/types";

/**
 * Property-based tests for persistence logic.
 *
 * **Validates: Requirements 12.7, 12.9**
 */
describe("persistence — property-based tests", () => {
  /* ─── Generators ───────────────────────────────────────── */
  const arbPhase: fc.Arbitrary<InterviewPhase> = fc.constantFrom(
    "initializing",
    "generating",
    "coding",
    "executing",
    "confirming",
    "evaluating",
    "follow-up",
    "scoring",
    "summary",
    "error",
  );

  const arbSource: fc.Arbitrary<InterviewSource> = fc.constantFrom(
    "problem",
    "topic",
    "self-test",
    "revision",
    "practice",
    "interview",
  );

  const arbInterviewState: fc.Arbitrary<InterviewState> = fc.record({
    phase: arbPhase,
    source: arbSource,
    context: fc.constant(null),
    language: fc.constantFrom("javascript" as const, "typescript" as const),
    difficulty: fc.constantFrom(
      "easy" as const,
      "medium" as const,
      "hard" as const,
      null,
    ),
    duration: fc.integer({ min: 1, max: 180 }),
    problem: fc.constant(null),
    code: fc.string({ maxLength: 200 }),
    boilerplate: fc.string({ maxLength: 100 }),
    elapsedSeconds: fc.integer({ min: 0, max: 10800 }),
    timerRunning: fc.boolean(),
    lastExecutionResult: fc.constant(null),
    executionCount: fc.integer({ min: 0, max: 100 }),
    hintsUsed: fc.integer({ min: 0, max: 4 }),
    hints: fc.array(fc.string({ maxLength: 50 }), { maxLength: 4 }),
    solutionRevealed: fc.boolean(),
    submittedCode: fc.oneof(fc.constant(null), fc.string({ maxLength: 100 })),
    evaluation: fc.constant(null),
    conversationHistory: fc.array(
      fc.record({
        role: fc.constantFrom("interviewer" as const, "candidate" as const),
        content: fc.string({ maxLength: 50 }),
        timestamp: fc.integer({ min: 0, max: Date.now() }),
      }),
      { maxLength: 3 },
    ),
    followUpQuestionsAsked: fc.integer({ min: 0, max: 8 }),
    scoringReport: fc.constant(null),
    sessionSummary: fc.constant(null),
    sessionStartTime: fc.integer({ min: 0, max: Date.now() }),
    lastPersistedAt: fc.integer({ min: 0, max: Date.now() }),
    error: fc.oneof(fc.constant(null), fc.string({ maxLength: 50 })),
  });

  /* ─── Property 19: Persistence Round-Trip ──────────────── */
  describe("Property 19: Serialize/deserialize round-trip", () => {
    it("JSON stringify + parse produces equivalent state", () => {
      fc.assert(
        fc.property(arbInterviewState, (state) => {
          const serialized = JSON.stringify(state);
          const deserialized = JSON.parse(serialized) as InterviewState;

          // Verify all key fields survive the round-trip
          expect(deserialized.phase).toBe(state.phase);
          expect(deserialized.source).toBe(state.source);
          expect(deserialized.language).toBe(state.language);
          expect(deserialized.difficulty).toBe(state.difficulty);
          expect(deserialized.duration).toBe(state.duration);
          expect(deserialized.code).toBe(state.code);
          expect(deserialized.boilerplate).toBe(state.boilerplate);
          expect(deserialized.elapsedSeconds).toBe(state.elapsedSeconds);
          expect(deserialized.timerRunning).toBe(state.timerRunning);
          expect(deserialized.executionCount).toBe(state.executionCount);
          expect(deserialized.hintsUsed).toBe(state.hintsUsed);
          expect(deserialized.hints).toEqual(state.hints);
          expect(deserialized.solutionRevealed).toBe(state.solutionRevealed);
          expect(deserialized.submittedCode).toBe(state.submittedCode);
          expect(deserialized.conversationHistory).toEqual(
            state.conversationHistory,
          );
          expect(deserialized.followUpQuestionsAsked).toBe(
            state.followUpQuestionsAsked,
          );
          expect(deserialized.sessionStartTime).toBe(state.sessionStartTime);
          expect(deserialized.lastPersistedAt).toBe(state.lastPersistedAt);
          expect(deserialized.error).toBe(state.error);
        }),
        { numRuns: 100 },
      );
    });
  });

  /* ─── Property 20: Session Staleness Check ─────────────── */
  describe("Property 20: Staleness detection", () => {
    it("timestamps older than 24h → shouldRestore returns false", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }), // offset beyond 24h
          (extraMs) => {
            const staleTimestamp = Date.now() - MAX_AGE_MS - extraMs;
            const persisted = {
              state: {} as InterviewState,
              lastPersistedAt: staleTimestamp,
            };
            expect(shouldRestore(persisted)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("timestamps within 24h → shouldRestore returns true", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MAX_AGE_MS - 1 }), // within 24h
          (ageMs) => {
            const freshTimestamp = Date.now() - ageMs;
            const persisted = {
              state: {} as InterviewState,
              lastPersistedAt: freshTimestamp,
            };
            expect(shouldRestore(persisted)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
