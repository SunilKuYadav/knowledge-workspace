"use server";

import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import type {
  TopicPracticeData,
  TopicPracticeProblem,
  TopicPracticeSuggestion,
} from "@/repository";

/**
 * Loads persisted practice data (suggestions + problems) for a topic.
 */
export async function loadPracticeProblems(
  topicId: string,
): Promise<TopicPracticeData | null> {
  const repo = new FileTopicRepository(getWorkspacePath());
  return repo.getPracticeProblems(topicId);
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
 * Saves a newly generated practice problem to the topic's practice-problems.json.
 */
export async function savePracticeProblem(
  topicId: string,
  problem: TopicPracticeProblem,
): Promise<{ success: boolean }> {
  const repo = new FileTopicRepository(getWorkspacePath());

  const existing = await repo.getPracticeProblems(topicId);
  const data: TopicPracticeData = existing ?? {
    topicId,
    suggestions: [],
    problems: [],
    updatedAt: new Date().toISOString(),
  };

  // Don't add duplicates
  if (data.problems.some((p) => p.id === problem.id)) {
    return { success: true };
  }

  data.problems.push(problem);

  // Mark the corresponding suggestion as generated
  data.suggestions = data.suggestions.map((s) =>
    s.id === problem.suggestionId ? { ...s, generated: true } : s,
  );

  data.updatedAt = new Date().toISOString();

  await repo.savePracticeProblems(topicId, data);
  return { success: true };
}

/**
 * Deletes a practice problem from the topic.
 */
export async function deletePracticeProblem(
  topicId: string,
  problemId: string,
): Promise<{ success: boolean }> {
  const repo = new FileTopicRepository(getWorkspacePath());

  const existing = await repo.getPracticeProblems(topicId);
  if (!existing) return { success: true };

  // Find the suggestion ID before removing so we can un-mark it
  const removedProblem = existing.problems.find((p) => p.id === problemId);
  existing.problems = existing.problems.filter((p) => p.id !== problemId);

  // Un-mark the suggestion as generated
  if (removedProblem) {
    existing.suggestions = existing.suggestions.map((s) =>
      s.id === removedProblem.suggestionId ? { ...s, generated: false } : s,
    );
  }

  existing.updatedAt = new Date().toISOString();

  await repo.savePracticeProblems(topicId, existing);
  return { success: true };
}

/**
 * Saves the user's solution and evaluation score for a practice problem.
 */
export async function savePracticeSolution(
  topicId: string,
  problemId: string,
  solution: string,
  score: number,
): Promise<{ success: boolean }> {
  const repo = new FileTopicRepository(getWorkspacePath());

  const existing = await repo.getPracticeProblems(topicId);
  if (!existing) return { success: false };

  existing.problems = existing.problems.map((p) =>
    p.id === problemId
      ? { ...p, savedSolution: solution, lastScore: score }
      : p,
  );
  existing.updatedAt = new Date().toISOString();

  await repo.savePracticeProblems(topicId, existing);
  return { success: true };
}
