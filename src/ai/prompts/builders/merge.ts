/**
 * Merge-suggest prompt builders.
 *
 * Produces prompts for AI-assisted merging of duplicate topics or problems
 * into a single definitive entry.
 */

import { composePrompt } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";
import { JSON_CONTEXT } from "../system/json";
import { KNOWLEDGE_CONTEXT } from "../system/knowledge";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MergePromptParams {
  type: "topic" | "problem";
  items: Record<string, unknown>[];
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

/**
 * Builds a prompt for merging duplicate topics or problems into one entry.
 */
export function buildMergePrompt(params: MergePromptParams): string {
  const { type, items } = params;
  const itemsJson = JSON.stringify(items, null, 2);

  const task =
    type === "topic"
      ? buildTopicMergeTask(itemsJson)
      : buildProblemMergeTask(itemsJson);

  return composePrompt({
    modules: [IDENTITY_CONTEXT, KNOWLEDGE_CONTEXT, JSON_CONTEXT],
    task,
  });
}

// ─── Private ────────────────────────────────────────────────────────────────

function buildTopicMergeTask(itemsJson: string): string {
  return `Merge duplicate topics into a single definitive entry.

Given the following duplicate topic entries:

${itemsJson}

Produce a single merged topic JSON object that:
1. Uses the best/most descriptive title from the duplicates
2. Keeps the most advanced status (completed > in-progress > not-started)
3. Keeps the highest confidence level
4. Merges all tags (deduplicated)
5. Merges prerequisites and relatedTopics arrays (deduplicated)
6. Merges relatedProblemIds arrays (deduplicated)
7. Keeps the earliest createdAt and latest updatedAt
8. Uses the most appropriate difficulty (prefer the harder one if studying at that level)
9. Uses the most appropriate category
10. Sets estimatedMinutes to the maximum from all entries
11. Merges semanticDescription fields — combine intents, merge focus arrays and knownConcepts arrays (deduplicated), keep the more specific context, and use the higher targetLevel

Respond with ONLY valid JSON — no explanation, no markdown fences. The JSON should have the same schema as the input items (minus the "id" field — use the id from the first item).`;
}

function buildProblemMergeTask(itemsJson: string): string {
  return `Merge duplicate coding problems into a single definitive entry.

Given the following duplicate problem entries:

${itemsJson}

Produce a single merged problem JSON object that:
1. Uses the best/most descriptive title from the duplicates
2. Keeps the most advanced status (solved > attempted > not-started)
3. Merges all companies arrays (deduplicated)
4. Merges all patterns arrays (deduplicated)
5. Keeps the highest attempt count
6. Keeps favorite=true if any entry has it
7. Keeps the URL if any entry has one
8. Keeps the best (most specific) frequency rating
9. Keeps the most recent lastSolved date
10. Keeps the highest revisionCount
11. Keeps the best complexity values (lowest Big-O)
12. Merges relatedTopicIds (deduplicated)
13. Keeps the earliest createdAt and latest updatedAt
14. Uses the most appropriate difficulty
15. Merges semanticDescription fields — combine intents, merge focus arrays and knownConcepts arrays (deduplicated), keep the more specific context, and use the higher targetLevel

Respond with ONLY valid JSON — no explanation, no markdown fences. The JSON should have the same schema as the input items (minus the "id" field — use the id from the first item).`;
}
