import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * The type of action performed on a file.
 */
export type GitAction = 'create' | 'update' | 'delete';

/**
 * Generates a descriptive commit message based on the action, file path, and optional item title.
 *
 * Examples:
 * - "Create notes for topic: Binary Trees"
 * - "Update solution for problem: Two Sum"
 * - "Delete topic: Sorting Algorithms"
 * - "Update: path/to/file.md" (when no itemTitle provided)
 */
export function generateCommitMessage(
  action: GitAction,
  filePath: string,
  itemTitle?: string
): string {
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);

  if (!itemTitle) {
    return `${actionLabel}: ${filePath}`;
  }

  return `${actionLabel} ${filePath}: ${itemTitle}`;
}

/**
 * Executes `git add <filePath>` in the given workspace directory.
 * Throws on failure — callers are expected to handle errors.
 */
export async function executeGitAdd(
  filePath: string,
  cwd: string
): Promise<void> {
  await execAsync(`git add "${filePath}"`, { cwd });
}

/**
 * Executes `git commit -m "<message>"` in the given workspace directory.
 * Throws on failure — callers are expected to handle errors.
 */
export async function executeGitCommit(
  message: string,
  cwd: string
): Promise<void> {
  await execAsync(`git commit -m "${message}"`, { cwd });
}
