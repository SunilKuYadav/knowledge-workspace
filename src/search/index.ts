export { SearchIndex } from './search-index';
export type { SearchDocument } from './search-index';

export { search } from './query';
export type { SearchResult, SearchOptions } from './query';

export { buildSearchDocuments } from './builder';
export type { TopicContent, ProblemContent } from './builder';

export { ensureSearchIndexInitialized, updateSearchForFile } from './init';
