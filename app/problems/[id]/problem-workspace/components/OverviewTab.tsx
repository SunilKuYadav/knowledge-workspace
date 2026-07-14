"use client";

import type { Problem, ProblemDescription, RevisionData } from "@/types";

interface OverviewTabProps {
  problem: Problem;
  description: ProblemDescription | null;
  revision: RevisionData;
  hasSolution: boolean;
  hasNotes: boolean;
  variationCount: number;
}

export function OverviewTab({
  problem,
  description,
  revision,
  hasSolution,
  hasNotes,
  variationCount,
}: OverviewTabProps) {
  const statusLabel = {
    "not-started": "Not Started",
    attempted: "Attempted",
    solved: "Solved",
  }[problem.status];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Progress summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Status"
          value={statusLabel}
          color={
            problem.status === "solved"
              ? "text-green-600 dark:text-green-400"
              : problem.status === "attempted"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500"
          }
        />
        <StatCard
          label="Confidence"
          value={`${revision.confidence}/5`}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Attempts"
          value={String(problem.attempts ?? 0)}
          color="text-zinc-700 dark:text-zinc-300"
        />
        <StatCard
          label="Last Solved"
          value={
            problem.lastSolved
              ? new Date(problem.lastSolved).toLocaleDateString()
              : "Never"
          }
          color="text-zinc-700 dark:text-zinc-300"
        />
      </div>

      {/* Problem metadata */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Problem Info
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Difficulty" value={problem.difficulty} />
          <InfoRow
            label="Frequency"
            value={problem.frequency?.replace("-", " ") || "—"}
          />
          {(problem.timeComplexity || description?.timeComplexity) && (
            <InfoRow
              label="Time Complexity"
              value={problem.timeComplexity || description?.timeComplexity || "—"}
              mono
            />
          )}
          {(problem.spaceComplexity || description?.spaceComplexity) && (
            <InfoRow
              label="Space Complexity"
              value={problem.spaceComplexity || description?.spaceComplexity || "—"}
              mono
            />
          )}
          <InfoRow
            label="Revision Count"
            value={String(problem.revisionCount ?? 0)}
          />
        </div>

        {/* Patterns */}
        {problem.patterns.length > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Patterns
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {problem.patterns.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Companies */}
        {problem.companies.length > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Companies
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {problem.companies.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* URL */}
        {problem.url && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Link
            </span>
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-0.5 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              {problem.url}
            </a>
          </div>
        )}
      </section>

      {/* Content availability */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Content
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ContentBadge label="Description" ready={!!description} />
          <ContentBadge label="Solution" ready={hasSolution} />
          <ContentBadge label="Notes" ready={hasNotes} />
          <ContentBadge
            label="Variations"
            ready={variationCount > 0}
            count={variationCount}
          />
        </div>
      </section>

      {/* Revision history */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Revision History
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Last Reviewed
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {revision.lastReviewed
                ? new Date(revision.lastReviewed).toLocaleDateString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Next Review
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {new Date(revision.nextReview).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Confidence
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {revision.confidence}/5
            </p>
          </div>
        </div>

        {/* Confidence trend */}
        {revision.history.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Confidence Trend
            </p>
            <div className="flex items-end gap-1 h-16 mb-4">
              {revision.history.map((entry) => {
                const height = (entry.confidence / 5) * 100;
                const barColor = {
                  1: "bg-red-400",
                  2: "bg-orange-400",
                  3: "bg-yellow-400",
                  4: "bg-lime-400",
                  5: "bg-green-400",
                }[entry.confidence];
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col items-center gap-0.5"
                    title={`${new Date(entry.date).toLocaleDateString()} — ${entry.confidence}/5`}
                  >
                    <div
                      className={`w-6 rounded-sm ${barColor}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-zinc-400">
                      {entry.confidence}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* History entries */}
            <ul className="space-y-2">
              {revision.history
                .slice()
                .reverse()
                .slice(0, 5)
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between text-sm border-l-2 border-zinc-200 dark:border-zinc-700 pl-3"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {new Date(entry.date).toLocaleDateString()}
                      {entry.notes && (
                        <span className="text-zinc-400 ml-2 text-xs">
                          — {entry.notes}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {entry.confidence}/5
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {revision.history.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
            No revision history yet. Complete a self-test to start tracking.
          </p>
        )}
      </section>

      {/* Timestamps */}
      <div className="flex gap-6 text-xs text-zinc-400 dark:text-zinc-500">
        <span>Created: {new Date(problem.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ─── Overview sub-components ────────────────────────────── */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <p
        className={`text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ContentBadge({
  label,
  ready,
  count,
}: {
  label: string;
  ready: boolean;
  count?: number;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        ready
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <span>{ready ? "✓" : "○"}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs font-medium">{count}</span>
      )}
    </div>
  );
}
