"use client";

import type { AssessmentPhaseType, DifficultyLevel } from "../../lib/types";

interface PhaseHeaderProps {
  phaseType: AssessmentPhaseType;
  phaseNumber: number; // 1-4
  totalPhases: number; // 4
  currentQuestion: number; // 1-based
  totalQuestions: number;
  difficulty: DifficultyLevel;
}

const PHASE_LABELS: Record<AssessmentPhaseType, string> = {
  conceptual: "Conceptual",
  mcq: "Multiple Choice",
  applied: "Applied",
  "code-challenge": "Code Challenge",
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function PhaseHeader({
  phaseType,
  phaseNumber,
  totalPhases,
  currentQuestion,
  totalQuestions,
  difficulty,
}: PhaseHeaderProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50">
      {/* Top row: phase info + difficulty badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {PHASE_LABELS[phaseType]}
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Phase {phaseNumber} of {totalPhases}
          </span>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${DIFFICULTY_STYLES[difficulty]}`}
        >
          {difficulty}
        </span>
      </div>

      {/* Bottom row: progress dots + question counter */}
      <div className="flex items-center justify-between">
        {/* Progress dots: one per phase */}
        <div className="flex items-center gap-2" aria-label="Phase progress">
          {Array.from({ length: totalPhases }, (_, i) => {
            const phaseIndex = i + 1;
            const isCurrent = phaseIndex === phaseNumber;
            const isCompleted = phaseIndex < phaseNumber;

            return (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isCompleted
                    ? "bg-blue-500 dark:bg-blue-400"
                    : isCurrent
                      ? "bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : "bg-zinc-200 dark:bg-zinc-600"
                }`}
                aria-label={
                  isCompleted
                    ? `Phase ${phaseIndex} completed`
                    : isCurrent
                      ? `Phase ${phaseIndex} current`
                      : `Phase ${phaseIndex} upcoming`
                }
              />
            );
          })}
        </div>

        {/* Question progress */}
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Question {currentQuestion} of {totalQuestions}
        </span>
      </div>
    </div>
  );
}
