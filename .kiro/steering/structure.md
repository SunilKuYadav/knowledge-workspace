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
│   ├── ai/                       # AI generation endpoints (generate-text, enhance-prompt, etc.)
│   │   └── coding-interview/     # Interview-specific AI (evaluate, follow-up, hint, score)
│   ├── logs/                     # Dev logging endpoint
│   ├── search/                   # Search API
│   └── settings/                 # Settings API (prompt-config, prompt-preview)
├── coding-interview/             # Interactive coding interview module (self-contained)
│   ├── components/               # Module-specific UI components
│   ├── hooks/                    # Module-specific React hooks
│   ├── lib/                      # Module-specific utilities
│   ├── services/                 # Module-specific services
│   ├── store/                    # Zustand stores
│   └── __tests__/                # Module tests
├── create/                       # Topic/Problem creation page
├── edit/[...path]/               # Catch-all Markdown editor route
├── problems/[id]/                # Problem detail view
├── revision/                     # Spaced repetition (session, schedule, history)
├── search/                       # Search UI
├── settings/                     # Prompt configuration page (experience level, overrides)
├── topics/[id]/                  # Topic detail with tabbed content
├── layout.tsx                    # Root layout with AIProvider
└── page.tsx                      # Dashboard

src/                              # Shared application logic
├── ai/                           # OpenAI client, generation functions, prompts
│   └── prompts/                  # Modular prompt system
│       ├── system/               # Static system context modules
│       ├── builders/             # Feature-specific prompt builders
│       ├── utils/                # compose, composeWithConfig, format helpers
│       ├── config.ts             # Experience-level-aware prompt generators
│       └── loadConfig.ts         # Server-side config loader from workspace
├── components/                   # Shared client components (MarkdownEditor, AISidebar, etc.)
├── filesystem/                   # File-based repository implementations
├── git/                          # Git auto-commit service
├── lib/                          # Constants, workspace path config, logger
├── parser/                       # Frontmatter, JSON, Markdown, tag parsing
├── providers/                    # React context providers (AIProvider)
├── repository/                   # Abstract repository interfaces
├── revision/                     # Spaced repetition scheduler (pure functions)
├── search/                       # MiniSearch index, query, builder
├── services/                     # Application services + DI container
├── stores/                       # Shared Zustand stores (promptConfigStore)
└── types/                        # Zod schemas and TypeScript types (incl. PromptConfig)
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

### Test Placement
Tests live alongside source code in `__test__/` or `__tests__/` directories (e.g., `src/filesystem/__test__/`, `app/coding-interview/__tests__/`).

### Workspace Data Structure
```
~/knowledge-workspace/
├── .config/                      # User configuration
│   └── prompt-config.json        # AI prompt settings (experience level, overrides)
├── notes/{category}/{slug}/      # Topics (topic.json + .md files)
├── problems/{platform}/{slug}/   # Problems (problem.json + .md files)
├── templates/
├── flashcards/
├── revision/
└── assets/
```

Categories: `dsa`, `system-design`, `database`, `networking`, `os`, `oop`
Platforms: `leetcode`, `codeforces`, `gfg`
