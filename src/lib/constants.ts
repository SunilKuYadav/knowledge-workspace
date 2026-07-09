import path from "path";

/**
 * Workspace directory structure configuration.
 * Defines the subdirectories for notes (by topic category)
 * and root-level directories.
 */
export const WORKSPACE_STRUCTURE = {
  notes: ["dsa", "system-design", "database", "networking", "os", "oop"],
  root: ["templates", "revision", "flashcards", "assets", "problems"],
} as const;

/**
 * Default workspace path used when the WORKSPACE_PATH environment variable is not set.
 * Resolves to ./knowledge-workspace inside the project directory.
 */
const DEFAULT_WORKSPACE_PATH = path.resolve(
  process.cwd(),
  "knowledge-workspace",
);

/**
 * Returns the resolved workspace path.
 * Reads from the WORKSPACE_PATH environment variable, falling back to
 * ~/knowledge-workspace if not set.
 */
export function getWorkspacePath(): string {
  return process.env.WORKSPACE_PATH || DEFAULT_WORKSPACE_PATH;
}

/**
 * All note category values as a type.
 */
export type NoteCategory = (typeof WORKSPACE_STRUCTURE.notes)[number];
