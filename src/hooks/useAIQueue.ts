"use client";

/**
 * Hook for making queued AI requests.
 *
 * Wraps fetch calls to AI endpoints through the queue store,
 * ensuring only one request processes at a time.
 * Provides abort capability for the active request.
 */

import { useCallback, useRef } from "react";
import { useAIQueueStore } from "@/src/stores/aiQueueStore";

export interface QueuedAIRequestOptions {
  /** Human-readable label for the queue UI */
  label: string;
  /** Route key for model resolution (e.g., "ai/generate-artifact") */
  routeKey: string;
  /** Model tier hint (optional, for display) */
  modelTier?: string;
  /** The URL to fetch */
  url: string;
  /** Fetch options (method, body, headers) */
  fetchOptions?: RequestInit;
  /** Called with the Response when the request completes */
  onResponse?: (response: Response) => void | Promise<void>;
  /** Called with streamed text chunks (for streaming endpoints) */
  onChunk?: (chunk: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Called when request completes (success or fail) */
  onDone?: () => void;
  /** Whether to stream the response (default: false) */
  stream?: boolean;
}

/**
 * Processes a single request from the queue.
 * This runs when the store's processNext picks up a pending request.
 */
async function executeRequest(
  options: QueuedAIRequestOptions,
  abortSignal: AbortSignal,
): Promise<void> {
  const { url, fetchOptions = {}, onResponse, onChunk, onError, onDone, stream } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`AI request failed (${response.status}): ${errorBody}`);
    }

    if (stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortSignal.aborted) break;

        const text = decoder.decode(value, { stream: true });
        onChunk?.(text);
      }
    } else {
      onResponse?.(response);
    }
  } catch (err) {
    if (abortSignal.aborted) {
      // Request was cancelled — don't report as error
      return;
    }
    const message = err instanceof Error ? err.message : "AI request failed";
    onError?.(message);
    throw err;
  } finally {
    onDone?.();
  }
}

/**
 * Hook providing a queued AI request function.
 *
 * Usage:
 * ```tsx
 * const { enqueueAIRequest, cancelRequest } = useAIQueue();
 *
 * const id = enqueueAIRequest({
 *   label: "Generate notes for Binary Trees",
 *   routeKey: "ai/generate-artifact",
 *   url: "/api/ai/generate-artifact",
 *   fetchOptions: { method: "POST", body: JSON.stringify(payload) },
 *   stream: true,
 *   onChunk: (text) => setContent(prev => prev + text),
 *   onError: (err) => setError(err),
 * });
 * ```
 */
export function useAIQueue() {
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const enqueue = useAIQueueStore((s) => s.enqueue);
  const completeActive = useAIQueueStore((s) => s.completeActive);
  const failActive = useAIQueueStore((s) => s.failActive);
  const cancel = useAIQueueStore((s) => s.cancel);

  const enqueueAIRequest = useCallback(
    (options: QueuedAIRequestOptions): string => {
      const id = enqueue(options.label, options.routeKey, options.modelTier);

      // Set up a watcher that starts execution when this request becomes active
      const unsubscribe = useAIQueueStore.subscribe(
        (state) => state.activeRequestId,
        async (activeId) => {
          if (activeId !== id) return;

          // This request is now active — execute it
          unsubscribe();

          const controller = new AbortController();
          abortControllers.current.set(id, controller);

          try {
            await executeRequest(options, controller.signal);
            // Check if cancelled during execution
            const currentState = useAIQueueStore.getState();
            const req = currentState.requests.find((r) => r.id === id);
            if (req?.status === "cancelled") return;
            completeActive();
          } catch (err) {
            const currentState = useAIQueueStore.getState();
            const req = currentState.requests.find((r) => r.id === id);
            if (req?.status === "cancelled") return;
            const message = err instanceof Error ? err.message : "Request failed";
            failActive(message);
          } finally {
            abortControllers.current.delete(id);
          }
        },
        { fireImmediately: true },
      );

      return id;
    },
    [enqueue, completeActive, failActive],
  );

  const cancelRequest = useCallback(
    (id: string) => {
      const controller = abortControllers.current.get(id);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(id);
      }
      cancel(id);
    },
    [cancel],
  );

  const cancelAll = useCallback(() => {
    // Abort all active controllers
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();

    const store = useAIQueueStore.getState();
    store.cancelAllPending();
    if (store.activeRequestId) {
      store.cancel(store.activeRequestId);
    }
  }, []);

  return {
    enqueueAIRequest,
    cancelRequest,
    cancelAll,
  };
}
