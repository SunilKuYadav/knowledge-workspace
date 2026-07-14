"use client";

import type { Topic } from "@/types";
import type { Problem } from "@/types";
import type { DuplicateGroup } from "./types";
import { useDuplicates } from "./useDuplicates";

export default function DuplicatesClient() {
  const {
    loading,
    error,
    topicDuplicates,
    problemDuplicates,
    activeTab,
    setActiveTab,
    merging,
    aiLoading,
    mergeResults,
    successMessage,
    fetchDuplicates,
    requestAIMerge,
    executeMerge,
    localMergeTopic,
    localMergeProblem,
    setError,
  } = useDuplicates();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Scanning workspace for duplicates…
          </p>
        </div>
      </div>
    );
  }

  const totalDuplicates = topicDuplicates.length + problemDuplicates.length;

  return (
    <div>
      {/* Success toast */}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ {successMessage}
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Found{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {totalDuplicates}
          </span>{" "}
          potential duplicate group{totalDuplicates !== 1 ? "s" : ""}{" "}
          ({topicDuplicates.length} topic, {problemDuplicates.length} problem)
        </p>
        <button
          onClick={fetchDuplicates}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ↻ Rescan
        </button>
      </div>

      {totalDuplicates === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
            No duplicates found
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your workspace is clean — no redundant topics or problems detected.
          </p>
        </div>
      ) : (
        <>
          {/* Tab selector */}
          <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
            <TabButton
              active={activeTab === "topics"}
              onClick={() => setActiveTab("topics")}
              count={topicDuplicates.length}
              label="Topics"
            />
            <TabButton
              active={activeTab === "problems"}
              onClick={() => setActiveTab("problems")}
              count={problemDuplicates.length}
              label="Problems"
            />
          </div>

          {/* Groups */}
          <div className="space-y-6">
            {activeTab === "topics" &&
              topicDuplicates.map((group, idx) => (
                <TopicDuplicateGroup
                  key={group.items[0].id}
                  group={group}
                  groupKey={`topic-${idx}`}
                  merging={merging}
                  aiLoading={aiLoading}
                  mergeResult={mergeResults[`topic-${idx}`]}
                  onRequestAI={() =>
                    requestAIMerge(
                      `topic-${idx}`,
                      "topic",
                      group.items as unknown as Record<string, unknown>[],
                    )
                  }
                  onLocalMerge={() => localMergeTopic(group.items)}
                  onExecuteMerge={(primaryId, duplicateIds, data) =>
                    executeMerge(`topic-${idx}`, "topic", primaryId, duplicateIds, data)
                  }
                />
              ))}
            {activeTab === "problems" &&
              problemDuplicates.map((group, idx) => (
                <ProblemDuplicateGroup
                  key={group.items[0].id}
                  group={group}
                  groupKey={`problem-${idx}`}
                  merging={merging}
                  aiLoading={aiLoading}
                  mergeResult={mergeResults[`problem-${idx}`]}
                  onRequestAI={() =>
                    requestAIMerge(
                      `problem-${idx}`,
                      "problem",
                      group.items as unknown as Record<string, unknown>[],
                    )
                  }
                  onLocalMerge={() => localMergeProblem(group.items)}
                  onExecuteMerge={(primaryId, duplicateIds, data) =>
                    executeMerge(`problem-${idx}`, "problem", primaryId, duplicateIds, data)
                  }
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Sub-components ----

function TabButton({
  active,
  onClick,
  count,
  label,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs ${
            active
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    medium:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    low: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[confidence]}`}
    >
      {confidence} confidence
    </span>
  );
}

function TopicDuplicateGroup({
  group,
  groupKey,
  merging,
  aiLoading,
  mergeResult,
  onRequestAI,
  onLocalMerge,
  onExecuteMerge,
}: {
  group: DuplicateGroup<Topic>;
  groupKey: string;
  merging: string | null;
  aiLoading: string | null;
  mergeResult?: Record<string, unknown>;
  onRequestAI: () => void;
  onLocalMerge: () => Partial<Topic>;
  onExecuteMerge: (
    primaryId: string,
    duplicateIds: string[],
    data: Record<string, unknown>,
  ) => void;
}) {
  const isMerging = merging === groupKey;
  const isAILoading = aiLoading === groupKey;
  const primaryId = group.items[0].id;
  const duplicateIds = group.items.slice(1).map((t) => t.id);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ConfidenceBadge confidence={group.confidence} />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {group.reason}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Title similarity: {group.titleSimilarity}%
            {group.tagOverlap > 0 && ` · Tag overlap: ${group.tagOverlap}%`}
          </span>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {group.items.length} items
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {group.items.map((topic, idx) => (
          <div
            key={topic.id}
            className={`px-5 py-3 flex items-center justify-between ${
              idx === 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {idx === 0 && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  PRIMARY
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {topic.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {topic.category} · {topic.difficulty} · confidence {topic.confidence}/5 ·{" "}
                  {topic.status} · {topic.tags.length} tags
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 font-mono">{topic.id}</span>
          </div>
        ))}
      </div>

      {/* Merge preview (if AI result available) */}
      {mergeResult && (
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-green-50/50 dark:bg-green-950/20">
          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
            AI Merge Suggestion:
          </p>
          <pre className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(mergeResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center gap-3">
        <button
          onClick={() => {
            const merged = onLocalMerge();
            onExecuteMerge(primaryId, duplicateIds, merged as unknown as Record<string, unknown>);
          }}
          disabled={isMerging}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMerging ? "Merging…" : "Merge (Local)"}
        </button>
        <button
          onClick={onRequestAI}
          disabled={isAILoading || isMerging}
          className="rounded-md border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAILoading ? "AI Thinking…" : "🤖 AI Merge Suggestion"}
        </button>
        {mergeResult && (
          <button
            onClick={() =>
              onExecuteMerge(primaryId, duplicateIds, mergeResult)
            }
            disabled={isMerging}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply AI Suggestion
          </button>
        )}
      </div>
    </div>
  );
}

function ProblemDuplicateGroup({
  group,
  groupKey,
  merging,
  aiLoading,
  mergeResult,
  onRequestAI,
  onLocalMerge,
  onExecuteMerge,
}: {
  group: DuplicateGroup<Problem>;
  groupKey: string;
  merging: string | null;
  aiLoading: string | null;
  mergeResult?: Record<string, unknown>;
  onRequestAI: () => void;
  onLocalMerge: () => Partial<Problem>;
  onExecuteMerge: (
    primaryId: string,
    duplicateIds: string[],
    data: Record<string, unknown>,
  ) => void;
}) {
  const isMerging = merging === groupKey;
  const isAILoading = aiLoading === groupKey;
  const primaryId = group.items[0].id;
  const duplicateIds = group.items.slice(1).map((p) => p.id);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ConfidenceBadge confidence={group.confidence} />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {group.reason}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Title similarity: {group.titleSimilarity}%
            {group.tagOverlap > 0 && ` · Pattern overlap: ${group.tagOverlap}%`}
          </span>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {group.items.length} items
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {group.items.map((problem, idx) => (
          <div
            key={problem.id}
            className={`px-5 py-3 flex items-center justify-between ${
              idx === 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {idx === 0 && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  PRIMARY
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {problem.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {problem.difficulty} · {problem.status} ·{" "}
                  {problem.patterns.join(", ") || "no patterns"} ·{" "}
                  {problem.companies.length} companies
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-400 font-mono">{problem.id}</span>
          </div>
        ))}
      </div>

      {/* Merge preview (if AI result available) */}
      {mergeResult && (
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-green-50/50 dark:bg-green-950/20">
          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
            AI Merge Suggestion:
          </p>
          <pre className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(mergeResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center gap-3">
        <button
          onClick={() => {
            const merged = onLocalMerge();
            onExecuteMerge(primaryId, duplicateIds, merged as unknown as Record<string, unknown>);
          }}
          disabled={isMerging}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMerging ? "Merging…" : "Merge (Local)"}
        </button>
        <button
          onClick={onRequestAI}
          disabled={isAILoading || isMerging}
          className="rounded-md border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAILoading ? "AI Thinking…" : "🤖 AI Merge Suggestion"}
        </button>
        {mergeResult && (
          <button
            onClick={() =>
              onExecuteMerge(primaryId, duplicateIds, mergeResult)
            }
            disabled={isMerging}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply AI Suggestion
          </button>
        )}
      </div>
    </div>
  );
}
