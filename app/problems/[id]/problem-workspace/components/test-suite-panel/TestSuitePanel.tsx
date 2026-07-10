"use client";

import { useState } from "react";
import type { GeneratedTestSuite } from "@/types";
import type { TestCaseResult } from "@/app/coding-interview/lib/types";
import { CollapsibleSection } from "../collapsible-section";

interface TestSuitePanelProps {
  testSuite: GeneratedTestSuite | null;
  isGenerating: boolean;
  streamContent: string;
  runResults: TestCaseResult[] | null;
  isRunning: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onRunAll: () => void;
  onCancel: () => void;
}

export function TestSuitePanel({
  testSuite,
  isGenerating,
  streamContent,
  runResults,
  isRunning,
  onGenerate,
  onRegenerate,
  onDelete,
  onRunAll,
  onCancel,
}: TestSuitePanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Calculate results per category if we have run results
  const getResultsForCategory = (
    startIdx: number,
    count: number,
  ): TestCaseResult[] | null => {
    if (!runResults) return null;
    return runResults.slice(startIdx, startIdx + count);
  };

  // Generating state — show stream content
  if (isGenerating) {
    return (
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
              Generating comprehensive test suite...
            </span>
          </div>
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Cancel
          </button>
        </div>
        {streamContent && (
          <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
            {streamContent.slice(-2000)}
          </pre>
        )}
      </div>
    );
  }

  // No test suite generated yet
  if (!testSuite) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 text-center">
        <div className="mb-3">
          <span className="text-2xl">🧪</span>
        </div>
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Generate Test Suite
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm mx-auto">
          AI will generate 15-30 comprehensive test cases covering basic scenarios,
          edge cases, large inputs, and corner cases for this problem.
        </p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          🧪 Generate Test Cases
        </button>
      </div>
    );
  }

  // Test suite exists — show results
  const totalPassed = runResults
    ? runResults.filter((r) => r.passed).length
    : null;
  const totalTests = testSuite.totalCount;

  let runIdx = 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Test Suite
          </h4>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {totalTests} tests
          </span>
          {totalPassed !== null && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                totalPassed === totalTests
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {totalPassed}/{totalTests} passed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRunAll}
            disabled={isRunning}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? "Running..." : "▶ Run All"}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-50 transition-colors"
          >
            ↻ Regenerate
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            ✕ Delete
          </button>
        </div>
      </div>

      {/* Generated timestamp */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Generated {new Date(testSuite.generatedAt).toLocaleString()}
      </p>

      {/* Categories */}
      <div className="space-y-2">
        {testSuite.categories.map((category) => {
          const catStartIdx = runIdx;
          const catCount = category.testCases.length;
          runIdx += catCount;

          const catResults = getResultsForCategory(catStartIdx, catCount);
          const catPassed = catResults
            ? catResults.filter((r) => r.passed).length
            : null;
          const isExpanded = expandedCategories.has(category.name);

          return (
            <div
              key={category.name}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {category.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({catCount})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {catPassed !== null && (
                    <span
                      className={`text-xs font-medium ${
                        catPassed === catCount
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {catPassed}/{catCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Category description + test cases */}
              {isExpanded && (
                <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
                  {category.description && (
                    <p className="px-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
                      {category.description}
                    </p>
                  )}
                  <div className="p-3 space-y-2">
                    {category.testCases.map((tc, tcIdx) => {
                      const result = catResults?.[tcIdx];
                      return (
                        <TestCaseRow
                          key={tcIdx}
                          index={catStartIdx + tcIdx + 1}
                          input={tc.input}
                          expectedOutput={tc.expectedOutput}
                          explanation={tc.explanation}
                          result={result}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestCaseRow({
  index,
  input,
  expectedOutput,
  explanation,
  result,
}: {
  index: number;
  input: string;
  expectedOutput: string;
  explanation?: string;
  result?: TestCaseResult;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = !result ? (
    <span className="text-zinc-400">○</span>
  ) : result.passed ? (
    <span className="text-green-500">✓</span>
  ) : (
    <span className="text-red-500">✗</span>
  );

  return (
    <div
      className={`rounded border p-2 text-xs ${
        !result
          ? "border-zinc-100 dark:border-zinc-700/50"
          : result.passed
            ? "border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/10"
            : "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className="shrink-0 w-4 text-center">{statusIcon}</span>
        <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
          #{index}
        </span>
        <span className="truncate text-zinc-700 dark:text-zinc-300 flex-1 font-mono">
          {input}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500 shrink-0">→</span>
        <span className="truncate text-zinc-600 dark:text-zinc-400 font-mono max-w-[120px]">
          {expectedOutput}
        </span>
        {result && !result.passed && (
          <span className="text-red-500 dark:text-red-400 font-mono truncate max-w-[120px] shrink-0">
            got: {JSON.stringify(result.actualOutput)}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pl-6 space-y-1 border-t border-zinc-100 dark:border-zinc-700/50 pt-2">
          <div>
            <span className="text-zinc-500">Input: </span>
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
              {input}
            </code>
          </div>
          <div>
            <span className="text-zinc-500">Expected: </span>
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
              {expectedOutput}
            </code>
          </div>
          {result && !result.passed && (
            <div>
              <span className="text-red-500">Actual: </span>
              <code className="bg-red-50 dark:bg-red-900/20 px-1 py-0.5 rounded text-red-700 dark:text-red-400">
                {JSON.stringify(result.actualOutput)}
              </code>
            </div>
          )}
          {explanation && (
            <p className="text-zinc-400 dark:text-zinc-500 italic">
              {explanation}
            </p>
          )}
          {result && (
            <p className="text-zinc-400">
              Execution: {result.executionTimeMs}ms
            </p>
          )}
        </div>
      )}
    </div>
  );
}
