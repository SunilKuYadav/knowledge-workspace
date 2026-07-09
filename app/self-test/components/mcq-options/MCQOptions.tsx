"use client";

import type { MCQQuestion } from "../../lib/types";

interface MCQOptionsProps {
  question: MCQQuestion;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  showResult: boolean; // true after evaluation
  isCorrect: boolean | null;
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export function MCQOptions({
  question,
  selectedIndex,
  onSelect,
  showResult,
  isCorrect,
}: MCQOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Option cards */}
      <div className="flex flex-col gap-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === question.correctIndex;

          let borderStyle =
            "border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600";
          let bgStyle = "bg-white dark:bg-zinc-800/50";

          if (showResult) {
            if (isCorrectOption) {
              borderStyle = "border-green-400 dark:border-green-600";
              bgStyle = "bg-green-50 dark:bg-green-900/20";
            } else if (isSelected && !isCorrect) {
              borderStyle = "border-red-400 dark:border-red-600";
              bgStyle = "bg-red-50 dark:bg-red-900/20";
            }
          } else if (isSelected) {
            borderStyle = "border-blue-400 dark:border-blue-500";
            bgStyle = "bg-blue-50 dark:bg-blue-900/20";
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => !showResult && onSelect(index)}
              disabled={showResult}
              className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors ${borderStyle} ${bgStyle} ${
                showResult ? "cursor-default" : "cursor-pointer"
              }`}
              aria-pressed={isSelected}
              aria-label={`Option ${OPTION_LABELS[index]}: ${option}`}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                  showResult && isCorrectOption
                    ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                    : showResult && isSelected && !isCorrect
                      ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                      : isSelected
                        ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {OPTION_LABELS[index]}
              </span>
              <span className="text-sm text-zinc-800 dark:text-zinc-200 pt-0.5">
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requirement 6.2: MCQ evaluation display — show explanations after submission */}
      {showResult && (
        <div className="mt-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          {isCorrect ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                ✓ Correct
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 dark:text-red-400 font-medium text-sm">
                ✗ Incorrect
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                — The correct answer is{" "}
                {OPTION_LABELS[question.correctIndex]}
              </span>
            </div>
          )}

          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
            {question.explanation}
          </p>

          {question.distractorExplanations.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Why other options are incorrect:
              </p>
              <ul className="space-y-1.5">
                {question.distractorExplanations.map(
                  (explanation, idx) => {
                    // Map distractor index to the actual option index (skip the correct one)
                    const optionIndex =
                      idx < question.correctIndex ? idx : idx + 1;
                    return (
                      <li
                        key={idx}
                        className="text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="font-medium">
                          {OPTION_LABELS[optionIndex]}:
                        </span>{" "}
                        {explanation}
                      </li>
                    );
                  }
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
