import type {
  AssessmentPhaseType,
  AssessmentQuestion,
  AssessmentRecord,
  PhaseResult,
  QuestionEvaluation,
  TrendIndicator,
} from "./types";
import { SCORING_WEIGHTS } from "./constants";

/**
 * Compute phase score as the arithmetic mean of evaluation scores,
 * rounded to one decimal place. Range: [0.0, 10.0].
 */
export function computePhaseScore(evaluations: QuestionEvaluation[]): number {
  if (evaluations.length === 0) return 0;
  const sum = evaluations.reduce((acc, ev) => acc + ev.score, 0);
  const mean = sum / evaluations.length;
  return Math.round(mean * 10) / 10;
}

/**
 * Compute overall confidence score using weighted average formula:
 *   (conceptual × 0.2 + mcq × 0.2 + applied × 0.3 + codeChallenge × 0.3) / 10 × 4 + 1
 * Result is rounded to the nearest 0.5 and clamped to [1.0, 5.0].
 */
export function computeConfidenceScore(
  phaseScores: Record<AssessmentPhaseType, number>
): number {
  const weightedSum =
    phaseScores["conceptual"] * SCORING_WEIGHTS["conceptual"] +
    phaseScores["mcq"] * SCORING_WEIGHTS["mcq"] +
    phaseScores["applied"] * SCORING_WEIGHTS["applied"] +
    phaseScores["code-challenge"] * SCORING_WEIGHTS["code-challenge"];

  const raw = (weightedSum / 10) * 4 + 1;
  const rounded = Math.round(raw * 2) / 2;
  return Math.max(1.0, Math.min(5.0, rounded));
}

/**
 * Calculate trend indicator from assessment history.
 * Requires at least 6 completed records sorted chronologically.
 * Compares avg confidence of last 3 vs preceding 3.
 * Returns null if fewer than 6 records.
 */
export function computeTrend(
  records: AssessmentRecord[]
): TrendIndicator | null {
  const completed = records.filter((r) => r.status === "completed");
  if (completed.length < 6) return null;

  const lastThree = completed.slice(-3);
  const precedingThree = completed.slice(-6, -3);

  const avgLast =
    lastThree.reduce((sum, r) => sum + (r.confidenceScore ?? 0), 0) / 3;
  const avgPreceding =
    precedingThree.reduce((sum, r) => sum + (r.confidenceScore ?? 0), 0) / 3;

  const diff = avgLast - avgPreceding;

  if (diff >= 0.5) return "improving";
  if (diff <= -0.5) return "declining";
  return "stable";
}

/**
 * Extract weak areas from an assessment record.
 * - Phases where phaseScore < 5
 * - Questions where evaluation score < 5
 */
export function extractWeakAreas(record: AssessmentRecord): {
  phases: PhaseResult[];
  questions: {
    phase: AssessmentPhaseType;
    question: AssessmentQuestion;
    evaluation: QuestionEvaluation;
  }[];
} {
  const weakPhases = record.phases.filter((p) => p.phaseScore < 5);

  const weakQuestions: {
    phase: AssessmentPhaseType;
    question: AssessmentQuestion;
    evaluation: QuestionEvaluation;
  }[] = [];

  for (const phase of record.phases) {
    for (let i = 0; i < phase.evaluations.length; i++) {
      if (phase.evaluations[i].score < 5) {
        weakQuestions.push({
          phase: phase.phaseType,
          question: phase.questions[i],
          evaluation: phase.evaluations[i],
        });
      }
    }
  }

  return { phases: weakPhases, questions: weakQuestions };
}
