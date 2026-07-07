"use client";

import type { InterviewState } from "../lib/types";

export const STORAGE_KEY = "coding-interview-session";
export const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedState {
  state: InterviewState;
  lastPersistedAt: number;
}

/**
 * Checks whether persisted state is still fresh (within 24 hours).
 */
export function shouldRestore(persisted: PersistedState): boolean {
  return Date.now() - persisted.lastPersistedAt < MAX_AGE_MS;
}

/**
 * Reads and parses persisted state from sessionStorage.
 * Returns null if no state exists, parsing fails, or state is stale.
 */
export function loadPersistedState(): InterviewState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const persisted: PersistedState = JSON.parse(raw);

    if (
      !persisted ||
      !persisted.state ||
      typeof persisted.lastPersistedAt !== "number"
    ) {
      return null;
    }

    if (!shouldRestore(persisted)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return persisted.state;
  } catch {
    // Parse failure — clear corrupted data
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Persists state to sessionStorage with current timestamp.
 */
export function persistState(state: InterviewState): void {
  if (typeof window === "undefined") return;

  try {
    const persisted: PersistedState = {
      state,
      lastPersistedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Quota exceeded or other storage error — silently ignore
  }
}

/**
 * Removes persisted state from sessionStorage.
 */
export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
