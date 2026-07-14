"use server";

import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";

/**
 * Links a problem to a topic bidirectionally.
 * Adds topicId to problem.relatedTopicIds and problemId to topic.relatedProblemIds.
 */
export async function linkProblemToTopic(
  problemId: string,
  topicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const problemRepo = new FileProblemRepository(workspacePath);
    const topicRepo = new FileTopicRepository(workspacePath);

    // Update problem: add topicId to relatedTopicIds
    const problem = await problemRepo.getById(problemId);
    if (!problem) {
      return { success: false, error: "Problem not found" };
    }
    const topicIds = problem.relatedTopicIds ?? [];
    if (!topicIds.includes(topicId)) {
      topicIds.push(topicId);
      await problemRepo.update(problemId, { relatedTopicIds: topicIds });
    }

    // Update topic: add problemId to relatedProblemIds
    const topic = await topicRepo.getById(topicId);
    if (!topic) {
      return { success: false, error: "Topic not found" };
    }
    const problemIds = topic.relatedProblemIds ?? [];
    if (!problemIds.includes(problemId)) {
      problemIds.push(problemId);
      await topicRepo.update(topicId, { relatedProblemIds: problemIds });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to link",
    };
  }
}

/**
 * Unlinks a problem from a topic bidirectionally.
 * Removes topicId from problem.relatedTopicIds and problemId from topic.relatedProblemIds.
 */
export async function unlinkProblemFromTopic(
  problemId: string,
  topicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const problemRepo = new FileProblemRepository(workspacePath);
    const topicRepo = new FileTopicRepository(workspacePath);

    // Update problem: remove topicId from relatedTopicIds
    const problem = await problemRepo.getById(problemId);
    if (problem) {
      const topicIds = (problem.relatedTopicIds ?? []).filter(
        (id) => id !== topicId,
      );
      await problemRepo.update(problemId, { relatedTopicIds: topicIds });
    }

    // Update topic: remove problemId from relatedProblemIds
    const topic = await topicRepo.getById(topicId);
    if (topic) {
      const problemIds = (topic.relatedProblemIds ?? []).filter(
        (id) => id !== problemId,
      );
      await topicRepo.update(topicId, { relatedProblemIds: problemIds });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unlink",
    };
  }
}
