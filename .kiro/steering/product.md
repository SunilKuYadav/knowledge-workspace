# Product Overview

Knowledge Workspace is a local-first knowledge management system for technical interview preparation. It lets users browse study topics, track coding problems, review with spaced repetition, and generate content with AI — all backed by plain Markdown and JSON files on the local filesystem.

## Core Features

- **Topics** — Study notes organized by category (DSA, system design, database, networking, OS, OOP) with overview, notes, patterns, and mistakes tabs
- **Problems** — Coding problems organized by platform (LeetCode, Codeforces, GFG) with notes, solutions, and metadata
- **Spaced Repetition** — Confidence-based review scheduling with session tracking and history
- **Full-Text Search** — MiniSearch-powered search across all workspace content
- **Markdown Editor** — Split-pane editor with live preview and auto-save to git
- **AI Sidebar** — AI-powered generation of summaries, quizzes, flashcards, and interview prep (OpenAI via AI Studio)
- **Coding Interview Module** — Interactive coding interview practice with problem generation, code execution, hints, and scoring
- **Git Integration** — Automatic commits on every save; never blocks user actions

## Design Principles

- **Local-first**: The workspace directory IS the data store. No external database.
- **Plain files**: All data is Markdown and JSON, editable by any text editor.
- **Graceful degradation**: AI features degrade gracefully if the API is unreachable; all core features work without AI.
- **Non-blocking**: Git and AI failures are logged but never block the user.
