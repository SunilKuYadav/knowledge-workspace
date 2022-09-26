# Implementation Plan: Knowledge Workspace

## Overview

This plan implements the Knowledge Workspace — an offline-first, file-driven knowledge management system using Next.js. The implementation follows the layered architecture: Types → Repository Interface → Parser → Filesystem → Search → Revision → AI → Git → UI. Each layer builds on the previous.

## Tasks

- [x] 1. Project scaffolding and types layer
  - [x] 1.1 Initialize Next.js project with TypeScript and configure workspace structure
    - Create Next.js app with App Router, TypeScript, Tailwind CSS
    - Configure `tsconfig.json` path aliases for `@/types`, `@/repository`, `@/filesystem`, `@/parser`, `@/search`, `@/revision`, `@/ai`, `@/git`
    - Add dependencies: `zod`, `minisearch`, `gray-matter`, `react-markdown`, `remark-gfm`, `uuid`
    - Create the workspace directory structure constants in `src/lib/constants.ts`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.2 Define core domain types
    - Create `src/types/Topic.ts` with Topic interface and Zod schema
    - Create `src/types/Problem.ts` with Problem interface and Zod schema
    - Create `src/types/Revision.ts` with RevisionEntry and RevisionData interfaces and Zod schemas
    - Create `src/types/Flashcard.ts` with Flashcard and FlashcardDeck interfaces and Zod schemas
    - Create `src/types/errors.ts` with FilesystemError, AIError, and GitError types
    - Create `src/types/index.ts` barrel export
    - _Requirements: 1.1, 1.2, 1.3, 14.1_

  - [x] 1.3 Define repository interfaces
    - Create `src/repository/Repository.ts` with generic `Repository<T>` interface (getAll, getById, create, update, delete)
    - Create `src/repository/TopicRepository.ts` extending Repository with getContent, saveContent, getFlashcards, getRevision
    - Create `src/repository/ProblemRepository.ts` extending Repository with getNotes, saveNotes, getSolution, saveSolution, getRevision
    - Create `src/repository/RevisionRepository.ts` with getDueItems, updateRevision, getHistory
    - Create `src/repository/index.ts` barrel export
    - _Requirements: 14.1, 14.3_

- [x] 2. Parser layer
  - [x] 2.1 Implement parser utilities
    - Create `src/parser/frontmatter.ts` with `parseMarkdownWithFrontmatter()` and `serializeMarkdownWithFrontmatter()` using gray-matter
    - Create `src/parser/json.ts` with `parseJsonSafe<T>()` using Zod validation and `serializeJson<T>()`
    - Create `src/parser/tags.ts` with `extractTags()` and `extractCodeBlocks()`
    - Create `src/parser/markdown.ts` with `renderMarkdownToHtml()` and `extractHeadings()`
    - Create `src/parser/index.ts` barrel export
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Filesystem layer implementation
  - [x] 3.1 Implement workspace filesystem utilities
    - Create `src/filesystem/workspace.ts` with `getWorkspacePath()`, `ensureDirectoryExists()`, `listDirectories()`, `readJsonFile<T>()`, `writeJsonFile<T>()`, `readMarkdownFile()`, `writeMarkdownFile()`
    - Implement error handling returning typed FilesystemError for ENOENT, EACCES, ENOSPC
    - Implement missing file handling: return empty string for missing Markdown, null for missing JSON (no error thrown)
    - _Requirements: 1.4, 2.5, 3.4_

  - [x] 3.2 Implement FileTopicRepository
    - Create `src/filesystem/FileTopicRepository.ts` implementing TopicRepository interface
    - Implement `getAll()` scanning `notes/{category}/{slug}/topic.json` across all category subdirectories
    - Implement `getById()` locating topic by slug across category directories
    - Implement `create()` generating slug ID, creating folder with topic.json, overview.md, notes.md, patterns.md, mistakes.md from templates
    - Implement `update()` merging partial data with existing topic.json
    - Implement `delete()` removing the topic folder
    - Implement `getContent()`, `saveContent()`, `getFlashcards()`, `getRevision()`
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 14.2_

  - [x] 3.3 Implement FileProblemRepository
    - Create `src/filesystem/FileProblemRepository.ts` implementing ProblemRepository interface
    - Implement `getAll()` scanning `problems/{platform}/{slug}/problem.json` across all platform subdirectories
    - Implement `getById()` locating problem by slug across platform directories
    - Implement `create()` generating slug ID, creating folder with problem.json, notes.md, solution.md
    - Implement `update()` merging partial data with existing problem.json
    - Implement `delete()` removing the problem folder
    - Implement `getNotes()`, `saveNotes()`, `getSolution()`, `saveSolution()`, `getRevision()`
    - _Requirements: 1.1, 1.3, 2.2, 2.4, 14.2_

- [x] 4. Checkpoint - Core data layer
  - Verify core data layer works end-to-end, ask the user if questions arise.

- [x] 5. Revision scheduling layer
  - [x] 5.1 Implement spaced repetition scheduler
    - Create `src/revision/scheduler.ts` with `computeNextReview(input: SchedulerInput): SchedulerOutput`
    - Create `src/revision/confidence.ts` with `calculateInterval(confidence, previousInterval)` implementing interval multipliers: conf 1 → 0.5x, conf 2 → 1x, conf 3 → 2x, conf 4 → 3x, conf 5 → 5x
    - Create `src/revision/spaced.ts` with `categorizeRevisionItem()`, `getDueItems()`, `sortByPriority()`
    - Create `src/revision/history.ts` with `addRevisionEntry()` and `getConfidenceTrend()`
    - Create `src/revision/index.ts` barrel export
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [x] 5.2 Implement FileRevisionRepository
    - Create `src/filesystem/FileRevisionRepository.ts` implementing RevisionRepository interface
    - Implement `getDueItems()` scanning all revision.json files and filtering by current date
    - Implement `updateRevision()` calling scheduler, writing updated revision.json
    - Implement `getHistory()` reading revision.json history array
    - _Requirements: 7.1, 7.2, 7.3, 15.2_

- [x] 6. Search layer
  - [x] 6.1 Implement search index and query engine
    - Create `src/search/index.ts` with SearchIndex class using MiniSearch: `buildIndex()`, `addDocument()`, `updateDocument()`, `removeDocument()`
    - Create `src/search/query.ts` with `search()` function supporting query string, type filter, and limit options
    - Create `src/search/builder.ts` with `buildSearchDocuments()` that converts Topics, Problems, and Flashcards into SearchDocument format
    - Create `src/search/index-barrel.ts` barrel export
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Git layer
  - [x] 7.1 Implement Git service
    - Create `src/git/service.ts` with `GitService` class: `isInitialized()`, `initialize()`, `commitFile()`
    - Create `src/git/commit.ts` with `generateCommitMessage()`, `executeGitAdd()`, `executeGitCommit()` using child_process.exec
    - Implement error handling: log git failures, never block file saves
    - Implement auto-init: check for .git directory, run git init if absent
    - Create `src/git/index.ts` barrel export
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 8. AI layer
  - [x] 8.1 Implement Ollama client and AI service
    - Create `src/ai/client.ts` with `createOllamaClient()` checking connectivity at localhost:11434, returning `isAvailable()` and `generate()` AsyncGenerator
    - Create `src/ai/summarize.ts` with `generateSummary()` streaming function
    - Create `src/ai/generateQuiz.ts` with `generateQuiz()` returning QuizQuestion[]
    - Create `src/ai/generateFlashcards.ts` with `generateFlashcards()` returning Flashcard[]
    - Create `src/ai/explain.ts` with `explainConcept()`, `suggestSimilarProblems()`, `generateInterviewPrep()`
    - Create `src/ai/status.ts` with reactive availability state and periodic health check
    - Create `src/ai/index.ts` barrel export
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 9. Checkpoint - All service layers complete
  - Verify all service layers work correctly, ask the user if questions arise.

- [x] 10. Application services and dependency injection
  - [x] 10.1 Implement application services with repository injection
    - Create `src/services/TopicService.ts` depending on TopicRepository interface for topic CRUD and content access
    - Create `src/services/ProblemService.ts` depending on ProblemRepository interface for problem CRUD and content access
    - Create `src/services/RevisionService.ts` depending on RevisionRepository interface for scheduling and review sessions
    - Create `src/services/SearchService.ts` depending on SearchIndex for search operations
    - Create `src/services/container.ts` wiring FileTopicRepository, FileProblemRepository, FileRevisionRepository into services
    - _Requirements: 14.2, 14.3_

- [x] 11. Dashboard UI
  - [x] 11.1 Implement Dashboard page
    - Create `src/app/page.tsx` with server component fetching summary stats via TopicService, ProblemService, RevisionService
    - Display total topics count, total problems count, items due for review count, recent activity
    - Render revision items due today sorted by priority (overdue first) using sortByPriority
    - Display statistics: problems by difficulty, topics by confidence, study streak
    - Add navigation links to Topic and Problem detail views
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Topic and Problem detail views
  - [x] 12.1 Implement Topic detail view
    - Create `src/app/topics/[id]/page.tsx` server component loading Topic via TopicService
    - Display topic metadata: title, difficulty, status, confidence, tags
    - Implement tabbed content sections for overview, notes, patterns, mistakes using client component
    - Display flashcards, revision history, and associated problems
    - Add edit button that navigates to editor with the selected file
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 12.2 Implement Problem detail view
    - Create `src/app/problems/[id]/page.tsx` server component loading Problem via ProblemService
    - Display problem metadata: title, platform, difficulty, companies, patterns, status, favorite flag
    - Display notes and solution files
    - Display revision history and confidence trend chart
    - Add edit button for notes and solution files
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 13. Markdown Editor
  - [x] 13.1 Implement Rich Markdown Editor component
    - Create `src/components/MarkdownEditor.tsx` client component
    - Implement formatting toolbar: headings, bold, italic, code blocks, lists, links, images
    - Implement live preview pane rendering Markdown to HTML using react-markdown and remark-gfm
    - Implement syntax highlighting for code blocks (Python, Java, C++, JavaScript, TypeScript) using a highlight plugin
    - Implement save action calling server action to write raw Markdown, trigger Git commit
    - Create editor route `src/app/edit/[...path]/page.tsx` loading file content and rendering MarkdownEditor
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 14. AI Sidebar and Revision Views
  - [x] 14.1 Implement AI Sidebar component
    - Create `src/components/AISidebar.tsx` client component
    - Display contextual actions based on current view (Topic: summary, quiz, flashcards; Problem: interview prep, similar problems, explanation)
    - Implement loading indicator with streaming response display using AsyncGenerator
    - Add save-to-file button when generation completes, calling server action to write content
    - Implement disabled state with unavailability message when Ollama is unreachable
    - Integrate sidebar into Topic and Problem detail views
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 14.2 Implement Revision Views
    - Create `src/app/revision/page.tsx` with review session mode: present items one at a time, reveal answer, rate confidence (1-5)
    - On confidence rating, call RevisionService.updateRevision() to persist and compute next review
    - Create schedule view: items grouped by overdue, due today, upcoming sections
    - Create history view: past sessions, confidence trend chart, upcoming reviews
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 15. Integration wiring and final assembly
  - [x] 15.1 Wire search index initialization and incremental updates
    - In `src/app/layout.tsx` or a server-side init module, build search index at app startup from all workspace files
    - After every file save (in server actions), call `SearchIndex.updateDocument()` for incremental update
    - Wire search UI: create `src/app/search/page.tsx` with search input, results list, and type filter dropdown
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 15.2 Wire Git auto-commit into save operations
    - In all server actions that write files, call `GitService.commitFile()` after successful write
    - Ensure Git failures are caught and logged without blocking the save response
    - On first save, check if Git is initialized and call `GitService.initialize()` if needed
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 15.3 Wire AI availability status across the app
    - Create AI context provider in `src/providers/AIProvider.tsx` exposing availability state
    - On app load, check Ollama connectivity and set initial state
    - Implement periodic health check (every 30s) to detect Ollama becoming available/unavailable
    - Pass availability state to AISidebar and all AI-dependent components
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 16. Final checkpoint - Full integration
  - Verify full integration works end-to-end, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The workspace path should be configurable via environment variable (e.g., `WORKSPACE_PATH`)
- All filesystem operations use Next.js server actions — no client-side fs access
- MiniSearch is recommended over FlexSearch for simpler API and TypeScript support

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["6.1", "8.1"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["11.1"] },
    { "id": 9, "tasks": ["12.1", "12.2"] },
    { "id": 10, "tasks": ["13.1", "14.1", "14.2"] },
    { "id": 11, "tasks": ["15.1", "15.2", "15.3"] }
  ]
}
```
