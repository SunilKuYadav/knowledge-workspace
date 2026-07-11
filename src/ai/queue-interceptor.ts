"use client";

/**
 * Client-side AI fetch interceptor.
 *
 * Monkey-patches window.fetch to automatically track ALL AI API calls
 * (any fetch to /api/ai/*) in the aiQueueStore. This means every AI call
 * from any component, hook, or module is captured automatically — no need
 * to manually wrap each call.
 *
 * Also polls the server-side queue status to reflect server-side model
 * loading and inference state.
 *
 * Call `installAIQueueInterceptor()` once at app startup (in AIProvider).
 */

import { useAIQueueStore } from "@/src/stores/aiQueueStore";

/** Track whether the interceptor has been installed */
let installed = false;

/** Polling interval for server queue status */
const SERVER_POLL_INTERVAL_MS = 120_000;
let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Extracts a human-readable label from the AI request URL and body.
 */
function extractLabel(url: string, body: Record<string, unknown> | null): string {
  // Get the route path (e.g., "/api/ai/generate-artifact" → "generate-artifact")
  const path = url.replace(/^.*\/api\/ai\//, "").replace(/\?.*$/, "");
  const routeName = path || "ai";

  // Try to get a meaningful identifier from the body
  if (body) {
    const topic = body.topic || body.topicId || body.title || "";
    const action = body.action || "";
    const artifact = body.artifact || "";

    if (action && topic) return `${action}: ${topic}`;
    if (artifact && topic) return `${artifact}: ${topic}`;
    if (action) return `${routeName}/${action}`;
    if (topic) return `${routeName}: ${topic}`;
  }

  return routeName;
}

/**
 * Extracts the route key from the URL for model resolution tracking.
 */
function extractRouteKey(url: string): string {
  const match = url.match(/\/api\/(ai\/.+?)(?:\?|$)/);
  return match ? match[1] : "ai/unknown";
}

/**
 * Install the AI queue interceptor on window.fetch.
 * Safe to call multiple times — only installs once.
 */
export function installAIQueueInterceptor(): void {
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Only intercept AI API calls (exclude status/logs/queue-status — they're infrastructure)
    const isAICall =
      url.includes("/api/ai/") &&
      !url.includes("/api/ai/status") &&
      !url.includes("/api/ai/logs") &&
      !url.includes("/api/ai/queue-status");

    if (!isAICall) {
      return originalFetch.call(this, input, init);
    }

    // Parse body for labeling (only for POST requests with JSON body)
    let body: Record<string, unknown> | null = null;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        // Not JSON — ignore
      }
    }

    const label = extractLabel(url, body);
    const routeKey = extractRouteKey(url);

    // Track in the store — add directly as "processing" since the fetch is already in-flight
    const store = useAIQueueStore.getState();
    const id = trackRequest(store, label, routeKey);

    try {
      const response = await originalFetch.call(this, input, init);

      // Mark completion based on response status
      const currentState = useAIQueueStore.getState();
      const req = currentState.requests.find((r) => r.id === id);

      if (req && req.status === "processing") {
        if (response.ok) {
          currentState.completeActive();
        } else {
          const errorText = await response
            .clone()
            .text()
            .catch(() => `HTTP ${response.status}`);
          currentState.failActive(errorText.slice(0, 200));
        }
      }

      return response;
    } catch (err) {
      const currentState = useAIQueueStore.getState();
      const req = currentState.requests.find((r) => r.id === id);
      if (req && req.status === "processing") {
        const message = err instanceof Error ? err.message : "Network error";
        currentState.failActive(message);
      }
      throw err;
    }
  };

  // Start polling server queue status
  startServerStatusPolling();
}

/**
 * Track a request directly as "processing" in the store.
 * Since the interceptor catches requests that are already in-flight,
 * we skip the pending → processing transition.
 */
function trackRequest(
  store: ReturnType<typeof useAIQueueStore.getState>,
  label: string,
  routeKey: string,
): string {
  // If there's already an active request, the new one goes as pending
  // (the server queue ensures serialization; client just reflects reality)
  const id = store.enqueue(label, routeKey);

  // Force-process to move it to "processing" state immediately
  // since the HTTP request is already in-flight
  const state = useAIQueueStore.getState();
  if (!state.isProcessing) {
    state.processNext();
  }

  return id;
}

/**
 * Poll the server-side queue status to update the client store
 * with server-side info (loaded model, token usage from completed requests).
 */
function startServerStatusPolling(): void {
  if (pollInterval) return;

  async function poll() {
    try {
      const res = await fetch("/api/ai/queue-status");
      if (res.ok) {
        const data = await res.json();
        const store = useAIQueueStore.getState();
        // Update the model tracking from server state
        if (data.currentModel !== store.currentModel) {
          store.setCurrentModel(data.currentModel);
        }
        // Update active request's model from server active item
        if (data.active && store.activeRequestId) {
          const activeReq = store.requests.find((r) => r.id === store.activeRequestId);
          if (activeReq && !activeReq.model && data.active.model) {
            useAIQueueStore.setState({
              requests: store.requests.map((r) =>
                r.id === store.activeRequestId ? { ...r, model: data.active.model } : r,
              ),
            });
          }
        }
        // Sync token usage from server history to client requests
        if (data.history && Array.isArray(data.history)) {
          syncTokenUsage(data.history);
        }
      }
    } catch {
      // Silently ignore polling failures
    }
  }

  // Initial poll
  poll();
  pollInterval = setInterval(poll, SERVER_POLL_INTERVAL_MS);
}

/**
 * Sync token usage and model name from server queue items to matching client requests.
 * Matches by route key and completion timestamp proximity.
 *
 * The client-side completedAt can lag behind the server-side completedAt significantly
 * (streaming responses take time to deliver), so we use a wide matching window and
 * also fall back to matching the most recent unmatched server item per routeKey.
 */
function syncTokenUsage(
  serverHistory: Array<{
    routeKey: string;
    model: string;
    completedAt?: number;
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }>,
): void {
  const store = useAIQueueStore.getState();
  const clientRequests = store.requests;

  // Track which server items have been matched to avoid double-matching
  const matchedServerIds = new Set<number>();

  let updated = false;
  const updatedRequests = clientRequests.map((req) => {
    // Skip if already has token usage and model, or not completed
    if ((req.tokenUsage && req.model) || req.status !== "completed") return req;

    // Find matching server item by route key and close completion time (30s window)
    let matchIdx = serverHistory.findIndex(
      (s, idx) =>
        !matchedServerIds.has(idx) &&
        s.routeKey === req.routeKey &&
        s.completedAt &&
        req.completedAt &&
        Math.abs(s.completedAt - req.completedAt) < 30_000,
    );

    // Fallback: match the most recent server item with the same routeKey that has token usage
    if (matchIdx === -1) {
      for (let i = serverHistory.length - 1; i >= 0; i--) {
        const s = serverHistory[i];
        if (
          !matchedServerIds.has(i) &&
          s.routeKey === req.routeKey &&
          s.tokenUsage &&
          s.completedAt &&
          req.createdAt &&
          s.completedAt >= req.createdAt
        ) {
          matchIdx = i;
          break;
        }
      }
    }

    if (matchIdx >= 0) {
      const match = serverHistory[matchIdx];
      matchedServerIds.add(matchIdx);
      const updates: Partial<typeof req> = {};
      if (match.tokenUsage && !req.tokenUsage) updates.tokenUsage = match.tokenUsage;
      if (match.model && !req.model) updates.model = match.model;
      if (Object.keys(updates).length > 0) {
        updated = true;
        return { ...req, ...updates };
      }
    }
    return req;
  });

  if (updated) {
    useAIQueueStore.setState({ requests: updatedRequests });
  }
}

/**
 * Stop the server status polling (useful for cleanup).
 */
export function stopAIQueueInterceptor(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
