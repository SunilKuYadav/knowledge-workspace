import type { SearchIndex, SearchDocument } from "@/search";
import type { SearchOptions, SearchResult } from "@/search";
import { search } from "@/search";
import { buildSearchDocuments, TopicContent, ProblemContent } from "@/search";
import type { Flashcard } from "@/types";

/**
 * Application service for search operations.
 * Wraps the SearchIndex to provide a clean interface for the UI layer.
 */
export class SearchService {
  constructor(private readonly index: SearchIndex) {}

  /**
   * Builds (or rebuilds) the search index from workspace content.
   */
  buildIndex(
    topics: TopicContent[],
    problems: ProblemContent[],
    flashcards: Flashcard[],
  ): void {
    const documents = buildSearchDocuments(topics, problems, flashcards);
    this.index.buildIndex(documents);
  }

  /**
   * Performs a search query against the index.
   */
  search(options: SearchOptions): SearchResult[] {
    return search(this.index, options);
  }

  /**
   * Updates a single document in the index.
   */
  updateDocument(doc: SearchDocument): void {
    this.index.updateDocument(doc);
  }

  /**
   * Removes a document from the index by ID.
   */
  removeDocument(id: string): void {
    this.index.removeDocument(id);
  }
}
