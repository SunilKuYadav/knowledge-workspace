"use client";

import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { EvaluationResult } from "../../lib/types";

interface FeedbackPhaseProps {
  evaluation: EvaluationResult;
  isLastQuestion: boolean;
  onNext: () => void;
}

export function FeedbackPhase({
  evaluation,
  isLastQuestion,
  onNext,
}: FeedbackPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Evaluation
          </h3>
          <div
            className={`text-2xl font-bold ${
              evaluation.score >= 4
                ? "text-green-600 dark:text-green-400"
                : evaluation.score === 3
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {evaluation.score}/5
          </div>
        </div>

        {/* Feedback */}
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
          {evaluation.feedback}
        </p>

        {/* Mistakes */}
        {evaluation.mistakes.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
              ❌ Mistakes / Gaps
            </h4>
            <ul className="space-y-1 pl-4">
              {evaluation.mistakes.map((m, i) => (
                <li
                  key={i}
                  className="text-sm text-zinc-600 dark:text-zinc-400 list-disc"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Insights */}
        {evaluation.keyInsights.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
              💡 Key Insights
            </h4>
            <ul className="space-y-1 pl-4">
              {evaluation.keyInsights.map((ins, i) => (
                <li
                  key={i}
                  className="text-sm text-zinc-600 dark:text-zinc-400 list-disc"
                >
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Correct Answer */}
        {evaluation.correctAnswer && (
          <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
              ✓ Expected Answer
            </h4>
            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
              <MarkdownRenderer>{evaluation.correctAnswer}</MarkdownRenderer>
            </div>
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {isLastQuestion ? "View Summary →" : "Next Question →"}
        </button>
      </div>
    </div>
  );
}
