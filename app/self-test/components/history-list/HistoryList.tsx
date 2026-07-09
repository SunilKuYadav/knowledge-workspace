"use client";

import type { AssessmentRecord } from "../../lib/types";
import { TrendIndicator } from "../trend-indicator/TrendIndicator";

interface HistoryListProps {
  records: AssessmentRecord[];
  trend: "improving" | "declining" | "stable" | null;
  onSelect: (recordId: string) => void;
  onDelete: (recordId: string) => void;
  onRegenerate: (recordId: string) => void;
}

const PHASE_LABELS: Record<string, string> = {
  conceptual: "Conceptual",
  mcq: "MCQ",
  applied: "Applied",
  "code-challenge": "Code",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function HistoryList({
  records,
  trend,
  onSelect,
  onDelete,
  onRegenerate,
}: HistoryListProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 text-4xl">📋</div>
        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
          No assessment history
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Complete an assessment to see your results here.
        </p>
      </div>
    );
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <div className="space-y-3">
      {/* Header with trend */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Assessment History ({records.length})
        </h3>
        {trend && <TrendIndicator trend={trend} />}
      </div>

      {/* Record list */}
      <ul className="space-y-2" role="list" aria-label="Assessment history">
        {sorted.map((record) => (
          <li
            key={record.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            {/* Top row: date + confidence score */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {formatDate(record.startedAt)}
                </span>
                {record.confidenceScore != null && (
                  <span
                    className={`ml-2 text-sm font-semibold ${getScoreColor(record.confidenceScore * 2)}`}
                  >
                    {record.confidenceScore.toFixed(1)}/5.0
                  </span>
                )}
              </div>
              {trend && <TrendIndicator trend={trend} />}
            </div>

            {/* Phase scores row */}
            {record.phases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {record.phases.map((phase) => (
                  <span
                    key={phase.phaseType}
                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-700"
                  >
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {PHASE_LABELS[phase.phaseType] ?? phase.phaseType}:
                    </span>
                    <span
                      className={`font-medium ${getScoreColor(phase.phaseScore)}`}
                    >
                      {phase.phaseScore.toFixed(1)}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onSelect(record.id)}
                className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() => onRegenerate(record.id)}
                className="rounded px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                Retry Weak Areas
              </button>
              <button
                type="button"
                onClick={() => onDelete(record.id)}
                className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
