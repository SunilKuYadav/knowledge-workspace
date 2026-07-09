"use server";

import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import { writeMarkdownFile } from "@/src/filesystem/workspace";
import { updateSearchForFile } from "@/src/search/init";

/**
 * Server action to save file content.
 * - Writes raw Markdown content to the file path within the workspace
 * - Updates the search index incrementally for the changed file
 */
export async function saveFile(
  filePath: string,
  content: string,
): Promise<void> {
  const workspacePath = getWorkspacePath();
  const fullPath = path.join(workspacePath, filePath);

  // Write the markdown content
  await writeMarkdownFile(fullPath, content);

  // Incrementally update the search index for this file
  const id = deriveIdFromPath(filePath);
  const type = deriveTypeFromPath(filePath);
  const title = deriveTitleFromPath(filePath);
  updateSearchForFile(id, type, title, content, [], filePath);
}

/**
 * Derives a document ID from the file path.
 * Uses the parent folder name as the ID (e.g., "notes/dsa/binary-trees/notes.md" → "binary-trees").
 */
function deriveIdFromPath(filePath: string): string {
  const parts = filePath.split("/");
  // The slug is typically the parent directory of the file
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Derives the document type from its file path.
 */
function deriveTypeFromPath(
  filePath: string,
): "topic" | "problem" | "note" | "flashcard" {
  if (filePath.startsWith("notes/")) return "topic";
  if (filePath.startsWith("problems/")) return "problem";
  if (filePath.includes("flashcard")) return "flashcard";
  return "note";
}

/**
 * Derives a human-readable title from the file path.
 * Capitalizes the slug and appends the file name context.
 */
function deriveTitleFromPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length >= 2) {
    const slug = parts[parts.length - 2];
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return path.basename(filePath, path.extname(filePath));
}
