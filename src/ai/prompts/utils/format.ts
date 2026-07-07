/**
 * Formatting helpers for prompt construction.
 */

/**
 * Wraps content with labeled section markers.
 */
export function section(label: string, content: string): string {
  return `## ${label}\n${content}`;
}

/**
 * Formats a key-value pair for prompt metadata.
 */
export function field(key: string, value: string): string {
  return `${key}: ${value}`;
}

/**
 * Formats an array of key-value metadata fields.
 */
export function metadata(fields: Array<[string, string]>): string {
  return fields.map(([k, v]) => field(k, v)).join("\n");
}

/**
 * Joins multiple content blocks with double newlines.
 */
export function joinBlocks(...blocks: (string | undefined | null)[]): string {
  return blocks.filter(Boolean).join("\n\n");
}
