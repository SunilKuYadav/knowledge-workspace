import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getWorkspacePath as getWorkspacePathFromConstants } from "../lib/constants";
import type { FilesystemError } from "@/types/errors";

/**
 * Returns the resolved workspace path.
 * Re-exports from constants for convenience within the filesystem layer.
 */
export function getWorkspacePath(): string {
  return getWorkspacePathFromConstants();
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error: unknown) {
    throw mapToFilesystemError(error, dirPath);
  }
}

/**
 * Lists subdirectory names (not files) within a given path.
 * Returns an empty array if the directory does not exist.
 */
export async function listDirectories(basePath: string): Promise<string[]> {
  try {
    const entries = await readdir(basePath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw mapToFilesystemError(error, basePath);
  }
}

/**
 * Reads and parses a JSON file, returning the typed result.
 * Returns null if the file does not exist (no error thrown).
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw mapToFilesystemError(error, filePath);
  }
}

/**
 * Writes data as formatted JSON to a file.
 * Ensures the parent directory exists before writing.
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T,
): Promise<void> {
  try {
    await ensureDirectoryExists(path.dirname(filePath));
    const content = JSON.stringify(data, null, 2);
    await writeFile(filePath, content, "utf-8");
  } catch (error: unknown) {
    if (isFilesystemError(error)) {
      throw error;
    }
    throw mapToFilesystemError(error, filePath);
  }
}

/**
 * Reads a Markdown file and returns its content as a string.
 * Returns an empty string if the file does not exist (no error thrown).
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }
    throw mapToFilesystemError(error, filePath);
  }
}

/**
 * Writes content to a Markdown file.
 * Ensures the parent directory exists before writing.
 */
export async function writeMarkdownFile(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    await ensureDirectoryExists(path.dirname(filePath));
    await writeFile(filePath, content, "utf-8");
  } catch (error: unknown) {
    if (isFilesystemError(error)) {
      throw error;
    }
    throw mapToFilesystemError(error, filePath);
  }
}

/**
 * Type guard for Node.js system errors with a `code` property.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Type guard for already-mapped FilesystemError objects.
 */
function isFilesystemError(error: unknown): error is FilesystemError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "path" in error &&
    typeof (error as FilesystemError).code === "string" &&
    ["NOT_FOUND", "PERMISSION_DENIED", "DISK_FULL", "UNKNOWN"].includes(
      (error as FilesystemError).code,
    )
  );
}

/**
 * Maps a Node.js filesystem error to a typed FilesystemError.
 * - ENOENT → NOT_FOUND
 * - EACCES / EPERM → PERMISSION_DENIED
 * - ENOSPC → DISK_FULL
 * - other → UNKNOWN
 */
function mapToFilesystemError(
  error: unknown,
  filePath: string,
): FilesystemError {
  if (isNodeError(error)) {
    switch (error.code) {
      case "ENOENT":
        return {
          code: "NOT_FOUND",
          message: `File or directory not found: ${filePath}`,
          path: filePath,
        };
      case "EACCES":
      case "EPERM":
        return {
          code: "PERMISSION_DENIED",
          message: `Permission denied: ${filePath}`,
          path: filePath,
        };
      case "ENOSPC":
        return {
          code: "DISK_FULL",
          message: `No space left on device: ${filePath}`,
          path: filePath,
        };
      default:
        return {
          code: "UNKNOWN",
          message: error.message || `Unknown filesystem error: ${filePath}`,
          path: filePath,
        };
    }
  }

  return {
    code: "UNKNOWN",
    message:
      error instanceof Error ? error.message : `Unknown error: ${filePath}`,
    path: filePath,
  };
}
