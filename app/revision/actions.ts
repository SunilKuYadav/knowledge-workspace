'use server';

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getWorkspacePath } from '@/src/lib/constants';
import { FileRevisionRepository } from '@/src/filesystem/FileRevisionRepository';
import { FileTopicRepository } from '@/src/filesystem/FileTopicRepository';
import { FileProblemRepository } from '@/src/filesystem/FileProblemRepository';
import { GitService } from '@/src/git/service';
import { generateCommitMessage } from '@/src/git/commit';
import type { RevisionData, RevisionEntry } from '@/src/types/Revision';

/**
 * Server action to rate a revision item.
 * Creates a RevisionEntry and persists it via the FileRevisionRepository,
 * which computes the next review date using spaced repetition.
 * Triggers a git commit after successful write (Requirement 8.1, 8.4).
 */
export async function rateRevision(
  itemId: string,
  itemType: 'topic' | 'problem',
  confidence: 1 | 2 | 3 | 4 | 5
): Promise<RevisionData> {
  const workspacePath = getWorkspacePath();
  const repository = new FileRevisionRepository(workspacePath);

  const entry: RevisionEntry = {
    id: uuidv4(),
    date: new Date().toISOString(),
    confidence,
  };

  const updatedData = await repository.updateRevision(itemId, itemType, entry);

  // Git auto-commit after successful revision update (never blocks - Requirement 8.4)
  const relativeFilePath = await getRevisionRelativePath(itemId, itemType, workspacePath);
  if (relativeFilePath) {
    const gitService = new GitService(workspacePath);
    const commitMessage = generateCommitMessage('update', relativeFilePath);
    await gitService.commitFile(relativeFilePath, commitMessage);
  }

  return updatedData;
}

/**
 * Determines the relative path to the revision.json file for a given item.
 * For topics: notes/{category}/{itemId}/revision.json
 * For problems: problems/{platform}/{itemId}/revision.json
 */
async function getRevisionRelativePath(
  itemId: string,
  itemType: 'topic' | 'problem',
  workspacePath: string
): Promise<string | null> {
  if (itemType === 'topic') {
    const topicRepo = new FileTopicRepository(workspacePath);
    const topic = await topicRepo.getById(itemId);
    if (topic) {
      return path.join('notes', topic.category, itemId, 'revision.json');
    }
  } else {
    const problemRepo = new FileProblemRepository(workspacePath);
    const problem = await problemRepo.getById(itemId);
    if (problem) {
      return path.join('problems', problem.platform, itemId, 'revision.json');
    }
  }
  return null;
}
