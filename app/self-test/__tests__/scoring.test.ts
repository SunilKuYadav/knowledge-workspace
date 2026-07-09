import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computePhaseScore,
  computeConfidenceScore,
  computeTrend,
  extractWeakAreas,
} from "../lib/scoring";
import type {
  AssessmentPhaseType,
  AssessmentRecord,
  QuestionEvaluation,
} from "../lib/types";
import { SCORING_WEIGHTS } from "../lib/constants";

/* ─── Helpers ─────────────────────────────────────────────── */

function makeEvaluation(score: number): QuestionEvaluation {
  return {
    score,
    feedback: "test feedback",
    mistakes: [],
    keyInsights: [],
  };
}

function makeRecord(
  confidenceScore: number,
  status: "completed" | "in-progress" = "completed"
): AssessmentRecord {
  return {
    id: crypto.randomUUID(),
    topicId: "test-topic",
    status,
    startedAt: new Date().toISOString(),
    completedAt: status === "completed" ? new Date().toISOString() : undefined,
    experienceLevel: 10,
    phases: [],
    confidenceScore,
    initialDifficulty: "medium",
  };
}

/* ─── Unit Tests: computePhaseScore ──────────────────────── */

describe("computePhaseScore", () => {
  it("returns 0 for empty evaluations", () => {
    expect(computePhaseScore([])).toBe(0);
  });

  it("returns 10 for all perfect scores", () => {
    const evals = [makeEvaluation(10), makeEvaluation(10), makeEvaluation(10)];
    expect(computePhaseScore(evals)).toBe(10);
  });

  it("returns 0 for all zero scores", () => {
    const evals = [makeEvaluation(0), makeEvaluation(0)];
    expect(computePhaseScore(evals)).toBe(0);
  });

  it("computes average with rounding to 1 decimal", () => {
    const evals = [makeEvaluation(7), makeEvaluation(8), makeEvaluation(9)];
    expect(computePhaseScore(evals)).toBe(8);
  });

  it("handles non-even averages", () => {
    const evals = [makeEvaluation(7), makeEvaluation(8)];
    expect(computePhaseScore(evals)).toBe(7.5);
  });

  it("rounds correctly for repeating decimals", () => {
    // (7 + 7 + 8) / 3 = 7.333...
    const evals = [makeEvaluation(7), makeEvaluation(7), makeEvaluation(8)];
    expect(computePhaseScore(evals)).toBe(7.3);
  });
});

/* ─── Unit Tests: computeConfidenceScore ─────────────────── */

describe("computeConfidenceScore", () => {
  it("returns 1.0 for all zero scores", () => {
    const scores = { conceptual: 0, mcq: 0, applied: 0, "code-challenge": 0 };
    expect(computeConfidenceScore(scores)).toBe(1.0);
  });

  it("returns 5.0 for all perfect scores", () => {
    const scores = {
      conceptual: 10,
      mcq: 10,
      applied: 10,
      "code-challenge": 10,
    };
    expect(computeConfidenceScore(scores)).toBe(5.0);
  });

  it("returns a multiple of 0.5", () => {
    const scores = { conceptual: 5, mcq: 6, applied: 7, "code-challenge": 8 };
    const result = computeConfidenceScore(scores);
    expect(result % 0.5).toBe(0);
  });

  it("computes the correct weighted formula", () => {
    // (5*0.2 + 5*0.2 + 5*0.3 + 5*0.3) / 10 * 4 + 1 = (5)/10*4+1 = 3.0
    const scores = { conceptual: 5, mcq: 5, applied: 5, "code-challenge": 5 };
    expect(computeConfidenceScore(scores)).toBe(3.0);
  });
});

/* ─── Unit Tests: computeTrend ───────────────────────────── */

describe("computeTrend", () => {
  it("returns null for fewer than 6 records", () => {
    const records = Array.from({ length: 5 }, () => makeRecord(3));
    expect(computeTrend(records)).toBeNull();
  });

  it("returns null for empty records", () => {
    expect(computeTrend([])).toBeNull();
  });

  it('returns "improving" when last 3 avg exceeds preceding 3 by >= 0.5', () => {
    const records = [
      makeRecord(3),
      makeRecord(3),
      makeRecord(3),
      makeRecord(3.5),
      makeRecord(3.5),
      makeRecord(3.5),
    ];
    expect(computeTrend(records)).toBe("improving");
  });

  it('returns "declining" when last 3 avg is lower by >= 0.5', () => {
    const records = [
      makeRecord(4),
      makeRecord(4),
      makeRecord(4),
      makeRecord(3.5),
      makeRecord(3.5),
      makeRecord(3.5),
    ];
    expect(computeTrend(records)).toBe("declining");
  });

  it('returns "stable" when difference is less than 0.5', () => {
    const records = [
      makeRecord(3),
      makeRecord(3),
      makeRecord(3),
      makeRecord(3.2),
      makeRecord(3.2),
      makeRecord(3.2),
    ];
    expect(computeTrend(records)).toBe("stable");
  });

  it("only considers completed records", () => {
    const records = [
      makeRecord(3),
      makeRecord(3),
      makeRecord(3),
      makeRecord(3, "in-progress"),
      makeRecord(5),
      makeRecord(5),
      makeRecord(5),
    ];
    // Only 6 completed: [3,3,3,5,5,5]. Last 3 avg = 5, preceding 3 avg = 3, diff = 2
    expect(computeTrend(records)).toBe("improving");
  });
});

/* ─── Unit Tests: extractWeakAreas ───────────────────────── */

describe("extractWeakAreas", () => {
  it("returns empty arrays when all scores are >= 5", () => {
    const record: AssessmentRecord = {
      id: crypto.randomUUID(),
      topicId: "test",
      status: "completed",
      startedAt: new Date().toISOString(),
      experienceLevel: 10,
      phases: [
        {
          phaseType: "conceptual",
          questions: [
            { type: "conceptual", question: "q1", expectedAnswer: "a1" },
          ],
          userAnswers: ["a1"],
          evaluations: [makeEvaluation(7)],
          phaseScore: 7,
          difficulty: "medium",
        },
      ],
      initialDifficulty: "medium",
    };
    const result = extractWeakAreas(record);
    expect(result.phases).toHaveLength(0);
    expect(result.questions).toHaveLength(0);
  });

  it("identifies weak phases (score < 5)", () => {
    const record: AssessmentRecord = {
      id: crypto.randomUUID(),
      topicId: "test",
      status: "completed",
      startedAt: new Date().toISOString(),
      experienceLevel: 10,
      phases: [
        {
          phaseType: "conceptual",
          questions: [
            { type: "conceptual", question: "q1", expectedAnswer: "a1" },
          ],
          userAnswers: ["a1"],
          evaluations: [makeEvaluation(3)],
          phaseScore: 3,
          difficulty: "medium",
        },
        {
          phaseType: "mcq",
          questions: [
            {
              type: "mcq",
              question: "q2",
              options: ["a", "b", "c", "d"],
              correctIndex: 0,
              explanation: "e",
              distractorExplanations: ["d1", "d2", "d3"],
            },
          ],
          userAnswers: ["a"],
          evaluations: [makeEvaluation(8)],
          phaseScore: 8,
          difficulty: "medium",
        },
      ],
      initialDifficulty: "medium",
    };
    const result = extractWeakAreas(record);
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].phaseType).toBe("conceptual");
  });

  it("identifies weak questions (eval score < 5)", () => {
    const record: AssessmentRecord = {
      id: crypto.randomUUID(),
      topicId: "test",
      status: "completed",
      startedAt: new Date().toISOString(),
      experienceLevel: 10,
      phases: [
        {
          phaseType: "applied",
          questions: [
            {
              type: "applied",
              question: "q1",
              scenario: "s1",
              expectedAnswer: "a1",
            },
            {
              type: "applied",
              question: "q2",
              scenario: "s2",
              expectedAnswer: "a2",
            },
          ],
          userAnswers: ["ans1", "ans2"],
          evaluations: [makeEvaluation(3), makeEvaluation(7)],
          phaseScore: 5,
          difficulty: "medium",
        },
      ],
      initialDifficulty: "medium",
    };
    const result = extractWeakAreas(record);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].evaluation.score).toBe(3);
  });
});

/* ─── Property Tests ─────────────────────────────────────── */

describe("Property 1: Phase Score Computation", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any array of QuestionEvaluation objects (each with a score between 0 and 10),
   * computePhaseScore SHALL return the arithmetic mean rounded to exactly one decimal place,
   * and the result SHALL always be in [0.0, 10.0].
   */
  it("phase score is always in [0, 10] and equals arithmetic mean rounded to 1 decimal", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            score: fc.integer({ min: 0, max: 10 }),
            feedback: fc.constant("feedback"),
            mistakes: fc.constant([]),
            keyInsights: fc.constant([]),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (evaluations) => {
          const result = computePhaseScore(
            evaluations as QuestionEvaluation[]
          );

          // Result in range
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(10);

          // Result equals arithmetic mean rounded to 1 decimal
          const sum = evaluations.reduce((acc, ev) => acc + ev.score, 0);
          const expectedMean =
            Math.round((sum / evaluations.length) * 10) / 10;
          expect(result).toBeCloseTo(expectedMean, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 2: Confidence Score Weighted Formula", () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * For any set of four phase scores (each in [0, 10]),
   * computeConfidenceScore SHALL return a value that:
   * 1. Is in [1.0, 5.0]
   * 2. Is a multiple of 0.5
   * 3. Equals the weighted formula rounded to nearest 0.5
   */
  it("confidence score is always in [1.0, 5.0], a multiple of 0.5, and equals weighted formula", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (conceptual, mcq, applied, codeChallenge) => {
          const scores: Record<AssessmentPhaseType, number> = {
            conceptual,
            mcq,
            applied,
            "code-challenge": codeChallenge,
          };
          const result = computeConfidenceScore(scores);

          // Range check
          expect(result).toBeGreaterThanOrEqual(1.0);
          expect(result).toBeLessThanOrEqual(5.0);

          // Multiple of 0.5
          expect(result * 2).toBe(Math.round(result * 2));

          // Matches formula
          const weightedSum =
            conceptual * 0.2 + mcq * 0.2 + applied * 0.3 + codeChallenge * 0.3;
          const raw = (weightedSum / 10) * 4 + 1;
          const expected = Math.max(1.0, Math.min(5.0, Math.round(raw * 2) / 2));
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 11: Trend Computation", () => {
  /**
   * **Validates: Requirements 9.6, 9.7**
   *
   * For arrays of 6+ completed records, computeTrend returns correct indicators.
   * For fewer than 6 records, returns null.
   */
  it("returns null for fewer than 6 completed records", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (count) => {
          const records = Array.from({ length: count }, () =>
            makeRecord(3)
          );
          expect(computeTrend(records)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns correct trend indicators for 6+ completed records", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 1.0, max: 5.0, noNaN: true }), {
          minLength: 3,
          maxLength: 10,
        }),
        fc.array(fc.double({ min: 1.0, max: 5.0, noNaN: true }), {
          minLength: 3,
          maxLength: 10,
        }),
        (preceding, last) => {
          // Take exactly 3 from each
          const precSlice = preceding.slice(0, 3);
          const lastSlice = last.slice(0, 3);

          const records = [
            ...precSlice.map((c) => makeRecord(c)),
            ...lastSlice.map((c) => makeRecord(c)),
          ];

          const result = computeTrend(records);

          const avgLast = lastSlice.reduce((s, v) => s + v, 0) / 3;
          const avgPrec = precSlice.reduce((s, v) => s + v, 0) / 3;
          const diff = avgLast - avgPrec;

          if (diff >= 0.5) {
            expect(result).toBe("improving");
          } else if (diff <= -0.5) {
            expect(result).toBe("declining");
          } else {
            expect(result).toBe("stable");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 12: Weak Area Extraction", () => {
  /**
   * **Validates: Requirements 7.3, 9.5**
   *
   * extractWeakAreas returns only phases with phaseScore < 5,
   * and only questions with evaluation score < 5.
   * Phases with score >= 5 never appear in weak areas.
   */
  it("returns exactly phases < 5 and questions < 5", () => {
    const phaseTypes: AssessmentPhaseType[] = [
      "conceptual",
      "mcq",
      "applied",
      "code-challenge",
    ];

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            phaseScore: fc.double({ min: 0, max: 10, noNaN: true }),
            evalScores: fc.array(fc.integer({ min: 0, max: 10 }), {
              minLength: 2,
              maxLength: 3,
            }),
          }),
          { minLength: 1, maxLength: 4 }
        ),
        (phaseData) => {
          const phases = phaseData.map((p, i) => ({
            phaseType: phaseTypes[i % 4],
            questions: p.evalScores.map(() => ({
              type: "conceptual" as const,
              question: "q",
              expectedAnswer: "a",
            })),
            userAnswers: p.evalScores.map(() => "answer"),
            evaluations: p.evalScores.map((s) => makeEvaluation(s)),
            phaseScore: p.phaseScore,
            difficulty: "medium" as const,
          }));

          const record: AssessmentRecord = {
            id: crypto.randomUUID(),
            topicId: "test",
            status: "completed",
            startedAt: new Date().toISOString(),
            experienceLevel: 10,
            phases,
            initialDifficulty: "medium",
          };

          const result = extractWeakAreas(record);

          // All returned phases have score < 5
          for (const phase of result.phases) {
            expect(phase.phaseScore).toBeLessThan(5);
          }

          // All returned questions have eval score < 5
          for (const q of result.questions) {
            expect(q.evaluation.score).toBeLessThan(5);
          }

          // No phase with score >= 5 appears
          const weakPhaseTypes = result.phases.map((p) => p.phaseType);
          for (const phase of phases) {
            if (phase.phaseScore >= 5) {
              expect(weakPhaseTypes).not.toContain(phase.phaseType);
            }
          }

          // All phases with score < 5 are included
          const expectedWeakCount = phases.filter(
            (p) => p.phaseScore < 5
          ).length;
          expect(result.phases).toHaveLength(expectedWeakCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
