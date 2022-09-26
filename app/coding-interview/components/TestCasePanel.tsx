'use client';

import type { TestCaseResult } from '../lib/types';
import { EXECUTION_TIMEOUT } from '../lib/constants';

interface TestCasePanelProps {
  results: TestCaseResult[];
  isExecuting: boolean;
}

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
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
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

function TestCaseItem({
  testCase,
  index,
}: {
  testCase: TestCaseResult;
  index: number;
}) {
  const isTimedOut = testCase.executionTimeMs >= EXECUTION_TIMEOUT;

  return (
    <div
      className={`rounded border p-3 ${
        testCase.passed
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Case {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {isTimedOut && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Timed out
            </span>
          )}
          {testCase.passed ? (
            <span className="text-green-600 dark:text-green-400" aria-label="Passed">
              ✓
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400" aria-label="Failed">
              ✗
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs font-mono">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Input: </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            {formatValue(testCase.input)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Expected: </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            {formatValue(testCase.expectedOutput)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Actual: </span>
          <span
            className={
              testCase.passed
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }
          >
            {isTimedOut ? '—' : formatValue(testCase.actualOutput)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
