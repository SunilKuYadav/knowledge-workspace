# Project Structure

## Architecture

Layered architecture with clear separation between UI, application logic, and data access:

```
UI (app/)  →  Services (src/services/)  →  Repository Interfaces (src/repository/)
                                                      ↓
                                              File Implementations (src/filesystem/)
                                                      ↓
                                              Workspace Directory (~/knowledge-workspace)
```

## Directory Layout

```
app/                              # Next.js App Router — pages and API routes
├── actions/                      # Server actions (link-actions: bidirectional problem↔topic linking)
├── api/
│   ├── ai/                       # AI generation endpoints
│   │   ├── assessment/           # Adaptive self-test AI (generate, evaluate, feedback, content-update)
│   │   ├── coding-interview/     # Interview AI (evaluate, follow-up, generate-problem, hint, score)
│   │   ├── creation-assist/      # AI-assisted topic/problem creation
│   │   ├── enhance-prompt/       # Prompt enhancement
│   │   ├── generate-artifact/    # Artifact generation (notes, patterns, etc.)
│   │   ├── generate-text/        # General text generation
│   │   ├── learning-progress/    # AI-powered readiness assessment, plan generation, suggestions
│   │   ├── logs/                 # AI log streaming
│   │   ├── merge-suggest/        # AI-assisted duplicate merge suggestions
│   │   ├── parse-form/           # Form parsing
│   │   ├── problem/              # Problem-specific AI (evaluate-solution, generate-description, generate-note, generate-variation)
│   │   ├── review-session/       # Spaced repetition review AI
│   │   ├── status/               # AI service status check
│   │   └── study-plans/          # Study plan generation
│   ├── duplicates/               # Duplicate detection + merge API
│   │   └── merge/                # Execute merge of duplicate entries
│   ├── logs/                     # Dev logging endpoint
│   ├── quick-create/             # Quick-create topics/problems with AI-enriched metadata
│   ├── search/                   # Search API
│   └── settings/                 # Settings API (prompt-config, prompt-preview)
├── coding-interview/             # Interactive coding interview module (self-contained)
│   ├── components/               # Module-specific UI components
│   │   ├── code-editor/          # CodeMirror-based editor
│   │   ├── confirm-dialog/       # Confirmation dialogs
│   │   ├── console-panel/        # Code execution output
│   │   ├── evaluation-panel/     # AI evaluation display
│   │   ├── follow-up-panel/      # Follow-up questions
│   │   ├── hint-panel/           # Progressive hints
│   │   ├── problem-panel/        # Problem statement
│   │   ├── score-panel/          # Scoring breakdown
│   │   ├── summary-panel/        # Session summary
│   │   ├── test-case-panel/      # Test case I/O
│   │   └── timer-panel/          # Countdown timer
│   ├── hooks/                    # Module-specific React hooks
│   ├── lib/                      # Module-specific utilities (api, constants, scoring, types, validation)
│   ├── services/                 # Execution service (deepEqual, executionService, executionWorker, formatService)
│   ├── store/                    # Zustand store + persistence
│   └── __tests__/                # Module tests
├── create/                       # Topic/Problem creation page
│   ├── create-form/              # Form component with AI assist
│   └── lib/                      # Creation utilities
├── duplicates/                   # Duplicate detection and merging UI
│   └── duplicates-client/        # Client-side duplicate management
├── edit/[...path]/               # Catch-all Markdown editor route
├── problems/                     # Problems listing + detail
│   ├── problems-list-client/     # Client-side list with filtering
│   └── [id]/                     # Problem detail with workspace view
├── progress/                     # Learning progress dashboard
├── revision/                     # Spaced repetition (session, schedule, history)
│   ├── components/               # Review UI (history, interactive session, phases, schedule)
│   ├── hooks/                    # Review session hooks
│   ├── lib/                      # Review utilities
│   └── revision-client/          # Client-side revision controller
├── search/                       # Search UI
├── self-test/                    # Adaptive self-test module (self-contained)
│   ├── components/               # Module-specific UI components
│   │   ├── assessment-launcher/  # Start assessment UI
│   │   ├── code-editor/          # CodeMirror editor for code challenges
│   │   ├── content-update-preview/ # AI-suggested content updates
│   │   ├── early-exit-prompt/    # Graceful session exit
│   │   ├── evaluation-card/      # Per-question evaluation display
│   │   ├── feedback-report/      # Full assessment feedback
│   │   ├── history-detail/       # Past assessment detail view
│   │   ├── history-list/         # Assessment history listing
│   │   ├── mark-in-progress-button/ # Resume in-progress assessment
│   │   ├── mcq-options/          # Multiple choice rendering
│   │   ├── phase-header/         # Phase progress indicator
│   │   ├── phase-summary/        # Per-phase score summary
│   │   ├── question-card/        # Question display
│   │   ├── text-answer/          # Free-text answer input
│   │   └── trend-indicator/      # Performance trend display
│   ├── actions/                  # Server actions for assessment persistence
│   ├── hooks/                    # Module-specific React hooks
│   ├── lib/                      # Module-specific utilities (constants, difficulty, scoring, types, validation)
│   ├── store/                    # Zustand store + persistence
│   └── __tests__/                # Module tests
├── settings/                     # Prompt configuration page (experience level, overrides)
├── study-plans/                  # AI-generated study plans with quick-create
├── topics/                       # Topics listing + detail
│   ├── topics-list-client/       # Client-side list with filtering
│   └── [id]/                     # Topic detail with tabs, artifact generation/regeneration
├── layout.tsx                    # Root layout with AIProvider
└── page.tsx                      # Dashboard

src/                              # Shared application logic
├── ai/                           # OpenAI client, generation functions, prompts
│   ├── __test__/                 # AI module tests
│   └── prompts/                  # Modular prompt system
│       ├── artifacts/            # Artifact-specific prompt templates (cheatsheet, examples, implementation, interview, level-guidance, mistakes, notes, overview, patterns)
│       ├── builders/             # Feature-specific prompt builders (assessment, coding-interview, content, creation-assist, enhance, explain, flashcards, interview, learning-progress, merge, parser, problem, quick-create, quiz, review, summary)
│       ├── schemas/              # Zod schemas for AI outputs (flashcards, problem, quiz, review, similar, topic)
│       ├── system/               # Static system context modules (coding, dsa, engineering, identity, interview, json, knowledge, markdown, revision, safety, system-design, teaching)
│       ├── utils/                # compose, composeWithConfig, format helpers
│       ├── config.ts             # Experience-level-aware prompt generators
│       └── loadConfig.ts         # Server-side config loader from workspace
├── components/                   # Shared client components
│   ├── AISidebar/                # AI chat sidebar with quiz rendering
│   ├── coding-interview-button/  # Launch button for coding interview
│   ├── dev/                      # Dev-only components (ServerLogConsole)
│   ├── markdown-editor/          # Split-pane Markdown editor with AI generate
│   ├── markdown-renderer/        # Markdown rendering with syntax highlighting
│   ├── rate-confidence-button/   # Confidence rating for spaced repetition
│   └── self-test-button/         # Self-test trigger
├── filesystem/                   # File-based repository implementations
│   ├── FileTopicRepository.ts    # Topic CRUD on filesystem
│   ├── FileProblemRepository.ts  # Problem CRUD on filesystem
│   ├── FileRevisionRepository.ts # Revision data on filesystem
│   ├── FileAssessmentRepository.ts # Assessment history on filesystem (FIFO eviction)
│   └── workspace.ts             # Shared filesystem utilities (readJsonFile, writeJsonFile, ensureDirectoryExists)
├── git/                          # Git auto-commit service
├── lib/                          # Constants, workspace path config
│   └── logger/                   # Structured logger (event bus, typed events)
├── parser/                       # Frontmatter, JSON, Markdown, tag parsing
├── providers/                    # React context providers (AIProvider)
├── repository/                   # Abstract repository interfaces
│   ├── Repository.ts             # Base generic interface
│   ├── TopicRepository.ts        # Topic interface
│   ├── ProblemRepository.ts      # Problem interface
│   ├── RevisionRepository.ts     # Revision interface
│   └── AssessmentRepository.ts   # Assessment history interface
├── revision/                     # Spaced repetition scheduler (pure functions)
├── search/                       # MiniSearch index, query, builder
├── services/                     # Application services + DI container
│   ├── TopicService.ts           # Topic business logic
│   ├── ProblemService.ts         # Problem business logic
│   ├── RevisionService.ts        # Revision business logic
│   ├── SearchService.ts          # Search business logic
│   └── container.ts             # DI wiring (repos → services)
├── stores/                       # Shared Zustand stores (promptConfigStore)
└── types/                        # Zod schemas and TypeScript types
    ├── Topic.ts                  # Topic schema and type
    ├── Problem.ts                # Problem schema and type
    ├── ProblemDescription.ts     # AI-generated descriptions, test cases, variations, practice history
    ├── SemanticDescription.ts    # Per-item AI context (intent, targetLevel, focus, knownConcepts)
    ├── Revision.ts               # Spaced repetition entries
    ├── PromptConfig.ts           # Experience levels (1/5/10/15), overrides, presets
    ├── StudyPlan.ts              # Study plan items
    ├── Artifact.ts               # Artifact types and labels
    ├── Flashcard.ts              # Flashcard decks
    └── errors.ts                 # Typed errors (FilesystemError, AIError, GitError)
```

## Top-Level Project Files

```
├── docs/                         # Documentation (AI_PROMPTS.md)
├── scripts/                      # Utility scripts (seed.ts for sample data)
├── public/                       # Static assets (SVG icons)
├── knowledge-workspace/          # Embedded sample workspace data (development/testing)
├── mdx-components.tsx            # MDX component overrides
├── eslint.config.mjs             # ESLint flat config
├── vitest.config.ts              # Vitest test configuration
├── postcss.config.mjs            # PostCSS config (Tailwind)
└── .prettierrc.js                # Prettier formatting config
```

## Key Patterns

### Repository Pattern
Services depend on interfaces (`src/repository/`), not implementations (`src/filesystem/`). Wiring happens in `src/services/container.ts`. Note: `AssessmentRepository` is used directly in self-test server actions rather than going through the container.

### Server vs Client Components
- **Server components** (default): Pages that fetch data directly from services.
- **Client components** (`'use client'`): Interactive UI — tabs, editors, review sessions, self-test.
- **Server actions** (`'use server'`): Data mutations from client components (saves, updates, link/unlink, assessment persistence).

### Self-Contained Modules
Both `app/coding-interview/` and `app/self-test/` are self-contained modules with their own components, hooks, store, lib, actions, and tests. They do not share state with the rest of the app.

### Component Organization
Shared components in `src/components/` follow a barrel pattern: a top-level `.tsx` file re-exports from an internal folder containing the component, types, hooks, and sub-components. Example: `src/components/AISidebar.tsx` → `src/components/AISidebar/`.

Page-specific client components follow a similar pattern inside their route folder (e.g., `app/problems/problems-list-client/`, `app/duplicates/duplicates-client/`).

### Prompt Architecture
The AI prompt system is modular:
- `system/` — Reusable context modules (identity, teaching style, domain knowledge).
- `builders/` — Feature-specific prompt composers that combine system modules + user config.
- `artifacts/` — Templates for specific artifact types (notes, patterns, cheatsheets, etc.) with per-level guidance.
- `schemas/` — Zod schemas defining expected AI output structures.
- `utils/` — Composition and formatting helpers (`compose`, `composeWithConfig`, `format`).

### Test Placement
Tests live alongside source code in `__test__/` or `__tests__/` directories (e.g., `src/filesystem/__test__/`, `app/coding-interview/__tests__/`, `app/self-test/__tests__/`, `src/ai/__test__/`).

### Workspace Data Structure
```
~/knowledge-workspace/
├── .config/                      # User configuration
│   └── prompt-config.json        # AI prompt settings (experience level, overrides)
├── notes/{category}/{slug}/      # Topics (topic.json + .md files + assessment-history.json)
├── problems/{slug}/              # Problems (problem.json + description.json + .md files)
├── templates/
├── flashcards/
├── revision/
└── assets/
```

Categories: `dsa`, `system-design`, `database`, `networking`, `os`, `oop`
