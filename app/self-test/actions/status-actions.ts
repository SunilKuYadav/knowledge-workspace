"use server";

import path from "path";
import { v4 } from "uuid";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileRevisionRepository } from "@/src/filesystem/FileRevisionRepository";
import { TopicService } from "@/src/services/TopicService";
import { GitService } from "@/src/git/service";
import { generateCommitMessage } from "@/src/git/commit";
import type { RevisionEntry } from "@/src/types/Revision";

/**
 * Marks a topic as "in-progress".
 * Called when a user clicks the "Mark In-Progress" button on a not-started topic.
 */
export async function markTopicInProgressAction(
  topicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const topicService = new TopicService(
      new FileTopicRepository(workspacePath),
    );

    await topicService.updateTopic(topicId, { status: "in-progress" });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update topic status to in-progress",
    };
  }
}

/**
 * Marks a topic as "completed", creates a RevisionEntry, and git commits.
 * Called when a user completes an assessment with confidence >= 4.5.
 */
export async function markTopicCompletedAction(
  topicId: string,
  confidenceScore: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const topicService = new TopicService(
      new FileTopicRepository(workspacePath),
    );
    const revisionRepo = new FileRevisionRepository(workspacePath);
    const gitService = new GitService(workspacePath);

    // Update topic status to completed
    await topicService.updateTopic(topicId, { status: "completed" });

    // Create RevisionEntry with confidence rounded to nearest integer, clamped 1-5
    const roundedConfidence = Math.round(confidenceScore);
    const clampedConfidence = Math.max(1, Math.min(5, roundedConfidence)) as
      | 1
      | 2
      | 3
      | 4
      | 5;

    const entry: RevisionEntry = {
      id: v4(),
      date: new Date().toISOString(),
      confidence: clampedConfidence,
      notes: "assessment-session",
    };

    await revisionRepo.updateRevision(topicId, "topic", entry);

    // Git commit the topic.json file
    const topic = await topicService.getTopicById(topicId);
    if (topic) {
      const slug = topic.slug || topicId;
      const relativeFilePath = path.join(
        "notes",
        topic.category,
        slug,
        "topic.json",
      );
      const commitMessage = generateCommitMessage(
        "update",
        relativeFilePath,
        topic.title,
      );
      await gitService.commitFile(relativeFilePath, commitMessage);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to mark topic as completed",
    };
  }
}
