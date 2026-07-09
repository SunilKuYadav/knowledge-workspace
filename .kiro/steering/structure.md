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
├── api/
│   ├── ai/                       # AI generation endpoints
│   │   ├── coding-interview/     # Interview AI (evaluate, follow-up, generate-problem, hint, score)
│   │   ├── creation-assist/      # AI-assisted topic/problem creation
│   │   ├── enhance-prompt/       # Prompt enhancement
│   │   ├── generate-artifact/    # Artifact generation (notes, patterns, etc.)
│   │   ├── generate-text/        # General text generation
│   │   ├── learning-progress/    # Learning progress tracking
│   │   ├── logs/                 # AI log streaming
│   │   ├── parse-form/           # Form parsing
│   │   ├── problem/              # Problem-specific AI (generate-description, generate-note, generate-variation)
│   │   ├── review-session/       # Spaced repetition review AI
│   │   ├── status/               # AI service status check
│   │   └── study-plans/          # Study plan generation
│   ├── logs/                     # Dev logging endpoint
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
├── settings/                     # Prompt configuration page (experience level, overrides)
├── study-plans/                  # AI-generated study plans
├── topics/                       # Topics listing + detail
│   ├── topics-list-client/       # Client-side list with filtering
│   └── [id]/                     # Topic detail with tabs, artifact generation/regeneration
├── layout.tsx                    # Root layout with AIProvider
└── page.tsx                      # Dashboard

src/                              # Shared application logic
├── ai/                           # OpenAI client, generation functions, prompts
│   ├── __test__/                 # AI module tests
│   └── prompts/                  # Modular prompt system
│       ├── artifacts/            # Artifact-specific prompt templates (cheatsheet, examples, implementation, interview, mistakes, notes, overview, patterns)
│       ├── builders/             # Feature-specific prompt builders (coding-interview, content, creation-assist, enhance, explain, flashcards, interview, parser, problem, quiz, review, summary)
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
├── git/                          # Git auto-commit service
├── lib/                          # Constants, workspace path config
│   └── logger/                   # Structured logger (event bus, typed events)
├── parser/                       # Frontmatter, JSON, Markdown, tag parsing
├── providers/                    # React context providers (AIProvider)
├── repository/                   # Abstract repository interfaces
├── revision/                     # Spaced repetition scheduler (pure functions)
├── search/                       # MiniSearch index, query, builder
├── services/                     # Application services + DI container
├── stores/                       # Shared Zustand stores (promptConfigStore)
└── types/                        # Zod schemas and TypeScript types (Problem, ProblemDescription, Topic, Revision, PromptConfig, StudyPlan, Artifact, Flashcard)
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
Services depend on interfaces (`src/repository/`), not implementations (`src/filesystem/`). Wiring happens in `src/services/container.ts`.

### Server vs Client Components
- **Server components** (default): Pages that fetch data directly from services.
- **Client components** (`'use client'`): Interactive UI — tabs, editors, review sessions.
- **Server actions** (`'use server'`): Data mutations from client components (saves, updates).

### Self-Contained Modules
The `app/coding-interview/` module is self-contained with its own components, hooks, services, store, and tests. It does not share state with the rest of the app.

### Component Organization
Shared components in `src/components/` follow a barrel pattern: a top-level `.tsx` file re-exports from an internal folder containing the component, types, hooks, and sub-components. Example: `src/components/AISidebar.tsx` → `src/components/AISidebar/`.

Page-specific client components follow a similar pattern inside their route folder (e.g., `app/problems/problems-list-client/`).

### Prompt Architecture
The AI prompt system is modular:
- `system/` — Reusable context modules (identity, teaching style, domain knowledge).
- `builders/` — Feature-specific prompt composers that combine system modules + user config.
- `artifacts/` — Templates for specific artifact types (notes, patterns, cheatsheets, etc.).
- `schemas/` — Zod schemas defining expected AI output structures.
- `utils/` — Composition and formatting helpers.

### Test Placement
Tests live alongside source code in `__test__/` or `__tests__/` directories (e.g., `src/filesystem/__test__/`, `app/coding-interview/__tests__/`, `src/ai/__test__/`).

### Workspace Data Structure
```
~/knowledge-workspace/
├── .config/                      # User configuration
│   └── prompt-config.json        # AI prompt settings (experience level, overrides)
├── notes/{category}/{slug}/      # Topics (topic.json + .md files)
├── problems/{slug}/              # Problems (problem.json + .md files)
├── templates/
├── flashcards/
├── revision/
└── assets/
```

Categories: `dsa`, `system-design`, `database`, `networking`, `os`, `oop`
