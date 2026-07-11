/**
 * Server-side AI Request Queue
 *
 * Ensures only ONE AI inference request runs at a time on the server.
 * All requests go through this queue before reaching the LLM.
 * Handles model switching: if next request needs a different model,
 * the current model is unloaded first.
 *
 * This is a singleton module — the queue persists across all API route calls
 * within the same server process.
 */

import { logger } from "../lib/logger";

/* ─── Types ──────────────────────────────────────────────── */

export type ServerQueueItemStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface ServerQueueItem {
  id: string;
  /** Route key (e.g., "ai/generate-artifact") */
  routeKey: string;
  /** Human-readable label */
  label: string;
  /** Model that will be used */
  model: string;
  status: ServerQueueItemStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  /** Token usage from the LLM response */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ServerQueueSnapshot {
  /** Currently processing item */
  active: ServerQueueItem | null;
  /** Items waiting to be processed */
  pending: ServerQueueItem[];
  /** Recently completed items (last 20) */
  history: ServerQueueItem[];
  /** Currently loaded model */
  currentModel: string | null;
}

/* ─── Queue Implementation ───────────────────────────────── */

type QueuedTask<T> = {
  id: string;
  routeKey: string;
  label: string;
  model: string;
  execute: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  abortController: AbortController;
};

const MAX_HISTORY = 30;

class AIServerQueue {
  private queue: QueuedTask<unknown>[] = [];
  private processing = false;
  private items: ServerQueueItem[] = [];
  private activeId: string | null = null;
  private currentModel: string | null = null;
  private idCounter = 0;

  /**
   * Enqueue a task to be executed when it's this request's turn.
   * Returns a promise that resolves with the task's result.
   */
  enqueue<T>(
    routeKey: string,
    label: string,
    model: string,
    execute: (signal: AbortSignal) => Promise<T>,
  ): { promise: Promise<T>; id: string; cancel: () => void } {
    const id = `srv-${Date.now()}-${++this.idCounter}`;
    const abortController = new AbortController();

    const item: ServerQueueItem = {
      id,
      routeKey,
      label,
      model,
      status: "pending",
      createdAt: Date.now(),
    };
    this.items.push(item);

    logger.info("ai-queue", `Enqueued: [${id}] ${label} (model: ${model})`);

    const promise = new Promise<T>((resolve, reject) => {
      const task: QueuedTask<unknown> = {
        id,
        routeKey,
        label,
        model,
        execute: execute as (signal: AbortSignal) => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        abortController,
      };
      this.queue.push(task);
    });

    // Kick off processing if idle
    this.processNext();

    const cancel = () => {
      abortController.abort();
      const idx = this.queue.findIndex((t) => t.id === id);
      if (idx >= 0) {
        this.queue.splice(idx, 1);
        this.updateItem(id, { status: "cancelled", completedAt: Date.now() });
        logger.info("ai-queue", `Cancelled pending: [${id}] ${label}`);
      } else if (this.activeId === id) {
        // Currently processing — abort will propagate
        this.updateItem(id, { status: "cancelled", completedAt: Date.now() });
        logger.info("ai-queue", `Cancelled active: [${id}] ${label}`);
      }
    };

    return { promise, id, cancel };
  }

  /**
   * Get a snapshot of current queue state for the status API.
   */
  getSnapshot(): ServerQueueSnapshot {
    const active = this.activeId
      ? (this.items.find((i) => i.id === this.activeId) ?? null)
      : null;
    const pending = this.items.filter((i) => i.status === "pending");
    const history = this.items
      .filter(
        (i) =>
          i.status === "completed" ||
          i.status === "failed" ||
          i.status === "cancelled",
      )
      .slice(-MAX_HISTORY);

    return {
      active,
      pending,
      history,
      currentModel: this.currentModel,
    };
  }

  /**
   * Update the current model tracking (called externally when model loads).
   */
  setCurrentModel(model: string | null): void {
    this.currentModel = model;
  }

  /**
   * Update token usage for a specific queue item.
   */
  setTokenUsage(
    id: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  ): void {
    this.updateItem(id, { tokenUsage: usage });
  }

  /**
   * Get the count of pending + active items.
   */
  getQueueLength(): number {
    return this.queue.length + (this.processing ? 1 : 0);
  }

  // ─── Private ────────────────────────────────────────────

  private async processNext(): Promise<void> {
    if (this.processing) return;
    if (this.queue.length === 0) return;

    this.processing = true;
    const task = this.queue.shift()!;
    this.activeId = task.id;

    this.updateItem(task.id, { status: "processing", startedAt: Date.now() });
    logger.info("ai-queue", `Processing: [${task.id}] ${task.label}`);

    // Safety timeout: if a task runs longer than 5 minutes, abort it.
    // This prevents the queue from getting permanently stuck when the LLM hangs.
    const TASK_TIMEOUT_MS = 300_000; // 5 minutes
    const taskTimeoutId = setTimeout(() => {
      if (this.activeId === task.id && !task.abortController.signal.aborted) {
        logger.info("ai-queue", `Timeout: [${task.id}] ${task.label} exceeded ${TASK_TIMEOUT_MS / 1000}s — aborting`);
        task.abortController.abort();
      }
    }, TASK_TIMEOUT_MS);

    try {
      const result = await task.execute(task.abortController.signal);
      clearTimeout(taskTimeoutId);
      this.updateItem(task.id, { status: "completed", completedAt: Date.now() });
      this.currentModel = task.model;
      logger.info("ai-queue", `Completed: [${task.id}] ${task.label}`);
      task.resolve(result);
    } catch (err) {
      clearTimeout(taskTimeoutId);
      if (task.abortController.signal.aborted) {
        this.updateItem(task.id, { status: "cancelled", completedAt: Date.now() });
        task.reject(new Error("Request cancelled"));
      } else {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.updateItem(task.id, {
          status: "failed",
          completedAt: Date.now(),
          error: errorMsg,
        });
        logger.info("ai-queue", `Failed: [${task.id}] ${task.label}: ${errorMsg}`);
        task.reject(err);
      }
    } finally {
      this.activeId = null;
      this.processing = false;
      // Trim old history
      this.trimHistory();
      // Process next in queue
      this.processNext();
    }
  }

  private updateItem(id: string, updates: Partial<ServerQueueItem>): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx >= 0) {
      this.items[idx] = { ...this.items[idx], ...updates };
    }
  }

  private trimHistory(): void {
    // Keep only pending/processing + last MAX_HISTORY completed items
    const live = this.items.filter(
      (i) => i.status === "pending" || i.status === "processing",
    );
    const done = this.items.filter(
      (i) =>
        i.status === "completed" ||
        i.status === "failed" ||
        i.status === "cancelled",
    );
    this.items = [...live, ...done.slice(-MAX_HISTORY)];
  }
}

/* ─── Singleton Export ───────────────────────────────────── */

export const aiServerQueue = new AIServerQueue();
