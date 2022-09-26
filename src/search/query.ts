import { SearchIndex, SearchDocument } from './search-index';

/**
 * A single search result with relevance score and snippet.
 */
export interface SearchResult {
  id: string;
  type: 'topic' | 'problem' | 'note' | 'flashcard';
  title: string;
  snippet: string;
  score: number;
  path: string;
}

/**
 * Options for performing a search query.
 */
export interface SearchOptions {
  query: string;
  filter?: 'topic' | 'problem' | 'note' | 'flashcard';
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const SNIPPET_LENGTH = 150;

/**
 * Search the index with the given options.
 * Results are sorted by relevance score (MiniSearch default).
 * Supports optional type filtering and result limit.
 */
export function search(index: SearchIndex, options: SearchOptions): SearchResult[] {
  const { query, filter, limit = DEFAULT_LIMIT } = options;

  if (!query.trim()) {
    return [];
  }

  const rawResults = index.getEngine().search(query, {
    prefix: true,
    fuzzy: 0.2,
  });

  let results = rawResults.map((result) => ({
    id: result.id as string,
    type: (result as unknown as SearchDocument).type,
    title: (result as unknown as SearchDocument).title,
    snippet: createSnippet((result as unknown as SearchDocument).content),
    score: result.score,
    path: (result as unknown as SearchDocument).path,
  }));

  if (filter) {
    results = results.filter((r) => r.type === filter);
  }

  return results.slice(0, limit);
}

/**
 * Create a text snippet from content, taking the first N characters.
 */
function createSnippet(content: string | undefined): string {
  if (!content) return '';
  const trimmed = content.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed;
  return trimmed.slice(0, SNIPPET_LENGTH) + '...';
}
