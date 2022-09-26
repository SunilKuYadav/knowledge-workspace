/**
 * Reactive AI availability state with periodic health checks.
 *
 * Maintains a singleton-like module state tracking whether the AI service
 * is reachable. Polls every 30 seconds to detect availability changes.
 * Runs server-side only.
 *
 * Requirements: 6.1, 6.2, 6.4
 */

import { createAIClient } from './client';

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';

let available = false;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

const client = createAIClient({ baseUrl: DEFAULT_BASE_URL, apiKey: API_KEY });

/**
 * Returns the current AI availability status.
 */
export function getAIStatus(): boolean {
  return available;
}

/**
 * Starts the periodic health check polling.
 * Immediately performs an initial check, then polls every 30 seconds.
 * Calling this multiple times is safe — it will not create duplicate timers.
 */
export async function startHealthCheck(): Promise<void> {
  if (healthCheckTimer !== null) {
    return;
  }

  // Perform initial check
  available = await client.isAvailable();

  healthCheckTimer = setInterval(async () => {
    try {
      available = await client.isAvailable();
    } catch {
      available = false;
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

/**
 * Stops the periodic health check polling.
 */
export function stopHealthCheck(): void {
  if (healthCheckTimer !== null) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}
