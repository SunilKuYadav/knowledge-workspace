/**
 * In-memory store for AI logs that can be polled or streamed to the browser.
 * Stores the last N log entries (prompt + response pairs).
 * Also supports real-time streaming via listeners.
 */

export interface AILogEntry {
  id: number;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
  streaming?: boolean;
}

export type LogListener = (entry: AILogEntry) => void;

const MAX_ENTRIES = 50;
let entries: AILogEntry[] = [];
let nextId = 1;
const listeners: Set<LogListener> = new Set();

export function addLogEntry(prompt: string, response: string, model: string): void {
  const entry: AILogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    prompt,
    response,
    model,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }
  // Notify all connected listeners (SSE clients)
  for (const listener of listeners) {
    listener(entry);
  }
}

/**
 * Emit a streaming chunk event to connected browser clients.
 */
export function emitStreamChunk(prompt: string, chunk: string, model: string): void {
  const entry: AILogEntry = {
    id: 0, // Chunks don't get stored
    timestamp: new Date().toISOString(),
    prompt: prompt.slice(0, 200),
    response: chunk,
    model,
    streaming: true,
  };
  for (const listener of listeners) {
    listener(entry);
  }
}

export function getLogEntries(afterId = 0): AILogEntry[] {
  return entries.filter((e) => e.id > afterId);
}

export function addListener(listener: LogListener): void {
  listeners.add(listener);
}

export function removeListener(listener: LogListener): void {
  listeners.delete(listener);
}
