import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  MCQQuestionSchema,
  CodeChallengeQuestionSchema,
  QuestionEvaluationSchema,
} from "../lib/types";

/* ─── Property 6: MCQ Schema Validation ──────────────────── */

describe("Property 6: MCQ Schema Validation (Integration)", () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * For any object, MCQQuestionSchema.safeParse SHALL succeed if and only if the object
   * has a question string, an options array of exactly 4 strings, a correctIndex integer
   * in [0, 3], an explanation string, and a distractorExplanations array of exactly 3 strings.
   */
  it("accepts all well-formed MCQ objects", () => {
    fc.assert(
      fc.property(
        fc.record({
          question: fc.string({ minLength: 1 }),
          options: fc.tuple(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
          ),
          correctIndex: fc.integer({ min: 0, max: 3 }),
          explanation: fc.string({ minLength: 1 }),
          distractorExplanations: fc.tuple(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
          ),
        }),
        (data) => {
          const input = {
            type: "mcq",
            question: data.question,
            options: [...data.options],
            correctIndex: data.correctIndex,
            explanation: data.explanation,
            distractorExplanations: [...data.distractorExplanations],
          };

          const result = MCQQuestionSchema.safeParse(input);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects MCQ objects with incorrect option count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }).filter((n) => n !== 4),
        fc.string({ minLength: 1 }),
        (optionCount, baseStr) => {
          const options = Array.from({ length: optionCount }, () => baseStr);
          const input = {
            type: "mcq",
            question: "What is X?",
            options,
            correctIndex: 0,
            explanation: "Because...",
            distractorExplanations: ["d1", "d2", "d3"],
          };

          const result = MCQQuestionSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects MCQ objects with correctIndex outside [0, 3]", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),
          fc.integer({ min: 4, max: 100 }),
        ),
        (correctIndex) => {
          const input = {
            type: "mcq",
            question: "What is X?",
            options: ["a", "b", "c", "d"],
            correctIndex,
            explanation: "Because...",
            distractorExplanations: ["d1", "d2", "d3"],
          };

          const result = MCQQuestionSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects MCQ objects with incorrect distractor count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }).filter((n) => n !== 3),
        fc.string({ minLength: 1 }),
        (distractorCount, baseStr) => {
          const distractors = Array.from(
            { length: distractorCount },
            () => baseStr,
          );
          const input = {
            type: "mcq",
            question: "What is X?",
            options: ["a", "b", "c", "d"],
            correctIndex: 0,
            explanation: "Because...",
            distractorExplanations: distractors,
          };

          const result = MCQQuestionSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/* ─── Property 7: Code Challenge Schema Validation ───────── */

describe("Property 7: Code Challenge Schema Validation (Integration)", () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * For any object, CodeChallengeQuestionSchema.safeParse SHALL succeed if and only if
   * the object has question, problemStatement, inputFormat, outputFormat strings, and an
   * examples array of 1-3 objects each containing input, expectedOutput, and explanation strings.
   */
  it("accepts all well-formed Code Challenge objects with 1-3 examples", () => {
    fc.assert(
      fc.property(
        fc.record({
          question: fc.string({ minLength: 1 }),
          problemStatement: fc.string({ minLength: 1 }),
          inputFormat: fc.string({ minLength: 1 }),
          outputFormat: fc.string({ minLength: 1 }),
        }),
        fc.array(
          fc.record({
            input: fc.string({ minLength: 1 }),
            expectedOutput: fc.string({ minLength: 1 }),
            explanation: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        (data, examples) => {
          const input = {
            type: "code-challenge",
            question: data.question,
            problemStatement: data.problemStatement,
            inputFormat: data.inputFormat,
            outputFormat: data.outputFormat,
            examples,
          };

          const result = CodeChallengeQuestionSchema.safeParse(input);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects Code Challenge objects with 0 examples", () => {
    const input = {
      type: "code-challenge",
      question: "Implement function",
      problemStatement: "Given an array...",
      inputFormat: "Array of integers",
      outputFormat: "Single integer",
      examples: [],
    };

    const result = CodeChallengeQuestionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects Code Challenge objects with more than 3 examples", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            input: fc.string({ minLength: 1 }),
            expectedOutput: fc.string({ minLength: 1 }),
            explanation: fc.string({ minLength: 1 }),
          }),
          { minLength: 4, maxLength: 10 },
        ),
        (examples) => {
          const input = {
            type: "code-challenge",
            question: "Implement function",
            problemStatement: "Given an array...",
            inputFormat: "Array of integers",
            outputFormat: "Single integer",
            examples,
          };

          const result = CodeChallengeQuestionSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects Code Challenge objects missing required string fields", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "question",
          "problemStatement",
          "inputFormat",
          "outputFormat",
        ),
        (fieldToRemove) => {
          const input: Record<string, unknown> = {
            type: "code-challenge",
            question: "Implement function",
            problemStatement: "Given an array...",
            inputFormat: "Array of integers",
            outputFormat: "Single integer",
            examples: [
              {
                input: "[1,2,3]",
                expectedOutput: "6",
                explanation: "Sum",
              },
            ],
          };

          delete input[fieldToRemove];
          const result = CodeChallengeQuestionSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/* ─── Property 8: Evaluation Schema Bounds ───────────────── */

describe("Property 8: Evaluation Schema Bounds (Integration)", () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * For any object, QuestionEvaluationSchema.safeParse SHALL succeed only when:
   * score is an integer in [0, 10], feedback is a string of at most 500 characters,
   * mistakes is an array of at most 5 strings, and keyInsights is an array of at most 3 strings.
   */
  it("accepts valid evaluation objects within all bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.string({ minLength: 0, maxLength: 500 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 3 }),
        (score, feedback, mistakes, keyInsights) => {
          const input = { score, feedback, mistakes, keyInsights };
          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects scores outside [0, 10]", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),
          fc.integer({ min: 11, max: 100 }),
        ),
        (score) => {
          const input = {
            score,
            feedback: "Good",
            mistakes: [],
            keyInsights: [],
          };

          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects non-integer scores", () => {
    fc.assert(
      fc.property(
        fc
          .double({ min: 0.1, max: 9.9, noNaN: true })
          .filter((n) => !Number.isInteger(n)),
        (score) => {
          const input = {
            score,
            feedback: "Good",
            mistakes: [],
            keyInsights: [],
          };

          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects feedback longer than 500 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (feedback) => {
          const input = {
            score: 5,
            feedback,
            mistakes: [],
            keyInsights: [],
          };

          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects mistakes array with more than 5 items", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 6, maxLength: 10 }),
        (mistakes) => {
          const input = {
            score: 5,
            feedback: "Good",
            mistakes,
            keyInsights: [],
          };

          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects keyInsights array with more than 3 items", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 4, maxLength: 10 }),
        (keyInsights) => {
          const input = {
            score: 5,
            feedback: "Good",
            mistakes: [],
            keyInsights,
          };

          const result = QuestionEvaluationSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
