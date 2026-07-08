"use client";

import type { TestCasePanelProps } from "./types";
import { TestCaseItem } from "./components/TestCaseItem";

/**
 * Displays test case results with input, expected output, actual output, and pass/fail status.
 */
export function TestCasePanel({ results, isExecuting }: TestCasePanelProps) {
  if (isExecuting) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          <span>Running test cases...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Run your code to see test results
        </p>
      </div>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Test Cases
        </h4>
        <span
          className={`text-sm font-medium ${
            passedCount === results.length
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {passedCount}/{results.length} passed
        </span>
      </div>

      {/* Individual test cases */}
      <div className="space-y-2">
        {results.map((testCase, index) => (
          <TestCaseItem key={index} testCase={testCase} index={index} />
        ))}
      </div>
    </div>
  );
}
