"use client";

import type { TestCaseResult } from "../../../lib/types";
import { EXECUTION_TIMEOUT } from "../../../lib/constants";

interface TestCaseItemProps {
  testCase: TestCaseResult;
  index: number;
}

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function TestCaseItem({ testCase, index }: TestCaseItemProps) {
  const isTimedOut = testCase.executionTimeMs >= EXECUTION_TIMEOUT;

  return (
    <div
      className={`rounded border p-3 ${
        testCase.passed
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
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
            <span
              className="text-green-600 dark:text-green-400"
              aria-label="Passed"
            >
              ✓
            </span>
          ) : (
            <span
              className="text-red-600 dark:text-red-400"
              aria-label="Failed"
            >
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
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }
          >
            {isTimedOut ? "—" : formatValue(testCase.actualOutput)}
          </span>
        </div>
      </div>
    </div>
  );
}
