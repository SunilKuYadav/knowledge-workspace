'use server';

import { redirect } from 'next/navigation';
import { getWorkspacePath } from '@/src/lib/constants';
import { FileTopicRepository } from '@/src/filesystem/FileTopicRepository';
import { FileProblemRepository } from '@/src/filesystem/FileProblemRepository';
import { TopicService } from '@/src/services/TopicService';
import { ProblemService } from '@/src/services/ProblemService';
import type { Topic, Problem } from '@/src/types';

export type CreateTopicState = {
  error?: string;
  success?: boolean;
};

export type CreateProblemState = {
  error?: string;
  success?: boolean;
};

/**
 * Server action to create a new topic from form data.
 * Validates required fields and delegates to TopicService.
 */
export async function createTopic(
  _prevState: CreateTopicState,
  formData: FormData
): Promise<CreateTopicState> {
  const title = formData.get('title') as string;
  const category = formData.get('category') as Topic['category'];
  const difficulty = formData.get('difficulty') as Topic['difficulty'];
  const tagsRaw = formData.get('tags') as string;

  if (!title || !title.trim()) {
    return { error: 'Title is required.' };
  }

  if (!category) {
    return { error: 'Category is required.' };
  }

  if (!difficulty) {
    return { error: 'Difficulty is required.' };
  }

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));

  try {
    const topic = await topicService.createTopic({
      title: title.trim(),
      category,
      difficulty,
      status: 'not-started',
      confidence: 1,
      tags,
    });

    redirect(`/topics/${topic.id}`);
  } catch (err: unknown) {
    // redirect() throws a special error in Next.js — rethrow it
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    // Next.js redirect throws with digest property
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return { error: `Failed to create topic: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

/**
 * Server action to create a new problem from form data.
 * Validates required fields and delegates to ProblemService.
 */
export async function createProblem(
  _prevState: CreateProblemState,
  formData: FormData
): Promise<CreateProblemState> {
  const title = formData.get('title') as string;
  const platform = formData.get('platform') as Problem['platform'];
  const difficulty = formData.get('difficulty') as Problem['difficulty'];
  const companiesRaw = formData.get('companies') as string;
  const patternsRaw = formData.get('patterns') as string;
  const url = formData.get('url') as string;

  if (!title || !title.trim()) {
    return { error: 'Title is required.' };
  }

  if (!platform) {
    return { error: 'Platform is required.' };
  }

  if (!difficulty) {
    return { error: 'Difficulty is required.' };
  }

  const companies = companiesRaw
    ? companiesRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const patterns = patternsRaw
    ? patternsRaw.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  const workspacePath = getWorkspacePath();
  const problemService = new ProblemService(new FileProblemRepository(workspacePath));

  try {
    const problem = await problemService.createProblem({
      title: title.trim(),
      platform,
      difficulty,
      companies,
      patterns,
      status: 'not-started',
      favorite: false,
      url: url?.trim() || undefined,
    });

    redirect(`/problems/${problem.id}`);
  } catch (err: unknown) {
    // redirect() throws a special error in Next.js — rethrow it
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return { error: `Failed to create problem: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}
