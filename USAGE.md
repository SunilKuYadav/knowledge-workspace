# Knowledge Workspace — User Guide

A local-first knowledge management system for technical interview preparation. Browse topics, track problems, review with spaced repetition, and generate content with AI — all backed by plain files on your machine.

## Getting Started

### 1. Install and Seed

```bash
npm install
npm run seed      # Creates sample data in ~/knowledge-workspace
npm run dev       # Start at http://localhost:3000
```

The seed script creates 3 sample topics and 3 problems so you can explore immediately.

### 2. Custom Workspace Location

```bash
export WORKSPACE_PATH=/path/to/your/workspace
npm run seed
npm run dev
```

---

## Pages

### Dashboard (`/`)

Your home screen. Shows:
- **Summary stats** — total topics, problems, and items due for review
- **Due for review** — items you should revisit today, sorted by priority
- **Statistics** — problems by difficulty, topics by confidence level
- **Quick links** — recent topics and problems

### Topic Detail (`/topics/{id}`)

Deep-dive into a study topic:
- **Metadata** — difficulty, status, confidence, tags
- **Tabbed content** — switch between Overview, Notes, Patterns, and Mistakes
- **Flashcards** — view cards with front/back
- **Revision history** — see your confidence trend over time
- **AI Sidebar** — generate summaries, quizzes, or flashcards (requires Ollama)

### Problem Detail (`/problems/{id}`)

Everything about a coding problem:
- **Metadata** — platform, difficulty, companies, patterns, favorite flag
- **Notes** — your approach, complexity analysis, edge cases
- **Solution** — your implementation with syntax highlighting
- **Revision** — confidence trend and review history
- **AI Sidebar** — interview prep, similar problems, solution explanations

### Markdown Editor (`/edit/...`)

Split-pane editor for any file in the workspace:
- **Left pane** — textarea with formatting toolbar (headings, bold, code blocks, lists, links)
- **Right pane** — live Markdown preview
- **Auto-save to git** — every save triggers a git commit

### Revision (`/revision`)

Three views for spaced repetition:
- **Review Session** — items presented one at a time. Reveal, then rate confidence (1-5). The scheduler computes your next review date.
- **Schedule** — all items grouped by Overdue / Due Today / Upcoming
- **History** — past review sessions with confidence trend charts

### Search (`/search`)

Full-text search across all your content:
- Real-time results as you type (2+ characters)
- Filter by type: Topics, Problems, or Flashcards
- Click any result to jump to its detail page

---

## Workspace Structure

Your workspace is a regular folder. You can edit files directly in any text editor — the app picks up changes.

```
~/knowledge-workspace/
├── notes/
│   ├── dsa/
│   │   └── binary-trees/
│   │       ├── topic.json         ← metadata
│   │       ├── overview.md        ← main content
│   │       ├── notes.md           ← your study notes
│   │       ├── patterns.md        ← code patterns
│   │       ├── mistakes.md        ← common pitfalls
│   │       ├── flashcards.json    ← Q&A cards
│   │       └── revision.json      ← review schedule
│   ├── system-design/
│   ├── database/
│   ├── networking/
│   ├── os/
│   └── oop/
├── problems/
│   ├── leetcode/
│   │   └── two-sum/
│   │       ├── problem.json       ← metadata
│   │       ├── notes.md           ← approach notes
│   │       ├── solution.md        ← your code
│   │       └── revision.json      ← review schedule
│   ├── codeforces/
│   └── gfg/
├── templates/
├── flashcards/
├── revision/
└── assets/
```

---

## Workflow Tips

### Adding a New Topic

1. Navigate to the Dashboard
2. Click the **+ Create** button in the top right
3. Select the **Topic** tab
4. Fill in the title, category, difficulty, and optional tags
5. Click **Create Topic** — you'll be redirected to the new topic page

Alternatively, create the folder manually:
   ```bash
   mkdir -p ~/knowledge-workspace/notes/dsa/graph-traversal
   ```
Then add a `topic.json` and empty Markdown files (`overview.md`, `notes.md`, `patterns.md`, `mistakes.md`).

### Adding a New Problem

1. Click the **+ Create** button on the Dashboard
2. Select the **Problem** tab
3. Fill in the title, platform, difficulty, and optional companies/patterns/URL
4. Click **Create Problem** — you'll be redirected to the new problem page

Alternatively, create the folder manually:
   ```bash
   mkdir -p ~/knowledge-workspace/problems/leetcode/valid-parentheses
   ```
Then add a `problem.json`, `notes.md`, and `solution.md`.

### Review Workflow

1. Go to `/revision`
2. Start a review session — items are shown one at a time
3. Click "Reveal" to see details
4. Rate your confidence (1 = forgot, 5 = perfect)
5. The scheduler updates the next review date:
   - Low confidence → reviewed again sooner
   - High confidence → longer interval before next review

### Using AI Features

Requires [Ollama](https://ollama.ai) running locally:

```bash
ollama serve
ollama pull llama3
```

Once running, the AI sidebar activates automatically. You can:
- **Generate summaries** from your notes
- **Create quizzes** to test understanding
- **Generate flashcards** from topic content
- **Get interview prep** for problems
- **Find similar problems** based on patterns

AI-generated content can be saved directly to your workspace files.

---

## Spaced Repetition

The system uses confidence-based intervals:

| Confidence | Multiplier | Example (7-day base) |
|-----------|-----------|---------------------|
| 1 (Forgot) | 0.5× | → 3 days |
| 2 (Hard) | 1× | → 7 days |
| 3 (Good) | 2× | → 14 days |
| 4 (Easy) | 3× | → 21 days |
| 5 (Perfect) | 5× | → 35 days |

Items are categorized as:
- **Overdue** — past their scheduled review date (highest priority)
- **Due Today** — scheduled for today
- **Upcoming** — scheduled for a future date

---

## Git Integration

Every save creates a git commit automatically. You never need to think about version control — your entire learning history is tracked.

- First save auto-initializes a git repo if one doesn't exist
- Commit messages describe the action: "Update notes for topic: Binary Trees"
- Git failures never block saves — they're logged silently

---

## Keyboard Shortcuts (Editor)

The Markdown editor toolbar provides quick formatting. Click buttons or use these patterns:

| Format | Syntax |
|--------|--------|
| Bold | `**text**` |
| Italic | `*text*` |
| Code | `` `code` `` |
| Code block | ` ```lang ``` ` |
| Heading | `# H1`, `## H2`, `### H3` |
| List | `- item` |
| Link | `[text](url)` |
| Image | `![alt](url)` |

---

## Troubleshooting

**Dashboard shows no data**
- Check `WORKSPACE_PATH` points to a directory with workspace content
- Run `npm run seed` to create sample data

**AI sidebar says "unavailable"**
- Ensure Ollama is running: `ollama serve`
- Check it responds: `curl http://localhost:11434`
- The app checks every 30 seconds — wait or refresh

**Search returns no results**
- Search index builds on first query — first search may be slow
- Ensure workspace has content (topic.json / problem.json files)

**Git errors in console**
- These are non-blocking. Saves still complete.
- Ensure `git` is installed and available in PATH
