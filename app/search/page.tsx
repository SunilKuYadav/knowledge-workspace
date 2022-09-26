'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'topic' | 'problem' | 'note' | 'flashcard';
  title: string;
  snippet: string;
  score: number;
  path: string;
}

type TypeFilter = '' | 'topic' | 'problem' | 'note' | 'flashcard';

/**
 * Search page with real-time debounced search, type filter dropdown,
 * and results list with links to items.
 */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async (q: string, type: TypeFilter) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (type) params.set('type', type);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setResults(data);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on query/filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, filter);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter, fetchResults]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>
          <Link
            href="/"
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Search Controls */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, problems, flashcards..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Search query"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TypeFilter)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Filter by type"
          >
            <option value="">All Types</option>
            <option value="topic">Topics</option>
            <option value="problem">Problems</option>
            <option value="flashcard">Flashcards</option>
          </select>
        </div>

        {/* Loading indicator */}
        {loading && (
          <p className="mb-4 text-sm text-gray-500">Searching...</p>
        )}

        {/* Results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <p className="text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
        )}

        {results.length > 0 && (
          <ul className="space-y-4" role="list" aria-label="Search results">
            {results.map((result) => (
              <li key={result.id}>
                <Link
                  href={getResultLink(result)}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <TypeBadge type={result.type} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {result.title}
                      </h2>
                      {result.snippet && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {result.snippet}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">{result.path}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Hint when no query */}
        {query.length < 2 && !loading && results.length === 0 && (
          <p className="text-gray-400 text-center mt-12">
            Type at least 2 characters to start searching
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Returns the link URL for a search result based on its type.
 */
function getResultLink(result: SearchResult): string {
  switch (result.type) {
    case 'topic':
      return `/topics/${result.id}`;
    case 'problem':
      return `/problems/${result.id}`;
    case 'flashcard':
      return `/topics/${result.path.replace('flashcards/', '')}`;
    default:
      return `/topics/${result.id}`;
  }
}

/**
 * Displays a colored badge for the content type.
 */
function TypeBadge({ type }: { type: SearchResult['type'] }) {
  const styles: Record<string, string> = {
    topic: 'bg-blue-100 text-blue-800',
    problem: 'bg-green-100 text-green-800',
    note: 'bg-yellow-100 text-yellow-800',
    flashcard: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}
    >
      {type}
    </span>
  );
}
