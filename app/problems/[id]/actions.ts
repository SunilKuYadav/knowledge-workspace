"use server";

import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

/**
 * Saves problem solution code to solution.md in the problem folder.
 * Appends as a new solution entry with timestamp.
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
 * Overwrites the full solution.md content (for editing).
 */
export async function overwriteProblemSolution(
  problemId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    await repo.overwriteSolution(problemId, content);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

/**
 * Auto-saves the current code draft to draft.ts in the problem folder.
 * This is called periodically as the user types, so it should be non-blocking.
 */
export async function saveProblemDraft(
  problemId: string,
  content: string,
): Promise<{ success: boolean }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    await repo.saveDraft(problemId, content);
    return { success: true };
  } catch {
    // Draft save failures are silent — non-blocking
    return { success: false };
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

/**
 * Saves AI evaluation results alongside the solution.
 * Writes to evaluation.json in the problem folder.
 */
export async function saveProblemEvaluation(
  problemId: string,
  evaluation: {
    overallScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    complexity: { time: string; space: string };
    edgeCases?: string[];
    alternativeApproaches?: string[];
  },
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const problem = await repo.getById(problemId);
    if (!problem) return { success: false, error: "Problem not found" };

    const folderPath = path.join(workspacePath, "problems", problemId);
    const evalPath = path.join(folderPath, "evaluation.json");

    const evalData = {
      evaluatedAt: new Date().toISOString(),
      overallScore: evaluation.overallScore,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      complexity: evaluation.complexity,
      edgeCases: evaluation.edgeCases ?? [],
      alternativeApproaches: evaluation.alternativeApproaches ?? [],
      code,
    };

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(evalPath, JSON.stringify(evalData, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save evaluation",
    };
  }
}

import type { SolutionEntry } from "@/src/filesystem/FileProblemRepository";
import type { VariationPracticeEntry } from "@/types";

/**
 * Retrieves all structured solutions for a problem.
 */
export async function getStructuredSolutions(
  problemId: string,
): Promise<SolutionEntry[]> {
  const repo = new FileProblemRepository(getWorkspacePath());
  return repo.getStructuredSolutions(problemId);
}

/**
 * Adds a new structured solution entry with metadata.
 */
export async function addStructuredSolution(
  problemId: string,
  entry: SolutionEntry,
): Promise<{ success: boolean; solutions: SolutionEntry[]; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const solutions = await repo.addStructuredSolution(problemId, entry);
    return { success: true, solutions };
  } catch (err) {
    return {
      success: false,
      solutions: [],
      error: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

/**
 * Updates a specific solution entry by its id.
 */
export async function updateStructuredSolution(
  problemId: string,
  solutionId: string,
  updates: Partial<Pick<SolutionEntry, "code" | "score" | "feedback" | "complexity" | "note">>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const solutions = await repo.getStructuredSolutions(problemId);
    const idx = solutions.findIndex((s) => s.id === solutionId);
    if (idx === -1) return { success: false, error: "Solution not found" };
    solutions[idx] = { ...solutions[idx], ...updates };
    await repo.saveStructuredSolutions(problemId, solutions);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update",
    };
  }
}

/**
 * Deletes a specific solution entry by its id.
 */
export async function deleteStructuredSolution(
  problemId: string,
  solutionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const solutions = await repo.getStructuredSolutions(problemId);
    const filtered = solutions.filter((s) => s.id !== solutionId);
    await repo.saveStructuredSolutions(problemId, filtered);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete",
    };
  }
}


/**
 * Updates the practice status of a specific variation.
 */
export async function updateVariationStatus(
  problemId: string,
  variationId: string,
  status: "not-started" | "attempted" | "solved",
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const desc = await repo.getDescription(problemId);
    if (!desc) return { success: false, error: "Description not found" };

    const variations = desc.variations || [];
    const idx = variations.findIndex((v) => v.id === variationId);
    if (idx === -1) return { success: false, error: "Variation not found" };

    variations[idx] = {
      ...variations[idx],
      status,
      lastPracticedAt: new Date().toISOString(),
    };

    await repo.saveDescription(problemId, {
      ...desc,
      variations,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update variation status",
    };
  }
}

/**
 * Adds a practice attempt entry to a variation's history.
 */
export async function addVariationPracticeEntry(
  problemId: string,
  variationId: string,
  entry: VariationPracticeEntry,
): Promise<{ success: boolean; error?: string }> {
  try {
    const repo = new FileProblemRepository(getWorkspacePath());
    const desc = await repo.getDescription(problemId);
    if (!desc) return { success: false, error: "Description not found" };

    const variations = desc.variations || [];
    const idx = variations.findIndex((v) => v.id === variationId);
    if (idx === -1) return { success: false, error: "Variation not found" };

    const history = variations[idx].practiceHistory || [];
    history.push(entry);

    variations[idx] = {
      ...variations[idx],
      practiceHistory: history,
      status: "attempted",
      lastPracticedAt: entry.attemptedAt,
    };

    await repo.saveDescription(problemId, {
      ...desc,
      variations,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add practice entry",
    };
  }
}
