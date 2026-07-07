import MiniSearch from "minisearch";

/**
 * Represents a document that can be indexed and searched.
 */
export interface SearchDocument {
  id: string;
  type: "topic" | "problem" | "note" | "flashcard";
  title: string;
  content: string;
  tags: string[];
  path: string;
}

/**
 * SearchIndex wraps MiniSearch to provide full-text search over workspace documents.
 * Supports building an index from scratch, and incremental add/update/remove operations.
 */
export class SearchIndex {
  private miniSearch: MiniSearch<SearchDocument>;

  constructor() {
    this.miniSearch = this.createInstance();
  }

  /**
   * Build (or rebuild) the index from a full set of documents.
   * Replaces any existing index content.
   */
  buildIndex(documents: SearchDocument[]): void {
    this.miniSearch = this.createInstance();
    this.miniSearch.addAll(documents);
  }

  /**
   * Add a single document to the index.
   */
  addDocument(doc: SearchDocument): void {
    this.miniSearch.add(doc);
  }

  /**
   * Update a document in the index.
   * MiniSearch requires remove then re-add for updates.
   */
  updateDocument(doc: SearchDocument): void {
    this.miniSearch.discard(doc.id);
    this.miniSearch.add(doc);
  }

  /**
   * Remove a document from the index by ID.
   */
  removeDocument(id: string): void {
    this.miniSearch.discard(id);
  }

  /**
   * Expose the underlying MiniSearch instance for querying.
   */
  getEngine(): MiniSearch<SearchDocument> {
    return this.miniSearch;
  }

  private createInstance(): MiniSearch<SearchDocument> {
    return new MiniSearch<SearchDocument>({
      fields: ["title", "content", "tags"],
      storeFields: ["title", "type", "path", "content"],
      extractField: (doc, fieldName) => {
        if (fieldName === "tags") {
          return (doc as SearchDocument).tags.join(" ");
        }
        return (doc as unknown as Record<string, string>)[fieldName];
      },
    });
  }
}
