"use client";

import { useState, useEffect, useTransition } from "react";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import {
  getStructuredSolutions,
  updateStructuredSolution,
  deleteStructuredSolution,
} from "@/app/problems/[id]/actions";
import type { SolutionEntry } from "@/src/filesystem/FileProblemRepository";

export interface SolutionTabProps {
  problemId: string;
  solution: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  handleOverwriteSolution: (content: string) => Promise<void>;
  /** Called when user wants to navigate to practice a specific variation */
  onPracticeVariation?: (variationId: string, variationTitle: string, difficulty: "easy" | "medium" | "hard") => void;
}

export function SolutionTab({
  problemId,
  solution,
  onPracticeVariation,
}: SolutionTabProps) {
  const [solutions, setSolutions] = useState<SolutionEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evalExpandedId, setEvalExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>("all");

  // Load structured solutions on mount and when solution changes
  useEffect(() => {
    startTransition(async () => {
      const entries = await getStructuredSolutions(problemId);
      setSolutions(entries);
      if (entries.length > 0) {
        setExpandedId(entries[entries.length - 1].id);
      }
    });
  }, [problemId, solution]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleToggleEval = (id: string) => {
    setEvalExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStartEdit = (entry: SolutionEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.code);
  };

  const handleSaveEdit = (solutionId: string) => {
    startTransition(async () => {
      const result = await updateStructuredSolution(problemId, solutionId, {
        code: editContent,
      });
      if (result.success) {
        setSolutions((prev) =>
          prev.map((s) => (s.id === solutionId ? { ...s, code: editContent } : s)),
        );
        setEditingId(null);
      }
    });
  };

  const handleDelete = (solutionId: string) => {
    startTransition(async () => {
      const result = await deleteStructuredSolution(problemId, solutionId);
      if (result.success) {
        setSolutions((prev) => prev.filter((s) => s.id !== solutionId));
        setDeleteConfirmId(null);
      }
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined) return "text-zinc-500";
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score?: number) => {
    if (score === undefined) return "bg-zinc-100 dark:bg-zinc-800";
    if (score >= 90) return "bg-green-50 dark:bg-green-900/20";
    if (score >= 70) return "bg-blue-50 dark:bg-blue-900/20";
    if (score >= 50) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const hasEvaluation = (entry: SolutionEntry) =>
    !!(entry.strengths?.length || entry.improvements?.length || entry.edgeCases?.length || entry.alternativeApproaches?.length);

  if (solutions.length === 0 && !isPending) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">
            No solutions saved yet.
          </p>
          <p className="text-sm text-zinc-400">
            Go to the Practice tab, write your solution, then run AI Evaluate.
            Solutions are saved automatically on evaluation.
          </p>
        </div>
      </div>
    );
  }

  // Group solutions by main/variation
  const groups = new Map<string, { label: string; variationId?: string; variationTitle?: string; difficulty?: string; solutions: typeof solutions }>();
  groups.set("main", { label: "Original Problem", solutions: [] });

  for (const entry of solutions) {
    if (entry.variationId) {
      if (!groups.has(entry.variationId)) {
        groups.set(entry.variationId, {
          label: entry.variationTitle || "Variation",
          variationId: entry.variationId,
          variationTitle: entry.variationTitle,
          solutions: [],
        });
      }
      groups.get(entry.variationId)!.solutions.push(entry);
    } else {
      groups.get("main")!.solutions.push(entry);
    }
  }

  // Filter
  const filteredSolutions = filterGroup === "all"
    ? solutions
    : filterGroup === "main"
      ? solutions.filter((s) => !s.variationId)
      : solutions.filter((s) => s.variationId === filterGroup);

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Saved Solutions ({solutions.length})
        </h3>

        {/* Filter by problem/variation */}
        {groups.size > 1 && (
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">All Solutions ({solutions.length})</option>
            <option value="main">Original Problem ({groups.get("main")?.solutions.length || 0})</option>
            {Array.from(groups.entries())
              .filter(([key]) => key !== "main")
              .map(([key, group]) => (
                <option key={key} value={key}>
                  🔀 {group.label} ({group.solutions.length})
                </option>
              ))}
          </select>
        )}
      </div>

      {filteredSolutions
        .slice()
        .reverse()
        .map((entry, idx) => {
          const isExpanded = expandedId === entry.id;
          const isEvalExpanded = evalExpandedId === entry.id;
          const isEditing = editingId === entry.id;
          const isDeleting = deleteConfirmId === entry.id;
          const solutionNumber = filteredSolutions.length - idx;

          return (
            <div
              key={entry.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Collapsible header */}
              <button
                onClick={() => handleToggle(entry.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>

                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    #{solutionNumber}
                  </span>

                  {entry.score !== undefined && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBg(entry.score)} ${getScoreColor(entry.score)}`}
                    >
                      {entry.score}/100
                    </span>
                  )}

                  {entry.complexity && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                      O({entry.complexity.time}) / O({entry.complexity.space})
                    </span>
                  )}

                  {entry.variationTitle && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
                      🔀 {entry.variationTitle}
                    </span>
                  )}
                </div>

                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 ml-2">
                  {formatDate(entry.savedAt)}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-zinc-200 dark:border-zinc-700">
                  {/* Feedback summary */}
                  {entry.feedback && (
                    <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-700/50">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                        {entry.feedback}
                      </p>
                    </div>
                  )}

                  {/* Code content or editor */}
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full min-h-[250px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm font-mono text-zinc-800 dark:text-zinc-200 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          spellCheck={false}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                        <MarkdownRenderer>{`\`\`\`typescript\n${entry.code}\n\`\`\``}</MarkdownRenderer>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Evaluation Details */}
                  {hasEvaluation(entry) && (
                    <div className="border-t border-zinc-100 dark:border-zinc-700/50">
                      <button
                        onClick={() => handleToggleEval(entry.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${isEvalExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          📊 Evaluation Details
                        </span>
                      </button>

                      {isEvalExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Strengths */}
                          {entry.strengths && entry.strengths.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                                ✓ Strengths
                              </h4>
                              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                                {entry.strengths.map((s, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-green-500 shrink-0">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Improvements */}
                          {entry.improvements && entry.improvements.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">
                                ↑ Improvements
                              </h4>
                              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                                {entry.improvements.map((s, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-amber-500 shrink-0">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Edge Cases */}
                          {entry.edgeCases && entry.edgeCases.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">
                                Edge Cases
                              </h4>
                              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                                {entry.edgeCases.map((s, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-blue-500 shrink-0">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Alternative Approaches */}
                          {entry.alternativeApproaches && entry.alternativeApproaches.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-1">
                                Alternative Approaches
                              </h4>
                              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                                {entry.alternativeApproaches.map((s, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <span className="text-indigo-500 shrink-0">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action bar */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-zinc-100 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <button
                        onClick={() => handleStartEdit(entry)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(entry.code);
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        📋 Copy
                      </button>
                      {entry.variationId && entry.variationTitle && onPracticeVariation && (
                        <button
                          onClick={() => onPracticeVariation(entry.variationId!, entry.variationTitle!, "medium")}
                          className="px-2.5 py-1 text-xs font-medium rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          🔀 Practice
                        </button>
                      )}
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={isPending}
                            className="px-2 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(entry.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
