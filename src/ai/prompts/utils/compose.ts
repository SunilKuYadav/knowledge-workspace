/**
 * Prompt composition utility.
 *
 * Combines system context modules with a task description to produce
 * a single prompt string. This keeps individual modules small and
 * allows each feature to select only the modules it needs.
 */

import type { PromptConfig } from "@/types/PromptConfig";
import { getPromptForAction } from "../config";

export interface ComposeOptions {
  /** System context modules to prepend (order matters). */
  modules: string[];
  /** The actual user/task instruction. */
  task: string;
}

/**
 * Composes a full prompt from selected system modules and a task string.
 *
 * @example
 * ```ts
 * const prompt = composePrompt({
 *   modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
 *   task: `Explain binary search trees.`,
 * });
 * ```
 */
export function composePrompt({ modules, task }: ComposeOptions): string {
  return [...modules.filter(Boolean), "", "## Task", task].join("\n\n");
}

/**
 * Config-aware prompt composition.
 *
 * Instead of using static module strings, this uses the user's PromptConfig
 * to generate experience-calibrated prompts for specified action keys.
 *
 * @example
 * ```ts
 * const prompt = composeWithConfig({
 *   actionKeys: ["identity", "teaching"],
 *   extraModules: [MARKDOWN_CONTEXT],
 *   task: "Explain binary search trees.",
 *   config,
 * });
 * ```
 */
export interface ComposeWithConfigOptions {
  /** Action keys to include (will be generated from user config). */
  actionKeys: Array<import("@/types/PromptConfig").PromptActionKey>;
  /** Additional static modules to include (e.g., MARKDOWN_CONTEXT). */
  extraModules?: string[];
  /** The actual user/task instruction. */
  task: string;
  /** User's prompt configuration. */
  config: PromptConfig;
}

export function composeWithConfig({
  actionKeys,
  extraModules = [],
  task,
  config,
}: ComposeWithConfigOptions): string {
  const configModules = actionKeys.map((key) => getPromptForAction(key, config));
  const allModules = [...configModules, ...extraModules].filter(Boolean);
  return [...allModules, "", "## Task", task].join("\n\n");
}
