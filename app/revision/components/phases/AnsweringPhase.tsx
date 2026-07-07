"use client";

import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { ReviewQuestion } from "../../lib/types";

interface AnsweringPhaseProps {
  question: ReviewQuestion;
  userResponse: string;
  onResponseChange: (value: string) => void;
  onSubmit: () => void;
  onRequestHint: () => void;
  hintLoading: boolean;
  hint: string;
}

export function AnsweringPhase({
  question,
  userResponse,
  onResponseChange,
  onSubmit,
  onRequestHint,
  hintLoading,
  hint,
}: AnsweringPhaseProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {/* Question type badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              question.type === "code"
                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                : question.type === "debug"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                  : question.type === "edge-case"
                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                    : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            }`}
          >
            {question.type}
          </span>
          <span className="text-xs text-zinc-400">{question.difficulty}</span>
        </div>

        {/* Question */}
        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none mb-6">
          <MarkdownRenderer>{question.question}</MarkdownRenderer>
        </div>

        {/* Response input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Your Answer:
          </label>
          <textarea
            value={userResponse}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder={
              question.type === "code"
                ? "Write your code or pseudocode here..."
                : "Type your answer here..."
            }
            rows={question.type === "code" ? 10 : 5}
            className={`w-full px-4 py-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
              question.type === "code" ? "font-mono text-sm" : "text-sm"
            }`}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onSubmit}
            disabled={!userResponse.trim()}
            className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
          <button
            onClick={onRequestHint}
            disabled={hintLoading}
            className="px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {hintLoading ? "Loading..." : "💡 Need a Hint"}
          </button>
        </div>
      </div>

      {/* Hint section */}
      {hint && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-2">
            Hint
          </p>
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
            <MarkdownRenderer>{hint}</MarkdownRenderer>
          </div>
        </div>
      )}
    </div>
  );
}
