"use client";

import type { PhaseResult, AssessmentPhaseType } from "../../lib/types";

interface PhaseSummaryProps {
  phaseResult: PhaseResult;
  onContinue: () => void;
}

const PHASE_LABELS: Record<AssessmentPhaseType, string> = {
  conceptual: "Conceptual",
  mcq: "Multiple Choice",
  applied: "Applied",
  "code-challenge": "Code Challenge",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function getScoreColor(score: number) {
  if (score >= 8) return "text-green-500";
  if (score >= 5) return "text-yellow-500";
  return "text-red-500";
}

function getScoreBadgeBg(score: number) {
  if (score >= 8)
    return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
  if (score >= 5)
    return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
  return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
}

export function PhaseSummary({ phaseResult, onContinue }: PhaseSummaryProps) {
  const isPassing = phaseResult.phaseScore >= 5;
  const progressPercent = (phaseResult.phaseScore / 10) * 100;

  return (
    <div className="flex flex-col gap-5 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Header: Phase name + difficulty badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {PHASE_LABELS[phaseResult.phaseType]} — Summary
        </h2>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${DIFFICULTY_STYLES[phaseResult.difficulty]}`}
        >
          {phaseResult.difficulty}
        </span>
      </div>

      {/* Phase score with progress bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-3xl font-bold ${getScoreColor(phaseResult.phaseScore)}`}
          >
            {phaseResult.phaseScore.toFixed(1)}
          </span>
          <span className="text-lg text-zinc-400 dark:text-zinc-500">/10</span>
          <span
            className={`ml-3 px-2.5 py-0.5 text-xs font-medium rounded-full ${
              isPassing
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {isPassing ? "Pass" : "Fail"}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPassing ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Per-question breakdown */}
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
          Question Breakdown
        </p>
        <div className="flex flex-col gap-3">
          {phaseResult.questions.map((question, idx) => {
            const evaluation = phaseResult.evaluations[idx];
            if (!evaluation) return null;

            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800"
              >
                {/* Score badge */}
                <div
                  className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border ${getScoreBadgeBg(evaluation.score)}`}
                >
                  <span
                    className={`text-sm font-bold ${getScoreColor(evaluation.score)}`}
                  >
                    {evaluation.score}
                  </span>
                </div>
                {/* Question text + feedback */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {question.question}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {evaluation.feedback}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Next Phase
        </button>
      </div>
    </div>
  );
}
