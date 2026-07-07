/**
 * Prompt composition utility.
 *
 * Combines system context modules with a task description to produce
 * a single prompt string. This keeps individual modules small and
 * allows each feature to select only the modules it needs.
 */

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
