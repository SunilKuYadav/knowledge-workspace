# Product Overview

Knowledge Workspace is a local-first knowledge management system for **configurable-level technical interview preparation** at top-tier companies (Google, Meta, Microsoft, Amazon, Apple). The target user is an engineer preparing for senior roles who needs to deepen algorithmic knowledge, sharpen system design thinking, and build reliable recall under interview pressure.

The experience level is **user-configurable** (5, 10, or 15 years) — all AI prompts adapt automatically to match the selected preparation depth. Default: 5 years (targeting Senior L4/L5 roles).

## Core Features

- **Topics** — Deep study notes by category (DSA, system design, database, networking, OS, OOP) with overview, notes, patterns, and mistakes tabs. Depth adapts to configured experience level.
- **Problems** — Coding problems with notes, solutions, and metadata. Emphasis on pattern recognition and optimization ladders.
- **Spaced Repetition** — Confidence-based review scheduling optimized for long-term retention. Key for building reliable recall under interview pressure.
- **Full-Text Search** — MiniSearch-powered search across all workspace content.
- **Markdown Editor** — Split-pane editor with live preview and auto-save to git.
- **AI Sidebar** — AI-powered generation calibrated to the user's experience level: notes, patterns, interview Q&A, system design walkthroughs, quizzes, flashcards. (OpenAI via AI Studio)
- **Coding Interview Module** — Simulates a real 45-minute Google/Meta coding round with problem generation, code execution, progressive hints, and scoring across 7 dimensions (algorithm selection, code quality, edge case coverage, communication, etc.).
- **Prompt Configuration** — `/settings` page to select experience level (5/10/15 YOE), target role, target companies, and customize/override individual AI prompts with live preview.
- **Git Integration** — Automatic commits on every save; never blocks user actions.

## AI Calibration

AI prompts are **configurable by experience level** (default: 5 years):
- **5 YOE (default)**: Targeting Senior (L4/L5). Clear foundations, practical examples, pattern recognition, solid interview fundamentals.
- **10 YOE**: Targeting Staff (L5/L6). First principles, formal analysis, production depth, system-level thinking.
- **15 YOE**: Targeting Principal (L6/L7). Architectural thinking, problem-space framing, organizational impact, skip fundamentals entirely.

Prompt modules affected by experience config:
- Identity: Adapts persona depth and company expectations.
- Teaching style: Adapts explanation depth and pedagogical approach.
- Interview context: Adjusts evaluation bar and green/red flags by target level.
- DSA: Scales from clear explanations to correctness proofs.
- System Design: Scales from structured basics to Staff+ framework depth.
- Revision: Adapts recall drills and speed targets.
- Coding Interview: Calibrates evaluation expectations and difficulty.

Users can also append custom instructions or fully replace any prompt from the settings page.

## Design Principles

- **Local-first**: The workspace directory IS the data store. No external database.
- **Plain files**: All data is Markdown and JSON, editable by any text editor.
- **Configurable**: AI depth adapts to the user's experience level and preferences.
- **Graceful degradation**: AI features degrade gracefully if the API is unreachable; all core features work without AI.
- **Non-blocking**: Git and AI failures are logged but never block the user.
