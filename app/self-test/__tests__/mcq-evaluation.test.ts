import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { evaluateMCQLocally } from "../hooks/useAnswerEvaluation";
import type { MCQQuestion } from "../lib/types";

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * Arbitrary generator for a valid MCQ question.
 * Produces questions with 4 options, correctIndex 0-3,
 * a non-empty explanation, and exactly 3 distractor explanations.
 */
const mcqQuestionArb: fc.Arbitrary<MCQQuestion> = fc.record({
  type: fc.constant("mcq" as const),
  question: fc.string({ minLength: 1, maxLength: 200 }),
  options: fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ).map(([a, b, c, d]) => [a, b, c, d]),
  correctIndex: fc.integer({ min: 0, max: 3 }),
  explanation: fc.string({ minLength: 1, maxLength: 300 }),
  distractorExplanations: fc.tuple(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.string({ minLength: 1, maxLength: 200 })
  ).map(([a, b, c]) => [a, b, c]),
});

/* ─── Unit Tests ─────────────────────────────────────────── */

describe("evaluateMCQLocally", () => {
  it("returns score 10 for correct answer", () => {
    const question: MCQQuestion = {
      type: "mcq",
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
      explanation: "2+2 equals 4",
      distractorExplanations: [
        "3 is one less",
        "5 is one more",
        "6 is way off",
      ],
    };
    const result = evaluateMCQLocally(question, 1);
    expect(result.score).toBe(10);
    expect(result.feedback).toBe("Correct!");
    expect(result.mistakes).toHaveLength(0);
  });

  it("returns score 0 for incorrect answer", () => {
    const question: MCQQuestion = {
      type: "mcq",
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
      explanation: "2+2 equals 4",
      distractorExplanations: [
        "3 is one less",
        "5 is one more",
        "6 is way off",
      ],
    };
    const result = evaluateMCQLocally(question, 0);
    expect(result.score).toBe(0);
    expect(result.feedback).toBe("2+2 equals 4");
    expect(result.mistakes.length).toBeGreaterThan(0);
  });

  it("includes explanation in keyInsights for correct answer", () => {
    const question: MCQQuestion = {
      type: "mcq",
      question: "Test?",
      options: ["a", "b", "c", "d"],
      correctIndex: 2,
      explanation: "C is correct because...",
      distractorExplanations: ["not a", "not b", "not d"],
    };
    const result = evaluateMCQLocally(question, 2);
    expect(result.keyInsights).toContain("C is correct because...");
  });

  it("includes explanation in keyInsights for incorrect answer", () => {
    const question: MCQQuestion = {
      type: "mcq",
      question: "Test?",
      options: ["a", "b", "c", "d"],
      correctIndex: 2,
      explanation: "C is correct because...",
      distractorExplanations: ["not a", "not b", "not d"],
    };
    const result = evaluateMCQLocally(question, 0);
    expect(result.keyInsights).toContain("C is correct because...");
  });
});

/* ─── Property Tests ─────────────────────────────────────── */

describe("Property 5: MCQ Local Evaluation Correctness", () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * For any valid MCQ question (with correctIndex 0-3 and exactly 4 options)
   * and any user-selected index (0-3), the local evaluation SHALL determine
   * the answer as correct if and only if the selected index equals correctIndex,
   * and SHALL return the correct explanation and all distractor explanations.
   */
  it("answer is correct iff selectedIndex === correctIndex, with score 10 or 0", () => {
    fc.assert(
      fc.property(
        mcqQuestionArb,
        fc.integer({ min: 0, max: 3 }),
        (question, selectedIndex) => {
          const result = evaluateMCQLocally(question, selectedIndex);
          const isCorrect = selectedIndex === question.correctIndex;

          // Correct iff selected matches correctIndex
          if (isCorrect) {
            expect(result.score).toBe(10);
            expect(result.feedback).toBe("Correct!");
            expect(result.mistakes).toHaveLength(0);
          } else {
            expect(result.score).toBe(0);
            expect(result.feedback).toBe(question.explanation);
            expect(result.mistakes.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("always returns the explanation in keyInsights", () => {
    fc.assert(
      fc.property(
        mcqQuestionArb,
        fc.integer({ min: 0, max: 3 }),
        (question, selectedIndex) => {
          const result = evaluateMCQLocally(question, selectedIndex);

          // keyInsights always contains the explanation
          expect(result.keyInsights).toContain(question.explanation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("incorrect answers include the relevant distractor explanation in mistakes", () => {
    fc.assert(
      fc.property(
        mcqQuestionArb,
        fc.integer({ min: 0, max: 3 }),
        (question, selectedIndex) => {
          if (selectedIndex === question.correctIndex) return; // skip correct answers

          const result = evaluateMCQLocally(question, selectedIndex);

          // The distractor explanation for the selected wrong option should be in mistakes
          const distractorIndices = [0, 1, 2, 3].filter(
            (i) => i !== question.correctIndex
          );
          const selectedDistractorPos =
            distractorIndices.indexOf(selectedIndex);

          if (
            selectedDistractorPos >= 0 &&
            selectedDistractorPos < question.distractorExplanations.length
          ) {
            expect(result.mistakes).toContain(
              question.distractorExplanations[selectedDistractorPos]
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("score is always exactly 10 (correct) or 0 (incorrect), never anything else", () => {
    fc.assert(
      fc.property(
        mcqQuestionArb,
        fc.integer({ min: 0, max: 3 }),
        (question, selectedIndex) => {
          const result = evaluateMCQLocally(question, selectedIndex);
          expect([0, 10]).toContain(result.score);
        }
      ),
      { numRuns: 100 }
    );
  });
});
