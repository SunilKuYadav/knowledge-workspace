"use server";

import { redirect } from "next/navigation";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import type { Topic, Problem, SemanticDescription } from "@/src/types";

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
  formData: FormData,
): Promise<CreateTopicState> {
  const title = formData.get("title") as string;
  const category = formData.get("category") as Topic["category"];
  const difficulty = formData.get("difficulty") as Topic["difficulty"];
  const tagsRaw = formData.get("tags") as string;
  const prerequisitesRaw = formData.get("prerequisites") as string;
  const relatedTopicsRaw = formData.get("relatedTopics") as string;
  const estimatedMinutesRaw = formData.get("estimatedMinutes") as string;
  const overview = formData.get("overview") as string;
  const semanticDescriptionRaw = formData.get("semanticDescription") as string;

  if (!title || !title.trim()) {
    return { error: "Title is required." };
  }

  if (!category) {
    return { error: "Category is required." };
  }

  if (!difficulty) {
    return { error: "Difficulty is required." };
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const prerequisites = prerequisitesRaw
    ? prerequisitesRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const relatedTopics = relatedTopicsRaw
    ? relatedTopicsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const estimatedMinutes = estimatedMinutesRaw
    ? parseInt(estimatedMinutesRaw, 10)
    : undefined;

  let semanticDescription: SemanticDescription | undefined;
  if (semanticDescriptionRaw) {
    try {
      semanticDescription = JSON.parse(semanticDescriptionRaw);
    } catch {
      // Ignore invalid JSON — treat as no semantic description
    }
  }

  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));

  try {
    const topic = await topicService.createTopic({
      title: title.trim(),
      category,
      difficulty,
      status: "not-started",
      confidence: 1,
      tags,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      relatedTopics: relatedTopics.length > 0 ? relatedTopics : undefined,
      estimatedMinutes: estimatedMinutes || undefined,
      semanticDescription,
    });

    // If AI generated an overview, save it
    if (overview && overview.trim()) {
      const topicRepo = new FileTopicRepository(workspacePath);
      await topicRepo.saveContent(topic.id, "overview", overview.trim());
    }

    redirect(`/topics/${topic.id}`);
  } catch (err: unknown) {
    // redirect() throws a special error in Next.js — rethrow it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    // Next.js redirect throws with digest property
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    return {
      error: `Failed to create topic: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Server action to create a new problem from form data.
 * Validates required fields and delegates to ProblemService.
 */
export async function createProblem(
  _prevState: CreateProblemState,
  formData: FormData,
): Promise<CreateProblemState> {
  const title = formData.get("title") as string;
  const difficulty = formData.get("difficulty") as Problem["difficulty"];
  const companiesRaw = formData.get("companies") as string;
  const patternsRaw = formData.get("patterns") as string;
  const url = formData.get("url") as string;
  const relatedTopicIdsRaw = formData.get("relatedTopicIds") as string;
  const semanticDescriptionRaw = formData.get("semanticDescription") as string;

  if (!title || !title.trim()) {
    return { error: "Title is required." };
  }

  if (!difficulty) {
    return { error: "Difficulty is required." };
  }

  const companies = companiesRaw
    ? companiesRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const patterns = patternsRaw
    ? patternsRaw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const relatedTopicIds = relatedTopicIdsRaw
    ? relatedTopicIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  let semanticDescription: SemanticDescription | undefined;
  if (semanticDescriptionRaw) {
    try {
      semanticDescription = JSON.parse(semanticDescriptionRaw);
    } catch {
      // Ignore invalid JSON
    }
  }

  const workspacePath = getWorkspacePath();
  const problemService = new ProblemService(
    new FileProblemRepository(workspacePath),
  );

  try {
    const problem = await problemService.createProblem({
      title: title.trim(),
      difficulty,
      companies,
      patterns,
      status: "not-started",
      favorite: false,
      url: url?.trim() || undefined,
      relatedTopicIds: relatedTopicIds.length > 0 ? relatedTopicIds : undefined,
      semanticDescription,
    });

    redirect(`/problems/${problem.id}`);
  } catch (err: unknown) {
    // redirect() throws a special error in Next.js — rethrow it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    return {
      error: `Failed to create problem: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

// ─── Quick Create Topic (no redirect) ───────────────────────────────────────

export type QuickCreateTopicResult = {
  error?: string;
  topic?: { id: string; title: string };
};

/**
 * Server action to quickly create a topic without redirecting.
 * Used when AI suggests prerequisite topics and the user wants to
 * create them in-place before creating the main topic.
 */
export async function quickCreateTopic(
  title: string,
  category: Topic["category"],
  difficulty: Topic["difficulty"] = "medium",
): Promise<QuickCreateTopicResult> {
  if (!title || !title.trim()) {
    return { error: "Title is required." };
  }

  if (!category) {
    return { error: "Category is required." };
  }

  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));

  try {
    const topic = await topicService.createTopic({
      title: title.trim(),
      category,
      difficulty,
      status: "not-started",
      confidence: 1,
      tags: [],
    });

    return { topic: { id: topic.id, title: topic.title } };
  } catch (err: unknown) {
    return {
      error: `Failed to create topic: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
