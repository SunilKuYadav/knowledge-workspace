/**
 * Formatting helpers for prompt construction.
 */

import type { SemanticDescription } from "@/types";

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

/**
 * Formats a semantic description into a prompt-friendly context block.
 * Returns an empty string if the description is undefined or has no fields set.
 */
export function formatSemanticContext(
  desc: SemanticDescription | undefined | null,
): string {
  if (!desc) return "";

  const parts: string[] = [];

  if (desc.intent) {
    parts.push(`Learning Intent: ${desc.intent}`);
  }
  if (desc.targetLevel) {
    parts.push(`Target Depth: ${desc.targetLevel}`);
  }
  if (desc.context) {
    parts.push(`Additional Context: ${desc.context}`);
  }
  if (desc.focus && desc.focus.length > 0) {
    parts.push(`Focus Areas: ${desc.focus.join(", ")}`);
  }
  if (desc.knownConcepts && desc.knownConcepts.length > 0) {
    parts.push(
      `Already Known (skip basics): ${desc.knownConcepts.join(", ")}`,
    );
  }

  if (parts.length === 0) return "";

  return `## Item-Specific Context\n${parts.join("\n")}`;
}
