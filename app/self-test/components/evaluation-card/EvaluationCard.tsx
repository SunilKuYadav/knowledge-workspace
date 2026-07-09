"use client";

import type { QuestionEvaluation, AssessmentQuestion } from "../../lib/types";

interface EvaluationCardProps {
  evaluation: QuestionEvaluation;
  question: AssessmentQuestion;
  userAnswer: string;
  onNext: () => void;
  isLastInPhase: boolean;
}

function getScoreColor(score: number) {
  if (score >= 8)
    return {
      text: "text-green-500",
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800",
    };
  if (score >= 5)
    return {
      text: "text-yellow-500",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      border: "border-yellow-200 dark:border-yellow-800",
    };
  return {
    text: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
  };
}

export function EvaluationCard({
  evaluation,
  question,
  userAnswer,
  onNext,
  isLastInPhase,
}: EvaluationCardProps) {
  const scoreColor = getScoreColor(evaluation.score);

  return (
    <div className="flex flex-col gap-5 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Score badge + question preview */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Question
          </p>
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {question.question}
          </p>
        </div>
        <div
          className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 ${scoreColor.bg} ${scoreColor.border}`}
        >
          <span className={`text-lg font-bold ${scoreColor.text}`}>
            {evaluation.score}
          </span>
        </div>
      </div>

      {/* User answer */}
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Your Answer
        </p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-md p-3">
          {question.type === "mcq" && "options" in question
            ? question.options[Number(userAnswer)] ?? userAnswer
            : userAnswer}
        </p>
      </div>

      {/* Feedback */}
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Feedback
        </p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {evaluation.feedback}
        </p>
      </div>

      {/* Mistakes */}
      {evaluation.mistakes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Mistakes
          </p>
          <ul className="list-disc list-inside space-y-1">
            {evaluation.mistakes.map((mistake, idx) => (
              <li
                key={idx}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Insights */}
      {evaluation.keyInsights.length > 0 && (
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
            Key Insights
          </p>
          <ul className="list-disc list-inside space-y-1">
            {evaluation.keyInsights.map((insight, idx) => (
              <li
                key={idx}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Answer (shown when score < 7 and expectedAnswer exists) */}
      {evaluation.expectedAnswer && evaluation.score < 7 && (
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Expected Answer
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-md p-3">
            {evaluation.expectedAnswer}
          </p>
        </div>
      )}

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {isLastInPhase ? "View Phase Summary" : "Continue"}
        </button>
      </div>
    </div>
  );
}
