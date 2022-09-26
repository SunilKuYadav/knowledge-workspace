# Developer Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

Set the `WORKSPACE_PATH` environment variable to your knowledge workspace directory. Defaults to `~/knowledge-workspace` if unset.

```bash
export WORKSPACE_PATH=~/my-knowledge-workspace
```

## Architecture

The app follows a layered architecture with clear separation between UI, application logic, and data access.

```
UI (app/)  →  Services (src/services/)  →  Repository Interfaces (src/repository/)
                                                      ↓
                                              File Implementations (src/filesystem/)
                                                      ↓
                                              Workspace Directory (~/knowledge-workspace)
```

## Project Structure

```
app/                          # Next.js App Router pages and API routes
├── api/ai/                   # AI generation and status endpoints
├── api/search/               # Search API endpoint
├── edit/[...path]/           # Catch-all Markdown editor route
├── problems/[id]/            # Problem detail view
├── revision/                 # Revision session, schedule, history
├── search/                   # Search UI page
├── topics/[id]/              # Topic detail view (with tabbed content)
├── layout.tsx                # Root layout with AIProvider
└── page.tsx                  # Dashboard

src/
├── ai/                       # Ollama client, AI generation functions, health check
├── components/               # Shared client components (MarkdownEditor, AISidebar)
├── filesystem/               # File-based repository implementations
├── git/                      # Git auto-commit service
├── lib/                      # Constants, workspace path config
├── parser/                   # Frontmatter, JSON, Markdown, tag parsing
├── providers/                # React context providers (AIProvider)
├── repository/               # Abstract repository interfaces
├── revision/                 # Spaced repetition scheduler (pure functions)
├── search/                   # MiniSearch index, query, builder, lazy init
├── services/                 # Application services + DI container
└── types/                    # Zod schemas and TypeScript types
```

## Key Concepts

### Workspace = Data

The knowledge workspace directory IS the data store. Files are Markdown and JSON, organized as:

```
knowledge-workspace/
├── notes/{category}/{slug}/       # Topics (topic.json + .md files)
├── problems/{platform}/{slug}/    # Problems (problem.json + .md files)
├── templates/
├── flashcards/
├── revision/
└── assets/
```

Categories: `dsa`, `system-design`, `database`, `networking`, `os`, `oop`
Platforms: `leetcode`, `codeforces`, `gfg`

### Repository Pattern

Services depend on interfaces, not implementations:

```typescript
// Interface (src/repository/TopicRepository.ts)
interface TopicRepository extends Repository<Topic> { ... }

// Implementation (src/filesystem/FileTopicRepository.ts)
class FileTopicRepository implements TopicRepository { ... }

// Wiring (src/services/container.ts)
export const topicService = new TopicService(new FileTopicRepository(workspacePath));
```

### Server Components vs Client Components

- **Server components** (default): Fetch data directly from services. Used for pages.
- **Client components** (`'use client'`): Handle interactivity. Used for tabs, editors, review session UI.
- **Server actions** (`'use server'`): Mutate data from client components. Used for saves and revision updates.

### Path Aliases

Configured in `tsconfig.json`:

| Alias | Path |
|-------|------|
| `@/*` | `./*` (root) |
| `@/types` | `./src/types` |
| `@/repository` | `./src/repository` |
| `@/filesystem` | `./src/filesystem` |
| `@/parser` | `./src/parser` |
| `@/search` | `./src/search` |
| `@/revision` | `./src/revision` |
| `@/ai` | `./src/ai` |
| `@/git` | `./src/git` |

## Testing

Tests use Vitest and live alongside source files (`*.test.ts`).

```bash
npm test              # Run all tests once
npx vitest           # Watch mode
npx vitest run src/revision/  # Run tests in a specific directory
```

Test files use temp directories for filesystem tests — no workspace setup required.

## External Dependencies

### Ollama (optional)

AI features require Ollama running at `localhost:11434`. The app degrades gracefully without it — all non-AI features work normally.

```bash
# Install Ollama: https://ollama.ai
ollama serve
ollama pull llama3
```

The AIProvider polls `/api/ai/status` every 30s to detect availability changes.

### Git

Git auto-commits every file save. If the workspace isn't a git repo, GitService auto-initializes one. Git failures are logged but never block saves.

## Adding New Features

### New entity type

1. Define Zod schema + type in `src/types/`
2. Add repository interface in `src/repository/`
3. Implement file-based repository in `src/filesystem/`
4. Create application service in `src/services/`
5. Wire in `src/services/container.ts`
6. Add UI pages in `app/`

### New workspace category/platform

1. Add to `WORKSPACE_STRUCTURE` in `src/lib/constants.ts`
2. Update the relevant type's enum (e.g., `Topic.category` schema)
3. Repositories auto-discover subdirectories from the structure constant

### New AI action

1. Add generation function in `src/ai/`
2. Add handler case in `app/api/ai/route.ts`
3. Add button config to AISidebar's action arrays

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_PATH` | `~/knowledge-workspace` | Root directory for all workspace files |

## Common Tasks

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Run tests | `npm test` |
| Production build | `npm run build` |
| Start production | `npm start` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
