'use client';

import type { CategorizedItem } from '../../lib/types';

interface IdlePhaseProps {
  currentItem: CategorizedItem;
  onStart: () => void;
}

export function IdlePhase({ currentItem, onStart }: IdlePhaseProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">
        Ready to start an AI-powered review for{' '}
        <strong>{currentItem.item.itemId}</strong>?
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">
        The AI will generate questions based on your confidence level (
        {currentItem.item.confidence}/5).
        {currentItem.item.confidence <= 2 && ' Expect fundamental recall questions.'}
        {currentItem.item.confidence === 3 &&
          ' Expect a mix of recall and application questions.'}
        {currentItem.item.confidence >= 4 &&
          ' Expect advanced application and edge-case questions.'}
      </p>
      <button
        onClick={onStart}
        className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Start AI Review
      </button>
    </div>
  );
}
