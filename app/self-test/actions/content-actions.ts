"use server";

import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { GitService } from "@/src/git/service";
import { generateCommitMessage } from "@/src/git/commit";

/**
 * Saves updated content to a topic artifact file and triggers a git commit.
 * Used after AI-generated content updates are confirmed by the user.
 */
export async function updateTopicContentAction(
  topicId: string,
  artifact: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const topicRepo = new FileTopicRepository(workspacePath);
    const gitService = new GitService(workspacePath);

    await topicRepo.saveContent(topicId, artifact, content);

    // Determine relative file path for git commit
    // We need the topic to find its category for the path
    const topic = await topicRepo.getById(topicId);
    if (topic) {
      const relativeFilePath = path.join(
        "notes",
        topic.category,
        topicId,
        `${artifact}.md`,
      );
      const commitMessage = generateCommitMessage("update", relativeFilePath);
      await gitService.commitFile(relativeFilePath, commitMessage);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update topic content",
    };
  }
}

/**
 * Loads the content of a specific artifact for a topic.
 * Returns the raw markdown content string.
 */
export async function loadTopicContentAction(
  topicId: string,
  artifact: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const topicRepo = new FileTopicRepository(workspacePath);

    const content = await topicRepo.getContent(topicId, artifact);

    return { success: true, content };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to load topic content",
    };
  }
}
