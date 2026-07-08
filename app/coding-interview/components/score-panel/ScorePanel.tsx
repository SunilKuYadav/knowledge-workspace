"use client";

import type { ScorePanelProps } from "./types";
import { DIMENSION_LABELS, getReadinessBadge, getScoreColor } from "./constants";

export function ScorePanel({ report }: ScorePanelProps) {
  const badge = getReadinessBadge(report.readiness);
  const hasPenalties =
    report.penalties.hintsUsed > 0 ||
    report.penalties.timePenalty > 0 ||
    report.penalties.executionAttempts > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Score Report
      </h2>

      {/* Overall Score + Readiness */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
        <div className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {report.overallScore}
          <span className="text-lg font-normal text-zinc-400 dark:text-zinc-500">
            /100
          </span>
        </div>
        <span
          className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Confidence: {report.confidence}%
        </p>
      </div>

      {/* Dimension Scores */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Dimension Scores
        </h3>
        <div className="space-y-4">
          {Object.entries(report.dimensions).map(([key, dim]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {DIMENSION_LABELS[key] ?? key}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {dim.score}/100
                </span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(dim.score)}`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {dim.justification}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Penalties */}
      {hasPenalties && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Penalties Applied
          </h3>
          <div className="space-y-2 text-sm">
            {report.penalties.hintsUsed > 0 && (
              <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                <span>Hints Used</span>
                <span className="text-red-600 dark:text-red-400">
                  -{report.penalties.hintsUsed} pts
                </span>
              </div>
            )}
            {report.penalties.timePenalty > 0 && (
              <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                <span>Time Penalty</span>
                <span className="text-red-600 dark:text-red-400">
                  -{report.penalties.timePenalty} pts
                </span>
              </div>
            )}
            {report.penalties.executionAttempts > 0 && (
              <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                <span>Execution Attempts</span>
                <span className="text-red-600 dark:text-red-400">
                  -{report.penalties.executionAttempts} pts
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
