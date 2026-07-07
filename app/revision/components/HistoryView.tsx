"use client";

import type { CategorizedItem } from "../lib/types";

interface HistoryViewProps {
  categorizedItems: CategorizedItem[];
}

export function HistoryView({ categorizedItems }: HistoryViewProps) {
  const itemsWithHistory = categorizedItems.filter(
    (ci) => ci.item.history.length > 0,
  );

  if (itemsWithHistory.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          No revision history yet.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Complete some review sessions to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {itemsWithHistory.map((ci) => (
        <div
          key={`${ci.item.itemType}-${ci.item.itemId}`}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {ci.item.itemId}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {ci.item.itemType} · Current confidence: {ci.item.confidence}/5
              </p>
            </div>
            <span className="text-xs text-zinc-400">
              Next: {ci.item.nextReview.split("T")[0]}
            </span>
          </div>

          {/* Confidence trend */}
          <div className="mb-3">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Confidence Trend
            </p>
            <div className="flex items-end gap-1 h-10">
              {ci.item.history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex-1 rounded-t bg-blue-500 dark:bg-blue-400 transition-all"
                  style={{ height: `${(entry.confidence / 5) * 100}%` }}
                  title={`${entry.date.split("T")[0]}: ${entry.confidence}/5`}
                />
              ))}
            </div>
          </div>

          {/* History entries */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Past Reviews ({ci.item.history.length})
            </p>
            <ul className="space-y-1">
              {ci.item.history
                .slice()
                .reverse()
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {entry.date.split("T")[0]}
                    </span>
                    <span
                      className={`font-medium ${
                        entry.confidence >= 4
                          ? "text-green-600 dark:text-green-400"
                          : entry.confidence === 3
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {entry.confidence}/5
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
