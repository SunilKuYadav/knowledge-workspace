import {
  searchIndex,
  topicRepository,
  problemRepository,
} from "@/src/services/container";
import { buildSearchDocuments } from "./builder";
import type { SearchDocument } from "./search-index";

/**
 * Lazy initialization state for the search index.
 * The index is built on first search request rather than at app startup.
 */
let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Ensures the search index is initialized.
 * Uses lazy initialization — builds the index from all workspace files
 * on the first call, then resolves immediately on subsequent calls.
 */
export async function ensureSearchIndexInitialized(): Promise<void> {
  if (initialized) return;

  if (!initPromise) {
    initPromise = buildFullIndex();
  }

  await initPromise;
}

/**
 * Builds the full search index from all workspace topics, problems, and flashcards.
 */
async function buildFullIndex(): Promise<void> {
  try {
    // Load all topics with their content
    const topics = await topicRepository.getAll();
    const topicContents = await Promise.all(
      topics.map(async (topic) => ({
        topic,
        overview: await topicRepository.getContent(topic.id, "overview"),
        notes: await topicRepository.getContent(topic.id, "notes"),
      })),
    );

    // Load all problems with their notes
    const problems = await problemRepository.getAll();
    const problemContents = await Promise.all(
      problems.map(async (problem) => ({
        problem,
        notes: await problemRepository.getNotes(problem.id),
      })),
    );

    // Load all flashcards from all topics
    const allFlashcards = (
      await Promise.all(
        topics.map(async (topic) => {
          const deck = await topicRepository.getFlashcards(topic.id);
          return deck.cards;
        }),
      )
    ).flat();

    // Build documents and index them
    const documents = buildSearchDocuments(
      topicContents,
      problemContents,
      allFlashcards,
    );
    searchIndex.buildIndex(documents);
    initialized = true;
  } catch (error) {
    // Reset so next call retries
    initPromise = null;
    throw error;
  }
}

/**
 * Updates the search index for a single file after it has been saved.
 * This is an incremental update — only the specified document is re-indexed.
 */
export function updateSearchForFile(
  id: string,
  type: "topic" | "problem" | "note" | "flashcard",
  title: string,
  content: string,
  tags: string[],
  path: string,
): void {
  const doc: SearchDocument = { id, type, title, content, tags, path };
  searchIndex.updateDocument(doc);
}
