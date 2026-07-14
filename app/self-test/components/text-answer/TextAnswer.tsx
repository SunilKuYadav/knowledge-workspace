"use client";

import { useState } from "react";

interface TextAnswerProps {
  onSubmit: (answer: string) => void;
  isEvaluating: boolean;
  placeholder?: string;
}

export function TextAnswer({
  onSubmit,
  isEvaluating,
  placeholder = "Type your answer here...",
}: TextAnswerProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (!answer.trim()) return;
    onSubmit(answer);
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={placeholder}
        disabled={isEvaluating}
        rows={6}
        className="w-full px-4 py-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Your answer"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {answer.length > 0
            ? `${answer.length} character${answer.length !== 1 ? "s" : ""}`
            : ""}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!answer.trim() || isEvaluating}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEvaluating ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
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
              Evaluating...
            </span>
          ) : (
            "Submit Answer"
          )}
        </button>
      </div>
    </div>
  );
}
