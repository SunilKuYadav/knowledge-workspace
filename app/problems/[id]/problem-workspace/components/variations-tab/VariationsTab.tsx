"use client";

import { useState, useCallback } from "react";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { ProblemDescription } from "@/types";

const MAX_VARIATIONS = 3;

export interface VariationsTabProps {
  desc: ProblemDescription | null;
  variationLoading: boolean;
  variationStreamContent: string;
  handleGenerateVariation: (upgradeVariationId?: string) => void;
  handleCancelVariation: () => void;
  onDescUpdated: (desc: ProblemDescription) => void;
  /** Navigate to Practice tab with this variation selected */
  onPracticeVariation?: (variationId: string, variationTitle: string, difficulty: "easy" | "medium" | "hard") => void;
}

type VariationStatus = "not-started" | "attempted" | "solved";

const STATUS_CONFIG: Record<VariationStatus, { label: string; color: string; icon: string }> = {
  "not-started": {
    label: "Not Started",
    color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    icon: "○",
  },
  attempted: {
    label: "Attempted",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: "◐",
  },
  solved: {
    label: "Solved",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: "●",
  },
};

export function VariationsTab({
  desc,
  variationLoading,
  variationStreamContent,
  handleGenerateVariation,
  handleCancelVariation,
  onDescUpdated,
  onPracticeVariation,
}: VariationsTabProps) {
  const [upgradeConfirmId, setUpgradeConfirmId] = useState<string | null>(null);

  const handleUpgradeConfirm = useCallback(
    (variationId: string) => {
      setUpgradeConfirmId(null);
      handleGenerateVariation(variationId);
    },
    [handleGenerateVariation],
  );

  // Compute progress stats
  const variations = desc?.variations || [];
  const totalCount = variations.length;
  const solvedCount = variations.filter((v) => v.status === "solved").length;
  const attemptedCount = variations.filter((v) => v.status === "attempted").length;
  const isAtMax = totalCount >= MAX_VARIATIONS;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Problem Variations
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            {totalCount}/{MAX_VARIATIONS}
          </span>
        </div>

        {variationLoading ? (
          <button
            onClick={handleCancelVariation}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Cancel
          </button>
        ) : isAtMax ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
            Max reached — upgrade existing variations below
          </span>
        ) : (
          <button
            onClick={() => handleGenerateVariation()}
            disabled={variationLoading || !desc}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            🔀 New Variation ({totalCount}/{MAX_VARIATIONS})
          </button>
        )}
      </div>

      {/* Progress summary */}
      {totalCount > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Progress
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {solvedCount}/{totalCount} solved
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${(solvedCount / totalCount) * 100}%` }}
              />
              <div
                className="bg-blue-400 transition-all duration-300"
                style={{ width: `${(attemptedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Solved ({solvedCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Attempted ({attemptedCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" />
              Not Started ({totalCount - solvedCount - attemptedCount})
            </span>
          </div>
        </div>
      )}

      {/* Streaming preview while generating */}
      {variationLoading && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Generating variation...
            </span>
          </div>
          {variationStreamContent && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                {variationStreamContent}
              </pre>
            </div>
          )}
        </div>
      )}

      {!desc && (
        <p className="text-sm text-zinc-400">
          Generate a description first to enable variations.
        </p>
      )}

      {variations.length > 0 ? (
        <div className="space-y-4">
          {variations.map((v) => {
            const status: VariationStatus = v.status || "not-started";
            const config = STATUS_CONFIG[status];
            const practiceCount = v.practiceHistory?.length || 0;
            const isConfirmingUpgrade = upgradeConfirmId === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-lg border bg-white dark:bg-zinc-900 p-5 space-y-3 transition-colors ${
                  status === "solved"
                    ? "border-green-200 dark:border-green-800/50"
                    : status === "attempted"
                      ? "border-blue-200 dark:border-blue-800/50"
                      : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {v.title}
                    </h4>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                        v.difficulty === "easy"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : v.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {v.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Practice button — navigate to practice tab with this variation */}
                    {onPracticeVariation && (
                      <button
                        onClick={() => onPracticeVariation(v.id, v.title, v.difficulty)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                        title="Practice this variation"
                      >
                        ▶ Practice
                      </button>
                    )}

                    {/* Upgrade button — shown when at max */}
                    {isAtMax && !variationLoading && (
                      <button
                        onClick={() => setUpgradeConfirmId(v.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        title="Upgrade this variation with a better one"
                      >
                        ⬆ Upgrade
                      </button>
                    )}

                    {/* Read-only status badge */}
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${config.color}`}
                      title={`Status: ${config.label} (updated via evaluation)`}
                    >
                      <span className="text-sm">{config.icon}</span>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Upgrade confirmation dialog */}
                {isConfirmingUpgrade && (
                  <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Upgrade this variation? This will generate a new, improved variation and <strong>delete all practice history</strong> for this one.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpgradeConfirm(v.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                      >
                        Yes, Upgrade
                      </button>
                      <button
                        onClick={() => setUpgradeConfirmId(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Practice metadata */}
                {(practiceCount > 0 || v.lastPracticedAt) && (
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {practiceCount > 0 && (
                      <span>
                        {practiceCount} attempt{practiceCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {v.lastPracticedAt && (
                      <span>
                        Last practiced:{" "}
                        {new Date(v.lastPracticedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <MarkdownRenderer>{v.description}</MarkdownRenderer>
                </div>

                {v.hint && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium">
                      Show Hint
                    </summary>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400 pl-4">
                      {v.hint}
                    </p>
                  </details>
                )}

                {v.testCases.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 font-medium">
                      Test Cases ({v.testCases.length})
                    </summary>
                    <div className="mt-2 space-y-1 pl-4">
                      {v.testCases.map((tc, i) => (
                        <div key={i} className="font-mono text-xs">
                          <span className="text-zinc-500">Input:</span>{" "}
                          {tc.input} →{" "}
                          <span className="text-green-600 dark:text-green-400">
                            {tc.expectedOutput}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Practice history (collapsible) */}
                {practiceCount > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 font-medium">
                      Practice History ({practiceCount})
                    </summary>
                    <div className="mt-2 space-y-2 pl-4">
                      {(v.practiceHistory || []).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 text-xs border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-1"
                        >
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                            {new Date(entry.attemptedAt).toLocaleDateString()}{" "}
                            {new Date(entry.attemptedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {entry.score !== undefined && (
                            <span className={`font-medium ${entry.score >= 80 ? "text-green-600 dark:text-green-400" : entry.score >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                              {entry.score}/100
                            </span>
                          )}
                          {entry.note && (
                            <span className="text-zinc-600 dark:text-zinc-400 truncate">
                              {entry.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        desc && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
            No variations yet. Click &quot;New Variation&quot; to generate one.
          </p>
        )
      )}
    </div>
  );
}
