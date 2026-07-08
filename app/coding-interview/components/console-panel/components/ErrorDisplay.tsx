"use client";

import type { ExecutionResult } from "../../../lib/types";

interface ErrorDisplayProps {
  error: NonNullable<ExecutionResult["error"]>;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (error.type === "timeout") {
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

  if (error.type === "syntax") {
    return (
      <div className="rounded p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Syntax Error{error.line != null ? ` at line ${error.line}` : ""}:{" "}
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
