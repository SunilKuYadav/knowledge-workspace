'use server';

/**
 * Server action for saving AI-generated content to the workspace.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 13.3
 */

import path from 'path';
import { promises as fs } from 'fs';
import { getWorkspacePath } from '@/src/lib/constants';
import { FileTopicRepository } from '@/src/filesystem/FileTopicRepository';
import { FileProblemRepository } from '@/src/filesystem/FileProblemRepository';
import { GitService } from '@/src/git/service';
import { generateCommitMessage } from '@/src/git/commit';

/**
 * Saves AI-generated content to the appropriate file in the workspace.
 *
 * @param itemId - The ID of the topic or problem
 * @param type - Whether this is 'topic' or 'problem' content
 * @param content - The generated content to save
 * @param filename - The filename to save as (e.g., 'summary.md', 'quiz.json')
 */
export async function saveAIContent(
  itemId: string,
  type: 'topic' | 'problem',
  content: string,
  filename: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    let relativeFilePath: string;

    if (type === 'topic') {
      const topicRepo = new FileTopicRepository(workspacePath);
      const topic = await topicRepo.getById(itemId);
      if (!topic) {
        return { success: false, error: 'Topic not found' };
      }
      const topicDir = path.join(workspacePath, 'notes', topic.category, itemId);
      const filePath = path.join(topicDir, filename);
      relativeFilePath = path.join('notes', topic.category, itemId, filename);
      await fs.mkdir(topicDir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } else {
      const problemRepo = new FileProblemRepository(workspacePath);
      const problem = await problemRepo.getById(itemId);
      if (!problem) {
        return { success: false, error: 'Problem not found' };
      }
      const problemDir = path.join(workspacePath, 'problems', problem.platform, itemId);
      const filePath = path.join(problemDir, filename);
      relativeFilePath = path.join('problems', problem.platform, itemId, filename);
      await fs.mkdir(problemDir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    }

    // Git auto-commit after successful write (never blocks save - Requirement 8.4)
    const gitService = new GitService(workspacePath);
    const commitMessage = generateCommitMessage('create', relativeFilePath);
    await gitService.commitFile(relativeFilePath, commitMessage);

    return { success: true, path: relativeFilePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
