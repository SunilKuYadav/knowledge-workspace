"use server";

import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

/**
 * Saves problem solution code to solution.md.
 */
export async function saveProblemSolution(
  problemId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    await repo.saveSolution(problemId, content);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

/**
 * Saves problem notes to notes.md.
 */
export async function saveProblemNotes(
  problemId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    await repo.saveNotes(problemId, content);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

/**
 * Links a similar problem ID to the current problem's description.json.
 */
export async function linkSimilarProblem(
  problemId: string,
  similarId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const desc = await repo.getDescription(problemId);
    if (!desc) {
      return { success: false, error: "Description not generated yet" };
    }
    const linked = desc.linkedSimilar || [];
    if (!linked.includes(similarId)) {
      linked.push(similarId);
    }
    await repo.saveDescription(problemId, {
      ...desc,
      linkedSimilar: linked,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to link",
    };
  }
}
