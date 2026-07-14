"use client";

/**
 * AI Request Queue Store
 *
 * Manages a sequential processing queue for AI requests:
 * - Only ONE request executes at a time; others wait in queue
 * - Only ONE model type can be active at once; switching models unloads current first
 * - Persists queue state to localStorage (toggleable)
 * - Exposes queue status for UI indicators
 * - Supports cancellation of pending and active requests
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/* ─── Types ──────────────────────────────────────────────── */

export type AIRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AIRequest {
  id: string;
  /** Human-readable label (e.g., "Generate artifact: Binary Trees") */
  label: string;
  /** The route key for model resolution (e.g., "ai/generate-artifact") */
  routeKey: string;
  /** Model tier resolved for this request */
  modelTier?: string;
  /** Model name used for this request (e.g., "qwen3-30b-a3b-mlx") */
  model?: string;
  status: AIRequestStatus;
  /** Timestamp when the request was enqueued */
  createdAt: number;
  /** Timestamp when processing started */
  startedAt?: number;
  /** Timestamp when processing finished */
  completedAt?: number;
  /** Error message if failed */
  error?: string;
  /** Token usage from the LLM (populated from server queue status) */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIQueueState {
  /** All tracked requests (active + pending + history) */
  requests: AIRequest[];
  /** ID of the currently processing request */
  activeRequestId: string | null;
  /** Whether the queue processor is running */
  isProcessing: boolean;
  /** Currently loaded model identifier */
  currentModel: string | null;
  /** Whether to persist queue state to localStorage */
  persistEnabled: boolean;
}

export interface AIQueueActions {
  /**
   * Enqueue a new AI request. Returns the request ID.
   * The processor will pick it up automatically.
   */
  enqueue: (label: string, routeKey: string, modelTier?: string) => string;

  /**
   * Mark the active request as completed.
   */
  completeActive: (tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }, model?: string) => void;

  /**
   * Mark the active request as failed with an error message.
   */
  failActive: (error: string) => void;

  /**
   * Cancel a specific request by ID.
   * If it's currently processing, marks it cancelled (caller should abort).
   * If pending, removes it from the queue.
   */
  cancel: (id: string) => void;

  /**
   * Cancel all pending requests.
   */
  cancelAllPending: () => void;

  /**
   * Start processing the next pending request.
   * Called internally after completing/failing a request.
   */
  processNext: () => AIRequest | null;

  /**
   * Update the currently loaded model name.
   */
  setCurrentModel: (model: string | null) => void;

  /**
   * Clear completed/failed/cancelled request history.
   */
  clearHistory: () => void;

  /**
   * Clear ALL requests (including pending).
   */
  clearAll: () => void;

  /**
   * Toggle persistence on/off. When disabled, clears stored data.
   */
  togglePersistence: () => void;

  /**
   * Force set persistence state.
   */
  setPersistEnabled: (enabled: boolean) => void;
}

export type AIQueueStore = AIQueueState & AIQueueActions;

/* ─── Persistence Helpers ────────────────────────────────── */

const STORAGE_KEY = "ai-queue-state";
const PERSIST_PREF_KEY = "ai-queue-persist-enabled";

function loadPersistedState(): Partial<AIQueueState> | null {
  if (typeof window === "undefined") return null;
  try {
    const prefRaw = localStorage.getItem(PERSIST_PREF_KEY);
    const persistEnabled = prefRaw !== "false"; // default true

    if (!persistEnabled) return { persistEnabled: false };

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { persistEnabled };

    const parsed = JSON.parse(raw) as AIQueueState;
    // On restore, reset any "processing" request back to "pending"
    // since the actual fetch was interrupted
    const requests = parsed.requests.map((r) =>
      r.status === "processing" ? { ...r, status: "pending" as const, startedAt: undefined } : r,
    );
    return {
      requests,
      activeRequestId: null,
      isProcessing: false,
      currentModel: parsed.currentModel,
      persistEnabled,
    };
  } catch {
    return null;
  }
}

function persistToStorage(state: AIQueueState): void {
  if (typeof window === "undefined") return;
  if (!state.persistEnabled) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function savePersistPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSIST_PREF_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

/* ─── Default State ──────────────────────────────────────── */

const defaultState: AIQueueState = {
  requests: [],
  activeRequestId: null,
  isProcessing: false,
  currentModel: null,
  persistEnabled: true,
};

/* ─── ID Generator ───────────────────────────────────────── */

let counter = 0;
function generateId(): string {
  counter += 1;
  return `ai-req-${Date.now()}-${counter}`;
}

/* ─── Store Creation ─────────────────────────────────────── */

function getInitialState(): AIQueueState {
  const restored = loadPersistedState();
  if (restored) {
    return { ...defaultState, ...restored };
  }
  return defaultState;
}

export const useAIQueueStore = create<AIQueueStore>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialState(),

    enqueue: (label: string, routeKey: string, modelTier?: string): string => {
      const id = generateId();
      const request: AIRequest = {
        id,
        label,
        routeKey,
        modelTier,
        status: "pending",
        createdAt: Date.now(),
      };

      set((state) => ({
        requests: [...state.requests, request],
      }));

      // Auto-trigger processing if nothing is active
      setTimeout(() => {
        const state = get();
        if (!state.isProcessing) {
          get().processNext();
        }
      }, 0);

      return id;
    },

    completeActive: (tokenUsage?, model?) => {
      set((state) => {
        if (!state.activeRequestId) return state;
        return {
          requests: state.requests.map((r) =>
            r.id === state.activeRequestId
              ? { ...r, status: "completed" as const, completedAt: Date.now(), tokenUsage, model: model ?? r.model }
              : r,
          ),
          activeRequestId: null,
          isProcessing: false,
        };
      });

      // Process next in queue
      setTimeout(() => get().processNext(), 0);
    },

    failActive: (error: string) => {
      set((state) => {
        if (!state.activeRequestId) return state;
        return {
          requests: state.requests.map((r) =>
            r.id === state.activeRequestId
              ? { ...r, status: "failed" as const, completedAt: Date.now(), error }
              : r,
          ),
          activeRequestId: null,
          isProcessing: false,
        };
      });

      // Process next in queue
      setTimeout(() => get().processNext(), 0);
    },

    cancel: (id: string) => {
      set((state) => {
        const request = state.requests.find((r) => r.id === id);
        if (!request) return state;

        if (request.status === "pending") {
          return {
            requests: state.requests.map((r) =>
              r.id === id
                ? { ...r, status: "cancelled" as const, completedAt: Date.now() }
                : r,
            ),
          };
        }

        if (request.status === "processing") {
          return {
            requests: state.requests.map((r) =>
              r.id === id
                ? { ...r, status: "cancelled" as const, completedAt: Date.now() }
                : r,
            ),
            activeRequestId: null,
            isProcessing: false,
          };
        }

        return state;
      });
    },

    cancelAllPending: () => {
      set((state) => ({
        requests: state.requests.map((r) =>
          r.status === "pending"
            ? { ...r, status: "cancelled" as const, completedAt: Date.now() }
            : r,
        ),
      }));
    },

    processNext: (): AIRequest | null => {
      const state = get();
      if (state.isProcessing) return null;

      const next = state.requests.find((r) => r.status === "pending");
      if (!next) return null;

      set({
        activeRequestId: next.id,
        isProcessing: true,
        requests: state.requests.map((r) =>
          r.id === next.id
            ? { ...r, status: "processing" as const, startedAt: Date.now() }
            : r,
        ),
      });

      return next;
    },

    setCurrentModel: (model: string | null) => {
      set({ currentModel: model });
    },

    clearHistory: () => {
      set((state) => ({
        requests: state.requests.filter(
          (r) => r.status === "pending" || r.status === "processing",
        ),
      }));
    },

    clearAll: () => {
      set({
        requests: [],
        activeRequestId: null,
        isProcessing: false,
      });
    },

    togglePersistence: () => {
      const current = get().persistEnabled;
      const next = !current;
      savePersistPref(next);
      if (!next) {
        clearStorage();
      }
      set({ persistEnabled: next });
    },

    setPersistEnabled: (enabled: boolean) => {
      savePersistPref(enabled);
      if (!enabled) {
        clearStorage();
      }
      set({ persistEnabled: enabled });
    },
  })),
);

/* ─── Auto-persist on state changes ─────────────────────── */

useAIQueueStore.subscribe((state) => {
  persistToStorage(state);
});

/* ─── Selectors ──────────────────────────────────────────── */

/**
 * IMPORTANT: Selectors returning primitives (numbers, booleans) are safe to
 * use directly with useAIQueueStore(selector). Selectors returning arrays or
 * objects MUST be wrapped with useShallow from 'zustand/react/shallow' to
 * avoid infinite re-render loops in React 19.
 */

/** Number of pending requests in queue (returns primitive — safe) */
export const selectPendingCount = (state: AIQueueStore) =>
  state.requests.filter((r) => r.status === "pending").length;

/** Whether any AI work is happening or queued (returns primitive — safe) */
export const selectHasActivity = (state: AIQueueStore) =>
  state.isProcessing || state.requests.some((r) => r.status === "pending");
