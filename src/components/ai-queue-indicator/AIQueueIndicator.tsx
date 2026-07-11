"use client";

/**
 * AI Queue Indicator — fixed bottom-left button showing AI activity status.
 *
 * - Pulsing dot when requests are processing
 * - Badge count for pending requests
 * - Click opens a modal with full queue status and controls
 */

import { useState } from "react";
import {
  useAIQueueStore,
  selectPendingCount,
  selectHasActivity,
  type AIRequest,
} from "@/src/stores/aiQueueStore";
import { AIQueueModal } from "./AIQueueModal";

export function AIQueueIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const hasActivity = useAIQueueStore(selectHasActivity);
  const pendingCount = useAIQueueStore(selectPendingCount);
  const isProcessing = useAIQueueStore((s) => s.isProcessing);

  // Derive activeRequest only when modal is open to avoid unnecessary re-renders
  const activeRequest: AIRequest | null = useAIQueueStore((s) =>
    s.activeRequestId
      ? (s.requests.find((r) => r.id === s.activeRequestId) ?? null)
      : null,
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
        aria-label={`AI Queue: ${isProcessing ? "processing" : pendingCount > 0 ? `${pendingCount} pending` : "idle"}`}
        title="AI Request Queue"
      >
        {/* Status dot */}
        <span className="relative flex h-3 w-3">
          {hasActivity ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </>
          ) : (
            <span className="relative inline-flex h-3 w-3 rounded-full bg-zinc-500" />
          )}
        </span>

        {/* Label */}
        <span className="hidden sm:inline">
          {isProcessing
            ? "AI Working"
            : pendingCount > 0
              ? `${pendingCount} queued`
              : "AI Idle"}
        </span>

        {/* Badge */}
        {pendingCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <AIQueueModal
          onClose={() => setIsOpen(false)}
          activeRequest={activeRequest}
        />
      )}
    </>
  );
}
