/**
 * Prompt builder for enhancing/refining user input before form parsing.
 *
 * Takes a rough user description and generates a more detailed, structured
 * prompt that will produce better results when used to fill form fields.
 */
import { composePrompt } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";

export function buildEnhancePromptForTopic(text: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT],
    task: `You are an expert at refining vague descriptions into clear, detailed prompts for creating coding/CS study topics.

Given the user's rough input, generate an enhanced version that is:
- More specific about what the topic covers
- Includes appropriate difficulty level if not specified
- Suggests relevant tags/keywords
- Keeps the user's original intent intact

User's input: "${text}"

Return ONLY a single enhanced prompt string (no JSON, no explanation, no quotes around it). The enhanced prompt should read naturally, like:
"A hard DSA topic about graph traversal algorithms including BFS, DFS, and shortest path algorithms with tags graphs, bfs, dfs, dijkstra"

Keep it concise but detailed enough to extract structured data from.`,
  });
}

export function buildEnhancePromptForProblem(text: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT],
    task: `You are an expert at refining vague descriptions into clear, detailed prompts for creating coding problem entries.

Given the user's rough input, generate an enhanced version that is:
- More specific about the problem details
- Includes difficulty, companies, and patterns if they can be inferred
- Includes a problem URL if it can be inferred
- Keeps the user's original intent intact

User's input: "${text}"

Return ONLY a single enhanced prompt string (no JSON, no explanation, no quotes around it). The enhanced prompt should read naturally, like:
"Two Sum, easy difficulty, frequently asked at Google and Amazon, uses hash map and two-pointers patterns, URL: https://leetcode.com/problems/two-sum"

Keep it concise but detailed enough to extract structured data from.`,
  });
}

export function buildEnhancePromptForText(
  text: string,
  context?: string,
): string {
  const contextSnippet = context
    ? `\n\nExisting document context (first 500 chars):\n"""${context.slice(0, 500)}"""`
    : "";

  return composePrompt({
    modules: [IDENTITY_CONTEXT],
    task: `You are an expert at refining vague writing prompts into clear, detailed instructions for generating markdown content.

Given the user's rough input, generate an enhanced version that is:
- More specific about what to write (scope, structure, depth)
- Suggests the tone and format (bullet list, table, explanation, tutorial, etc.)
- Includes any inferred technical details or constraints
- Keeps the user's original intent intact
${contextSnippet}

User's input: "${text}"

Return ONLY a single enhanced prompt string (no JSON, no explanation, no quotes around it). The enhanced prompt should read like a clear instruction, for example:
"Write a detailed explanation of binary search tree operations including insertion, deletion, and search, using code examples in TypeScript, formatted with headers for each operation"

Keep it concise but specific enough to produce high-quality markdown output.`,
  });
}
