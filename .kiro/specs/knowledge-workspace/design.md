# Design Document

## Overview

This document describes the architecture and design for the Knowledge Workspace feature — an offline-first, file-driven personal knowledge management system for technical interview preparation. The system runs as a local Next.js application providing a rich web interface over a workspace directory of Markdown and JSON files, with local AI via Ollama, spaced repetition scheduling, full-text search, and Git auto-commit.

## Architecture

The system follows a layered architecture with clear separation between UI, application logic, and data access:

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (React)                    │
│  Dashboard │ Topic View │ Problem View │ Editor      │
│  AI Sidebar │ Revision Views                         │
├─────────────────────────────────────────────────────┤
│              Application Services                    │
│  TopicService │ ProblemService │ RevisionService     │
│  SearchService │ AIService │ GitService              │
├─────────────────────────────────────────────────────┤
│            Repository Interface Layer                 │
│  Repository<Topic> │ Repository<Problem>             │
│  Repository<Flashcard> │ Repository<Revision>        │
├─────────────────────────────────────────────────────┤
│              FileRepository (Implementation)          │
│  filesystem/ │ parser/ │ git/                         │
├─────────────────────────────────────────────────────┤
│              External Services                        │
│  Node.js fs │ Ollama (localhost:11434) │ Git CLI      │
└─────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Types Layer (`types/`)

Core domain types shared across all layers.

```typescript
// types/Topic.ts
interface Topic {
  id: string;
  title: string;
  category: 'dsa' | 'system-design' | 'database' | 'networking' | 'os' | 'oop';
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'not-started' | 'in-progress' | 'completed';
  confidence: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// types/Problem.ts
interface Problem {
  id: string;
  title: string;
  platform: 'leetcode' | 'codeforces' | 'gfg';
  difficulty: 'easy' | 'medium' | 'hard';
  companies: string[];
  patterns: string[];
  status: 'not-started' | 'attempted' | 'solved';
  favorite: boolean;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

// types/Revision.ts
interface RevisionEntry {
  id: string;
  date: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

interface RevisionData {
  itemId: string;
  itemType: 'topic' | 'problem';
  lastReviewed: string | null;
  nextReview: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  history: RevisionEntry[];
}

// types/Flashcard.ts
interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  topicId: string;
  createdAt: string;
}

interface FlashcardDeck {
  topicId: string;
  cards: Flashcard[];
}
```

### 2. Repository Interface (`repository/`)

Abstract data access interface enabling implementation swapping.

```typescript
// repository/Repository.ts
interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// repository/TopicRepository.ts
interface TopicRepository extends Repository<Topic> {
  getContent(id: string, file: 'overview' | 'notes' | 'patterns' | 'mistakes'): Promise<string>;
  saveContent(id: string, file: 'overview' | 'notes' | 'patterns' | 'mistakes', content: string): Promise<void>;
  getFlashcards(id: string): Promise<FlashcardDeck>;
  getRevision(id: string): Promise<RevisionData>;
}

// repository/ProblemRepository.ts
interface ProblemRepository extends Repository<Problem> {
  getNotes(id: string): Promise<string>;
  saveNotes(id: string, content: string): Promise<void>;
  getSolution(id: string): Promise<string>;
  saveSolution(id: string, content: string): Promise<void>;
  getRevision(id: string): Promise<RevisionData>;
}

// repository/RevisionRepository.ts
interface RevisionRepository {
  getDueItems(currentDate: string): Promise<RevisionData[]>;
  updateRevision(itemId: string, itemType: 'topic' | 'problem', entry: RevisionEntry): Promise<RevisionData>;
  getHistory(itemId: string): Promise<RevisionEntry[]>;
}
```

### 3. Filesystem Layer (`filesystem/`)

Implements the repository interfaces using Node.js `fs` via Next.js server actions and API routes.

```typescript
// filesystem/workspace.ts
const WORKSPACE_STRUCTURE = {
  notes: ['dsa', 'system-design', 'database', 'networking', 'os', 'oop'],
  problems: ['leetcode', 'codeforces', 'gfg'],
  root: ['templates', 'revision', 'flashcards', 'assets']
} as const;

function getWorkspacePath(): string;
function ensureDirectoryExists(dirPath: string): Promise<void>;
function listDirectories(basePath: string): Promise<string[]>;
function readJsonFile<T>(filePath: string): Promise<T | null>;
function writeJsonFile<T>(filePath: string, data: T): Promise<void>;
function readMarkdownFile(filePath: string): Promise<string>;
function writeMarkdownFile(filePath: string, content: string): Promise<void>;

// filesystem/notes.ts
class FileTopicRepository implements TopicRepository {
  private basePath: string;
  
  constructor(workspacePath: string);
  
  async getAll(): Promise<Topic[]>;
  async getById(id: string): Promise<Topic | null>;
  async create(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic>;
  async update(id: string, data: Partial<Topic>): Promise<Topic>;
  async delete(id: string): Promise<void>;
  async getContent(id: string, file: string): Promise<string>;
  async saveContent(id: string, file: string, content: string): Promise<void>;
  async getFlashcards(id: string): Promise<FlashcardDeck>;
  async getRevision(id: string): Promise<RevisionData>;
}

// filesystem/problem.ts
class FileProblemRepository implements ProblemRepository {
  private basePath: string;
  
  constructor(workspacePath: string);
  
  async getAll(): Promise<Problem[]>;
  async getById(id: string): Promise<Problem | null>;
  async create(data: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Problem>;
  async update(id: string, data: Partial<Problem>): Promise<Problem>;
  async delete(id: string): Promise<void>;
  async getNotes(id: string): Promise<string>;
  async saveNotes(id: string, content: string): Promise<void>;
  async getSolution(id: string): Promise<string>;
  async saveSolution(id: string, content: string): Promise<void>;
  async getRevision(id: string): Promise<RevisionData>;
}
```

### 4. Parser Layer (`parser/`)

Handles parsing and serialization of workspace file formats.

```typescript
// parser/frontmatter.ts
interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  content: string;
}

function parseMarkdownWithFrontmatter(raw: string): ParsedMarkdown;
function serializeMarkdownWithFrontmatter(data: ParsedMarkdown): string;

// parser/json.ts
function parseJsonSafe<T>(raw: string, schema: ZodSchema<T>): T | null;
function serializeJson<T>(data: T): string;

// parser/tags.ts
function extractTags(content: string): string[];
function extractCodeBlocks(content: string): { language: string; code: string }[];

// parser/markdown.ts
function renderMarkdownToHtml(markdown: string): string;
function extractHeadings(markdown: string): { level: number; text: string }[];
```

### 5. Search Layer (`search/`)

In-memory full-text search using MiniSearch or FlexSearch.

```typescript
// search/index.ts
interface SearchDocument {
  id: string;
  type: 'topic' | 'problem' | 'note' | 'flashcard';
  title: string;
  content: string;
  tags: string[];
  path: string;
}

interface SearchIndex {
  buildIndex(documents: SearchDocument[]): void;
  addDocument(doc: SearchDocument): void;
  updateDocument(doc: SearchDocument): void;
  removeDocument(id: string): void;
}

// search/query.ts
interface SearchResult {
  id: string;
  type: 'topic' | 'problem' | 'note' | 'flashcard';
  title: string;
  snippet: string;
  score: number;
  path: string;
}

interface SearchOptions {
  query: string;
  filter?: 'topic' | 'problem' | 'note' | 'flashcard';
  limit?: number;
}

function search(index: SearchIndex, options: SearchOptions): SearchResult[];
```

### 6. Revision Layer (`revision/`)

Spaced repetition scheduling engine.

```typescript
// revision/scheduler.ts
interface SchedulerInput {
  currentConfidence: 1 | 2 | 3 | 4 | 5;
  previousInterval: number; // days since last review
  reviewDate: string; // ISO date string
}

interface SchedulerOutput {
  nextReview: string; // ISO date string
  intervalDays: number;
}

function computeNextReview(input: SchedulerInput): SchedulerOutput;

// revision/confidence.ts
function calculateInterval(confidence: 1 | 2 | 3 | 4 | 5, previousInterval: number): number;

// revision/spaced.ts
type RevisionCategory = 'overdue' | 'due-today' | 'upcoming';

function categorizeRevisionItem(nextReview: string, currentDate: string): RevisionCategory;
function getDueItems(items: RevisionData[], currentDate: string): RevisionData[];
function sortByPriority(items: RevisionData[], currentDate: string): RevisionData[];

// revision/history.ts
function addRevisionEntry(current: RevisionData, entry: RevisionEntry): RevisionData;
function getConfidenceTrend(history: RevisionEntry[]): { date: string; confidence: number }[];
```

### 7. AI Layer (`ai/`)

Communicates with Ollama for content generation with graceful degradation.

```typescript
// ai/client.ts
interface OllamaClient {
  isAvailable(): Promise<boolean>;
  generate(prompt: string, model?: string): AsyncGenerator<string>;
}

function createOllamaClient(baseUrl: string): OllamaClient;

// ai/summarize.ts
function generateSummary(content: string, client: OllamaClient): AsyncGenerator<string>;

// ai/generateQuiz.ts
interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function generateQuiz(content: string, client: OllamaClient): Promise<QuizQuestion[]>;

// ai/generateFlashcards.ts
function generateFlashcards(content: string, client: OllamaClient): Promise<Flashcard[]>;

// ai/explain.ts
function explainConcept(concept: string, context: string, client: OllamaClient): AsyncGenerator<string>;
function suggestSimilarProblems(problem: Problem, client: OllamaClient): Promise<string[]>;
function generateInterviewPrep(problem: Problem, client: OllamaClient): AsyncGenerator<string>;
```

### 8. Git Layer (`git/`)

Automatic version control on every save.

```typescript
// git/service.ts
interface GitService {
  isInitialized(): Promise<boolean>;
  initialize(): Promise<void>;
  commitFile(filePath: string, message: string): Promise<void>;
}

// git/commit.ts
type GitAction = 'create' | 'update' | 'delete';

function generateCommitMessage(action: GitAction, filePath: string, itemTitle?: string): string;
function executeGitAdd(filePath: string): Promise<void>;
function executeGitCommit(message: string): Promise<void>;
```

### 9. UI Components

#### Dashboard (`app/page.tsx`)
- Displays summary stats: total topics, total problems, items due for review
- Lists items due for revision today sorted by priority (overdue first)
- Shows statistics: problems by difficulty, topics by confidence, study streak
- Links to Topic and Problem detail views

#### Topic View (`app/topics/[id]/page.tsx`)
- Renders topic metadata (title, difficulty, status, confidence, tags)
- Tabbed content: overview, notes, patterns, mistakes
- Displays flashcards, revision history, associated problems
- Edit button opens Markdown Editor for selected file
- AI Sidebar panel for generating summaries, quizzes, flashcards

#### Problem View (`app/problems/[id]/page.tsx`)
- Renders problem metadata (title, platform, difficulty, companies, patterns, status, favorite)
- Displays notes and solution files
- Revision history and confidence trend chart
- Edit button opens Markdown Editor for notes/solution
- AI Sidebar for interview prep, similar problems, explanations

#### Markdown Editor (`components/MarkdownEditor.tsx`)
- Formatting toolbar: headings, bold, italic, code blocks, lists, links, images
- Live preview pane rendering Markdown to HTML
- Syntax highlighting for code blocks (Python, Java, C++, JavaScript, TypeScript)
- Save action writes raw Markdown via server action, triggers Git commit

#### AI Sidebar (`components/AISidebar.tsx`)
- Contextual actions based on current view (Topic or Problem)
- Loading indicator with streaming response display
- Save-to-file option when generation completes
- Disabled state with message when Ollama is unreachable

#### Revision Views (`app/revision/page.tsx`)
- Review session: presents items one at a time, reveal answer, rate confidence
- Schedule view: items grouped by overdue, due today, upcoming
- History view: past sessions, confidence trends, upcoming reviews

## Data Models

### Workspace Directory Structure

```
knowledge-workspace/
├── notes/
│   ├── dsa/
│   │   └── {topic-slug}/
│   │       ├── topic.json
│   │       ├── overview.md
│   │       ├── notes.md
│   │       ├── patterns.md
│   │       ├── mistakes.md
│   │       ├── flashcards.json
│   │       └── revision.json
│   ├── system-design/
│   ├── database/
│   ├── networking/
│   ├── os/
│   └── oop/
├── problems/
│   ├── leetcode/
│   │   └── {problem-slug}/
│   │       ├── problem.json
│   │       ├── notes.md
│   │       ├── solution.md
│   │       └── revision.json
│   ├── codeforces/
│   └── gfg/
├── templates/
│   ├── topic-template.json
│   ├── problem-template.json
│   └── revision-template.json
├── flashcards/
├── revision/
├── assets/
└── .git/
```

### JSON Schemas

**topic.json**
```json
{
  "id": "binary-trees",
  "title": "Binary Trees",
  "category": "dsa",
  "difficulty": "medium",
  "status": "in-progress",
  "confidence": 3,
  "tags": ["trees", "recursion", "dfs", "bfs"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z"
}
```

**problem.json**
```json
{
  "id": "two-sum",
  "title": "Two Sum",
  "platform": "leetcode",
  "difficulty": "easy",
  "companies": ["Google", "Amazon", "Meta"],
  "patterns": ["hash-map", "two-pointers"],
  "status": "solved",
  "favorite": true,
  "url": "https://leetcode.com/problems/two-sum/",
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-18T16:00:00Z"
}
```

**revision.json**
```json
{
  "itemId": "binary-trees",
  "itemType": "topic",
  "lastReviewed": "2024-01-20T14:30:00Z",
  "nextReview": "2024-01-25T00:00:00Z",
  "confidence": 3,
  "history": [
    {
      "id": "rev-001",
      "date": "2024-01-15T10:00:00Z",
      "confidence": 2,
      "notes": "Need to review traversal patterns"
    },
    {
      "id": "rev-002",
      "date": "2024-01-20T14:30:00Z",
      "confidence": 3,
      "notes": "Better understanding of BFS vs DFS"
    }
  ]
}
```

**flashcards.json**
```json
{
  "topicId": "binary-trees",
  "cards": [
    {
      "id": "fc-001",
      "front": "What is the time complexity of finding an element in a BST?",
      "back": "O(log n) average case, O(n) worst case for unbalanced tree",
      "tags": ["bst", "complexity"],
      "topicId": "binary-trees",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Error Handling

### Strategy

All errors are handled at the layer boundary and transformed into user-friendly responses:

1. **Filesystem Errors**: The `FileRepository` catches `fs` errors (ENOENT, EACCES, ENOSPC) and returns typed error responses. Missing files return empty content (not errors) per requirement 1.4.

2. **AI Service Errors**: Connection failures to Ollama result in graceful degradation — AI features are disabled, non-AI features continue unaffected. The `OllamaClient` maintains a reactive availability state.

3. **Git Errors**: Git failures are logged but never block file save operations. The `GitService` wraps all operations in try-catch and reports failures asynchronously.

4. **Search Index Errors**: Malformed file content that cannot be indexed is skipped with a warning logged. The index continues serving results from successfully indexed files.

5. **JSON Parse Errors**: Invalid JSON in metadata files returns `null` from `parseJsonSafe`, and the UI displays a "repair needed" indicator.

### Error Types

```typescript
type FilesystemError = {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'DISK_FULL' | 'UNKNOWN';
  message: string;
  path: string;
};

type AIError = {
  code: 'OLLAMA_UNREACHABLE' | 'GENERATION_FAILED' | 'TIMEOUT';
  message: string;
};

type GitError = {
  code: 'NOT_INITIALIZED' | 'COMMIT_FAILED' | 'ADD_FAILED';
  message: string;
  filePath: string;
};
```

## Key Design Decisions

1. **File-first data model**: All data lives as Markdown + JSON in the workspace directory. The app is a view layer; the directory IS the product. Users can edit files directly outside the app.

2. **Repository pattern**: Abstract `Repository` interface with `FileRepository` implementation. Services depend on the interface, not the concrete class. This allows testing with in-memory implementations.

3. **Server actions for file I/O**: Next.js server actions handle all filesystem operations. No client-side code touches `fs`. This keeps the security boundary clear.

4. **In-memory search index**: Built at startup from workspace files, updated incrementally on saves. Avoids external search infrastructure while providing fast full-text search.

5. **Spaced repetition as pure functions**: The scheduling algorithm (`computeNextReview`, `calculateInterval`, `categorizeRevisionItem`) is implemented as pure functions with no side effects, making them highly testable.

6. **AI as optional enhancement**: The app is fully functional without Ollama. AI features are additive — they generate files that then become part of the workspace like any other content.

7. **Git as audit trail**: Every save triggers an auto-commit. Git operations never block saves — failures are logged and the save completes regardless.

8. **Slug-based IDs**: Topic and problem IDs are URL-safe slugs derived from titles (e.g., "Binary Trees" → "binary-trees"). These map directly to folder names on disk.

## Testing Strategy

### Unit Tests
- Repository implementations: verify CRUD operations with in-memory filesystem mocks
- Parser functions: verify frontmatter parsing, JSON serialization, tag extraction
- Revision scheduler: verify interval calculations, date computations, categorization
- Git commit message generation: verify format correctness
- Search query logic: verify filtering and result formatting

### Property-Based Tests
- Round-trip properties for all serialization (JSON, Markdown, frontmatter)
- Spaced repetition algorithm invariants (monotonicity, valid dates)
- Search index correctness (indexed content is findable, filters work)
- Directory structure mapping (category/platform → correct path)
- Statistics aggregation (counts sum correctly)

### Integration Tests
- File I/O operations against real filesystem (temp directories)
- Git operations against real git repository
- Ollama connectivity and response handling (when available)
- Full search pipeline: index build → query → results

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Topic metadata round-trip

*For any* valid Topic object, writing it to `topic.json` via `FileTopicRepository.update()` and then reading it back via `FileTopicRepository.getById()` SHALL produce an object equal to the original.

**Validates: Requirements 1.2, 2.1**

### Property 2: Problem metadata round-trip

*For any* valid Problem object, writing it to `problem.json` via `FileProblemRepository.update()` and then reading it back via `FileProblemRepository.getById()` SHALL produce an object equal to the original.

**Validates: Requirements 1.3, 2.2**

### Property 3: Markdown content round-trip

*For any* valid Markdown string, writing it via `saveContent()` and then reading it back via `getContent()` SHALL produce a string equal to the original.

**Validates: Requirements 2.1, 2.2, 12.3**

### Property 4: Entity creation produces all required files

*For any* valid Topic creation input, calling `FileTopicRepository.create()` SHALL result in the existence of `topic.json`, `overview.md`, `notes.md`, `patterns.md`, and `mistakes.md` in the created folder. Similarly, *for any* valid Problem creation input, calling `FileProblemRepository.create()` SHALL result in the existence of `problem.json`, `notes.md`, and a solution file.

**Validates: Requirements 2.3, 2.4**

### Property 5: Content placed in correct subdirectory

*For any* Topic with a category value, creating or reading that Topic SHALL use a path within the corresponding subdirectory (e.g., category "dsa" maps to `notes/dsa/`). *For any* Problem with a platform value, the path SHALL be within the corresponding subdirectory (e.g., platform "leetcode" maps to `problems/leetcode/`).

**Validates: Requirements 3.1, 3.2**

### Property 6: Search index contains indexed content

*For any* document added to the Search Index, a search query containing a unique term from that document's title or content SHALL return that document in the results.

**Validates: Requirements 4.1, 4.2**

### Property 7: Incremental index update reflects new content

*For any* document in the Search Index, after updating that document's content and calling `updateDocument()`, a search for a unique term from the new content SHALL return the document, and a search for a unique term only in the old content SHALL NOT return it.

**Validates: Requirements 4.3**

### Property 8: Search filter returns only matching type

*For any* search query with a type filter applied, all returned results SHALL have a `type` field matching the specified filter value.

**Validates: Requirements 4.4**

### Property 9: Spaced repetition interval monotonicity

*For any* two confidence levels where `c1 < c2`, `calculateInterval(c1, interval)` SHALL return a value less than or equal to `calculateInterval(c2, interval)` for the same previous interval. Higher confidence always produces equal or longer intervals.

**Validates: Requirements 7.4**

### Property 10: Revision scheduling produces valid future date

*For any* valid `SchedulerInput` (confidence 1-5, positive previousInterval, valid reviewDate), `computeNextReview()` SHALL return a `nextReview` date that is strictly after the `reviewDate`, and the revision history SHALL contain the new entry.

**Validates: Requirements 7.1, 15.2**

### Property 11: Revision due date categorization

*For any* RevisionData item and current date, `categorizeRevisionItem()` SHALL return "overdue" if `nextReview < currentDate`, "due-today" if `nextReview == currentDate`, and "upcoming" if `nextReview > currentDate`. Additionally, `getDueItems()` SHALL return exactly those items where the category is "overdue" or "due-today".

**Validates: Requirements 7.3, 7.5**

### Property 12: Commit message contains action and path

*For any* GitAction ("create", "update", "delete") and any file path string, `generateCommitMessage()` SHALL produce a string that contains both the action type and the file path.

**Validates: Requirements 8.2**

### Property 13: Dashboard revision items sorted by priority

*For any* list of RevisionData items with mixed categories, `sortByPriority()` SHALL return a list where all "overdue" items appear before "due-today" items, and all "due-today" items appear before "upcoming" items.

**Validates: Requirements 9.2**

### Property 14: Statistics aggregation correctness

*For any* set of Problems with difficulty values, counting problems grouped by difficulty SHALL produce counts that sum to the total number of problems. *For any* set of Topics with confidence values, counting topics grouped by confidence SHALL produce counts that sum to the total number of topics.

**Validates: Requirements 9.3**

### Property 15: JSON metadata parsing round-trip

*For any* valid Topic or Problem JSON object, `serializeJson(obj)` followed by `parseJsonSafe(serialized, schema)` SHALL produce an object equal to the original.

**Validates: Requirements 1.1**
