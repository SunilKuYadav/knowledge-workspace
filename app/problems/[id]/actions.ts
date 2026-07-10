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
 * Updates the problem status (not-started, attempted, solved).
 * Optionally increments attempt count and sets lastSolved date.
 */
export async function updateProblemStatus(
  problemId: string,
  status: "not-started" | "attempted" | "solved",
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const problem = await repo.getById(problemId);
    if (!problem) return { success: false, error: "Problem not found" };

    const updates: Record<string, unknown> = { status };

    if (status === "attempted" && problem.status === "not-started") {
      updates.attempts = (problem.attempts ?? 0) + 1;
    }
    if (status === "solved") {
      updates.lastSolved = new Date().toISOString();
      if (problem.status !== "solved") {
        updates.attempts = (problem.attempts ?? 0) + 1;
      }
    }

    await repo.update(problemId, updates);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update status",
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
