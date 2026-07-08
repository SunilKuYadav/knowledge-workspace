# Tech Stack & Build System

## Framework & Runtime

- **Next.js 16** with App Router (React 19, React Server Components)
- **TypeScript 5** with strict mode
- **Tailwind CSS 4** with `@tailwindcss/typography` plugin

## Key Libraries

| Library | Purpose |
|---------|---------|
| Zod | Schema validation and type inference |
| Zustand | Client-side state management |
| MiniSearch | Full-text search indexing |
| CodeMirror 6 | Code editor (coding interview module) |
| react-markdown + remark-gfm + rehype-highlight | Markdown rendering |
| gray-matter | Frontmatter parsing |
| uuid | ID generation |
| sucrase | In-browser JS/TS transpilation (code execution) |

## Testing

- **Vitest** — Test runner
- **fast-check** — Property-based testing

## AI

- **OpenAI** via AI Studio (OpenAI-compatible API)
- Model: configurable via `OPENAI_MODEL` env var (default: gpt-4o)
- **Prompt Config**: User-configurable experience level (5/10/15 YOE) stored in `~/knowledge-workspace/.config/prompt-config.json`
  - Managed via `/settings` UI or `PUT /api/settings/prompt-config`
  - All prompts adapt dynamically via `src/ai/prompts/config.ts`
  - Default: 5 years experience (Senior L4/L5)

## Common Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Run tests | `npm test` |
| Production build | `npm run build` |
| Start production | `npm start` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Format | `npm run format` |
| Seed sample data | `npm run seed` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_PATH` | `~/knowledge-workspace` | Root directory for workspace files |
| `OPENAI_API_KEY` | — | API key for OpenAI / AI Studio |
| `OPENAI_BASE_URL` | `http://127.0.0.1:1234/v1` | Base URL for the OpenAI-compatible API |
| `OPENAI_MODEL` | `gpt-4o` | Model name to use for AI generation |

## Path Aliases (tsconfig)

| Alias | Resolves To |
|-------|-------------|
| `@/*` | `./*` (project root) |
| `@/types` | `./src/types` |
| `@/repository` | `./src/repository` |
| `@/filesystem` | `./src/filesystem` |
| `@/parser` | `./src/parser` |
| `@/search` | `./src/search` |
| `@/revision` | `./src/revision` |
| `@/ai` | `./src/ai` |
| `@/git` | `./src/git` |
