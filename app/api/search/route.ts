import { NextRequest, NextResponse } from 'next/server';
import { ensureSearchIndexInitialized } from '@/src/search/init';
import { searchIndex } from '@/src/services/container';
import { search } from '@/src/search/query';
import type { SearchOptions } from '@/src/search/query';

/**
 * GET /api/search
 *
 * Accepts query params:
 *   - q: search query string (required)
 *   - type: optional filter ('topic' | 'problem' | 'note' | 'flashcard')
 *   - limit: optional max number of results (default 20)
 *
 * Returns JSON array of search results.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') as SearchOptions['filter'] | null;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  // Ensure search index is built (lazy initialization)
  await ensureSearchIndexInitialized();

  const options: SearchOptions = {
    query,
    limit,
  };

  if (type && ['topic', 'problem', 'note', 'flashcard'].includes(type)) {
    options.filter = type as SearchOptions['filter'];
  }

  const results = search(searchIndex, options);

  return NextResponse.json(results);
}
