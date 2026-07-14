"use client";

import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { ProblemDescription } from "@/types";

export interface DescriptionTabProps {
  desc: ProblemDescription | null;
  generating: boolean;
  genError: string | null;
  descStreamContent: string;
  handleGenerateDescription: () => void;
  handleCancelDescription: () => void;
}

export function DescriptionTab({
  desc,
  generating,
  genError,
  descStreamContent,
  handleGenerateDescription,
  handleCancelDescription,
}: DescriptionTabProps) {
  if (!desc && !generating) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            No description generated yet.
          </p>
          <button
            onClick={handleGenerateDescription}
            disabled={generating}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Description & Test Cases
          </button>
          {genError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {genError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Generating description...
            </span>
          </div>
          <button
            onClick={handleCancelDescription}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Cancel
          </button>
        </div>
        {descStreamContent && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
              {descStreamContent}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <MarkdownRenderer>{desc!.description}</MarkdownRenderer>
      </div>

      {/* Constraints */}
      {desc!.constraints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Constraints
          </h3>
          <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {desc!.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Examples */}
      {desc!.examples.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Examples
          </h3>
          <div className="space-y-4">
            {desc!.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-2"
              >
                <div className="text-xs font-medium text-zinc-500">
                  Example {i + 1}
                </div>
                <div className="text-sm">
                  <span className="text-zinc-500">Input: </span>
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                    {ex.input}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-zinc-500">Output: </span>
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                    {ex.expectedOutput}
                  </code>
                </div>
                {ex.explanation && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {ex.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complexity */}
      {(desc!.timeComplexity || desc!.spaceComplexity) && (
        <div className="flex gap-4 text-sm">
          {desc!.timeComplexity && (
            <span className="text-zinc-600 dark:text-zinc-400">
              Time: <code className="font-mono">{desc!.timeComplexity}</code>
            </span>
          )}
          {desc!.spaceComplexity && (
            <span className="text-zinc-600 dark:text-zinc-400">
              Space: <code className="font-mono">{desc!.spaceComplexity}</code>
            </span>
          )}
        </div>
      )}

      {/* Regenerate button */}
      <button
        onClick={handleGenerateDescription}
        disabled={generating}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
      >
        {generating ? "Regenerating..." : "Regenerate"}
      </button>
    </div>
  );
}
