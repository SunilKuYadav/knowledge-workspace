"use client";

import { useState } from "react";
import type { HintPanelProps } from "./types";
import { LEVEL_LABELS } from "./constants";
import { useHintPanel } from "./useHintPanel";

function CollapsibleHint({
  level,
  content,
}: {
  level: number;
  content: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-lg border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        aria-expanded={isOpen}
      >
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Level {level} — {LEVEL_LABELS[level]}
        </p>
        <svg
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

export function HintPanel({
  onRequestHint,
  onShowSolution,
  isLoading = false,
}: HintPanelProps) {
  const { hintsUsed, hints, allHintsConsumed, nextLevel } = useHintPanel();

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
      {/* Level indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Hint Level {hintsUsed}/4
        </h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-2 h-2 rounded-full ${
                level <= hintsUsed
                  ? "bg-blue-500 dark:bg-blue-400"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Request hint button */}
      <button
        onClick={() => onRequestHint(nextLevel)}
        disabled={allHintsConsumed || isLoading}
        className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
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
            <span>Generating hint...</span>
          </>
        ) : allHintsConsumed ? (
          "All hints used"
        ) : (
          `Request Hint ${nextLevel} — ${LEVEL_LABELS[nextLevel]}`
        )}
      </button>

      {/* Consumed hints displayed chronologically — each collapsible */}
      {hints.length > 0 && (
        <div className="space-y-3">
          {hints.map((hint, i) => (
            <CollapsibleHint key={i} level={i + 1} content={hint} />
          ))}
        </div>
      )}

      {/* Show Solution — visible only after all 4 hints consumed */}
      {allHintsConsumed && onShowSolution && (
        <button
          onClick={onShowSolution}
          className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800"
        >
          Show Solution
        </button>
      )}
    </div>
  );
}
