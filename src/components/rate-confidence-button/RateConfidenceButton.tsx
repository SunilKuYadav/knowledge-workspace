"use client";

import { useRateConfidenceButton } from "./useRateConfidenceButton";
import type { RateConfidenceButtonProps } from "./types";

export default function RateConfidenceButton({
  itemId,
  itemType,
  currentConfidence,
}: RateConfidenceButtonProps) {
  const {
    isOpen,
    setIsOpen,
    isPending,
    rated,
    newConfidence,
    handleRate,
  } = useRateConfidenceButton(currentConfidence);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        Update Confidence
      </button>
    );
  }

  if (rated) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <span>✓</span>
        <span>Updated to {newConfidence}/5</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Rate:</span>
      <div className="flex gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <button
            key={level}
            onClick={() => handleRate(level, itemId, itemType)}
            disabled={isPending}
            className={`w-8 h-8 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              level <= 2
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800"
                : level === 3
                  ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800"
                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <button
        onClick={() => setIsOpen(false)}
        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}
