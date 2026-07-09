import { Topic } from "@/types/Topic";
import { Problem } from "@/types/Problem";
import { Flashcard } from "@/types/Flashcard";
import { SearchDocument } from "./search-index";

/**
 * Content associated with a topic for indexing purposes.
 */
export interface TopicContent {
  topic: Topic;
  overview: string;
  notes: string;
}

/**
 * Content associated with a problem for indexing purposes.
 */
export interface ProblemContent {
  problem: Problem;
  notes: string;
}

/**
 * Convert Topics, Problems, and Flashcards into SearchDocument format
 * suitable for indexing in the search engine.
 */
export function buildSearchDocuments(
  topics: TopicContent[],
  problems: ProblemContent[],
  flashcards: Flashcard[],
): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const { topic, overview, notes } of topics) {
    documents.push({
      id: topic.id,
      type: "topic",
      title: topic.title,
      content: [overview, notes].filter(Boolean).join(" "),
      tags: topic.tags,
      path: `notes/${topic.category}/${topic.id}`,
    });
  }

  for (const { problem, notes } of problems) {
    documents.push({
      id: problem.id,
      type: "problem",
      title: problem.title,
      content: notes,
      tags: [...problem.patterns, ...problem.companies],
      path: `problems/${problem.id}`,
    });
  }

  for (const flashcard of flashcards) {
    documents.push({
      id: flashcard.id,
      type: "flashcard",
      title: flashcard.front,
      content: flashcard.back,
      tags: flashcard.tags,
      path: `flashcards/${flashcard.topicId}`,
    });
  }

  return documents;
}
