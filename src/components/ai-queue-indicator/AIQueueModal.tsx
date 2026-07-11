"use client";

/**
 * AI Queue Modal — shows full status of AI resource usage.
 *
 * Displays:
 * - Currently active request
 * - Pending queue
 * - Request history (completed/failed/cancelled)
 * - Controls: cancel, clear history, toggle persistence
 */

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useAIQueueStore,
  type AIRequest,
} from "@/src/stores/aiQueueStore";

interface AIQueueModalProps {
  onClose: () => void;
  activeRequest: AIRequest | null;
}

export function AIQueueModal({ onClose, activeRequest }: AIQueueModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const liveRequests = useAIQueueStore(
    useShallow((s) => s.requests.filter((r) => r.status === "pending" || r.status === "processing")),
  );
  const historyRequests = useAIQueueStore(
    useShallow((s) => s.requests.filter((r) => r.status === "completed" || r.status === "failed" || r.status === "cancelled")),
  );
  const currentModel = useAIQueueStore((s) => s.currentModel);
  const persistEnabled = useAIQueueStore((s) => s.persistEnabled);
  const cancelRequest = useAIQueueStore((s) => s.cancel);
  const cancelAllPending = useAIQueueStore((s) => s.cancelAllPending);
  const clearHistory = useAIQueueStore((s) => s.clearHistory);
  const clearAll = useAIQueueStore((s) => s.clearAll);
  const togglePersistence = useAIQueueStore((s) => s.togglePersistence);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI Request Queue Status"
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">AI Request Queue</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Model */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="font-medium text-zinc-300">Model:</span>
            <span className="font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded">
              {currentModel ?? "None loaded"}
            </span>
          </div>

          {/* Active Request */}
          {activeRequest && (
            <section>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Currently Processing</h3>
              <RequestCard request={activeRequest} onCancel={() => cancelRequest(activeRequest.id)} />
            </section>
          )}

          {/* Pending Queue */}
          {liveRequests.filter((r) => r.status === "pending").length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-300">
                  Pending ({liveRequests.filter((r) => r.status === "pending").length})
                </h3>
                <button
                  onClick={cancelAllPending}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel all
                </button>
              </div>
              <div className="space-y-2">
                {liveRequests
                  .filter((r) => r.status === "pending")
                  .map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onCancel={() => cancelRequest(req.id)}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* No activity */}
          {!activeRequest && liveRequests.length === 0 && historyRequests.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm">No AI requests in queue</p>
              <p className="text-xs mt-1">Requests will appear here when AI features are used</p>
            </div>
          )}

          {/* History */}
          {historyRequests.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-300">
                  History ({historyRequests.length})
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {historyRequests
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((req) => (
                    <RequestCard key={req.id} request={req} />
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-700">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={persistEnabled}
              onChange={togglePersistence}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            Persist queue
          </label>

          <button
            onClick={clearAll}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Request Card Component ─────────────────────────────── */

function RequestCard({
  request,
  onCancel,
}: {
  request: AIRequest;
  onCancel?: () => void;
}) {
  const statusColor = {
    pending: "bg-yellow-500",
    processing: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    cancelled: "bg-zinc-500",
  }[request.status];

  const statusLabel = {
    pending: "Queued",
    processing: "Processing",
    completed: "Done",
    failed: "Failed",
    cancelled: "Cancelled",
  }[request.status];

  const elapsed =
    request.startedAt && !request.completedAt
      ? Math.round((Date.now() - request.startedAt) / 1000)
      : request.startedAt && request.completedAt
        ? Math.round((request.completedAt - request.startedAt) / 1000)
        : null;

  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
      {/* Status dot */}
      <span className="mt-1 flex h-2.5 w-2.5 shrink-0">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColor} ${
            request.status === "processing" ? "animate-pulse" : ""
          }`}
        />
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{request.label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-500">{statusLabel}</span>
          {request.model && (
            <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
              {request.model}
            </span>
          )}
          {request.routeKey && !request.model && (
            <span className="text-xs text-zinc-600 font-mono">{request.routeKey}</span>
          )}
          {elapsed !== null && (
            <span className="text-xs text-zinc-500">{elapsed}s</span>
          )}
        </div>
        {request.error && (
          <p className="text-xs text-red-400 mt-1 truncate">{request.error}</p>
        )}
        {request.tokenUsage && (
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span title="Input tokens">↑ {request.tokenUsage.promptTokens.toLocaleString()}</span>
            <span title="Output tokens">↓ {request.tokenUsage.completionTokens.toLocaleString()}</span>
            <span title="Total tokens">Σ {request.tokenUsage.totalTokens.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {onCancel && (request.status === "pending" || request.status === "processing") && (
        <button
          onClick={onCancel}
          className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
          aria-label={`Cancel request: ${request.label}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
