"use server";

import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { linkProblemToTopic, unlinkProblemFromTopic } from "@/app/actions/link-actions";
import type {
  TopicPracticeData,
  TopicPracticeSuggestion,
} from "@/repository";
import type { ProblemDescription } from "@/types";

/**
 * Loads persisted practice data (suggestions only) for a topic.
 * Problems are now standalone — fetched from the problems repository via links.
 */
export async function loadPracticeSuggestions(
  topicId: string,
): Promise<{ suggestions: TopicPracticeSuggestion[] } | null> {
  const repo = new FileTopicRepository(getWorkspacePath());
  const data = await repo.getPracticeProblems(topicId);
  if (!data) return null;
  return { suggestions: data.suggestions };
}

/**
 * Persists AI-generated suggestions so the user doesn't have to
 * re-generate them every time they visit the Practice tab.
 */
export async function saveSuggestions(
  topicId: string,
  suggestions: TopicPracticeSuggestion[],
): Promise<{ success: boolean }> {
  const repo = new FileTopicRepository(getWorkspacePath());

  const existing = await repo.getPracticeProblems(topicId);
  const data: TopicPracticeData = existing ?? {
    topicId,
    suggestions: [],
    problems: [],
    updatedAt: new Date().toISOString(),
  };

  data.suggestions = suggestions;
  data.updatedAt = new Date().toISOString();

  await repo.savePracticeProblems(topicId, data);
  return { success: true };
}

/**
 * Creates a standalone problem from a generated practice problem,
 * stores its description/test data, and links it to the topic.
 * Returns the created problem's ID.
 */
export async function createPracticeAsStandaloneProblem(
  topicId: string,
  suggestionId: string,
  problemData: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    description: string;
    constraints: string[];
    examples: { input: string; expectedOutput: string; explanation?: string }[];
    testCases: { input: string; expectedOutput: string }[];
    boilerplate: string;
    harness?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
    patterns: string[];
  },
): Promise<{ success: boolean; problemId?: string; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const problemRepo = new FileProblemRepository(workspacePath);

    // Create the standalone problem
    const problem = await problemRepo.create({
      title: problemData.title,
      difficulty: problemData.difficulty,
      companies: [],
      patterns: problemData.patterns,
      status: "not-started",
      favorite: false,
      relatedTopicIds: [topicId],
      semanticDescription: {},
    });

    // Save description.json with full test data + boilerplate
    const now = new Date().toISOString();
    const descriptionData: ProblemDescription = {
      problemId: problem.id,
      description: problemData.description,
      constraints: problemData.constraints,
      examples: problemData.examples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.expectedOutput,
        explanation: ex.explanation,
      })),
      testCases: problemData.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      boilerplate: problemData.boilerplate,
      harness: problemData.harness,
      timeComplexity: problemData.timeComplexity,
      spaceComplexity: problemData.spaceComplexity,
      generatedAt: now,
      updatedAt: now,
    };

    await problemRepo.saveDescription(problem.id, descriptionData);

    // Link problem to topic bidirectionally
    await linkProblemToTopic(problem.id, topicId);

    // Mark the corresponding suggestion as generated
    const topicRepo = new FileTopicRepository(workspacePath);
    const existing = await topicRepo.getPracticeProblems(topicId);
    if (existing) {
      existing.suggestions = existing.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, generated: true } : s,
      );
      existing.updatedAt = now;
      await topicRepo.savePracticeProblems(topicId, existing);
    }

    return { success: true, problemId: problem.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create problem",
    };
  }
}

/**
 * Unlinks a practice problem from the topic and optionally deletes it.
 * Also un-marks the corresponding suggestion.
 */
export async function unlinkPracticeProblem(
  topicId: string,
  problemId: string,
  suggestionId?: string,
): Promise<{ success: boolean }> {
  try {
    // Unlink bidirectionally
    await unlinkProblemFromTopic(problemId, topicId);

    // Un-mark the suggestion if we know which one it came from
    if (suggestionId) {
      const topicRepo = new FileTopicRepository(getWorkspacePath());
      const existing = await topicRepo.getPracticeProblems(topicId);
      if (existing) {
        existing.suggestions = existing.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, generated: false } : s,
        );
        existing.updatedAt = new Date().toISOString();
        await topicRepo.savePracticeProblems(topicId, existing);
      }
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Saves the user's solution for a practice problem (as a standalone problem solution).
 */
export async function savePracticeSolution(
  problemId: string,
  solution: string,
  score: number,
): Promise<{ success: boolean }> {
  try {
    const workspacePath = getWorkspacePath();
    const problemRepo = new FileProblemRepository(workspacePath);

    // Save the solution to the problem's solution.md
    await problemRepo.saveSolution(problemId, solution);

    // Update the problem status based on score
    const newStatus = score >= 60 ? "solved" : "attempted";
    await problemRepo.update(problemId, { status: newStatus });

    return { success: true };
  } catch {
    return { success: false };
  }
}
