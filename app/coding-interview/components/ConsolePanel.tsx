'use client';

import type { ExecutionResult } from '../lib/types';

interface ConsolePanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}

/**
 * Displays execution output including console logs, errors, timing, and memory usage.
 */
export function ConsolePanel({ result, isExecuting }: ConsolePanelProps) {
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
          <span>Running...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Run your code to see output
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      {/* Error display */}
      {result.error && <ErrorDisplay error={result.error} />}

      {/* Console output */}
      {result.consoleOutput && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Console Output
          </h4>
          <pre className="text-sm font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">
            {result.consoleOutput}
          </pre>
          {result.consoleOutput.includes('[output truncated') && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Output was truncated at 10,000 characters
            </p>
          )}
        </div>
      )}

      {/* Execution metrics */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          ⏱ {result.executionTimeMs < 1
            ? '<1ms'
            : `${result.executionTimeMs.toFixed(1)}ms`}
        </span>
        <span>💾 {result.memoryUsageMb.toFixed(1)} MB</span>
      </div>
    </div>
  );
}

function ErrorDisplay({ error }: { error: NonNullable<ExecutionResult['error']> }) {
  if (error.type === 'timeout') {
    return (
      <div className="rounded p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Execution timed out
        </p>
        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  if (error.type === 'syntax') {
    return (
      <div className="rounded p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Syntax Error{error.line != null ? ` at line ${error.line}` : ''}:{' '}
          {error.message}
        </p>
      </div>
    );
  }

  // Runtime error
  return (
    <div className="rounded p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        Runtime Error: {error.message}
      </p>
      {error.stack && (
        <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-500 whitespace-pre-wrap break-words">
          {error.stack}
        </pre>
      )}
    </div>
  );
}
