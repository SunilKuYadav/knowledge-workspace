# Product Overview

Knowledge Workspace is a local-first knowledge management system for **senior/staff-level technical interview preparation** at top-tier companies (Google, Meta, Microsoft, Amazon, Apple). The target user is an experienced engineer (7-12+ YOE) aiming for L5/L6/Staff roles who needs to deepen algorithmic knowledge, sharpen system design thinking, and build reliable recall under interview pressure.

All AI-generated content is calibrated to this bar: the depth, framing, and detail level expected to receive a "Strong Hire" vote from a Staff Engineer interviewer.

## Core Features

- **Topics** — Deep study notes by category (DSA, system design, database, networking, OS, OOP) with overview, notes, patterns, and mistakes tabs. Structured for L5-L7 depth, not introductory coverage.
- **Problems** — Coding problems organized by platform (LeetCode, Codeforces, GFG) with notes, solutions, and metadata. Emphasis on pattern recognition and optimization ladders.
- **Spaced Repetition** — Confidence-based review scheduling optimized for long-term retention. Key for building reliable recall under interview pressure.
- **Full-Text Search** — MiniSearch-powered search across all workspace content.
- **Markdown Editor** — Split-pane editor with live preview and auto-save to git.
- **AI Sidebar** — AI-powered generation calibrated for senior-level depth: notes, patterns, interview Q&A, system design walkthroughs, quizzes, flashcards. (OpenAI via AI Studio)
- **Coding Interview Module** — Simulates a real 45-minute Google/Meta coding round with problem generation, code execution, progressive hints, and scoring across 7 dimensions (algorithm selection, code quality, edge case coverage, communication, etc.).
- **Git Integration** — Automatic commits on every save; never blocks user actions.

## AI Calibration

All AI prompts are calibrated for **senior/staff-level interview preparation**:
- Identity: Principal/Staff engineer with FAANG hiring committee experience.
- Teaching style: First principles, formal analysis, production depth — not textbook introductions.
- Interview context: L5/L6/L7 bar at Google, Meta, Microsoft. Includes green/red flags by level.
- DSA: Full optimization ladder, correctness proofs, implementation traps.
- System Design: Full Staff-level framework (requirements → estimation → HLD → deep dive → reliability → observability).
- Revision: Calibrated for long-term retention under interview pressure (speed drills, confidence checks, decision frameworks).

## Design Principles

- **Local-first**: The workspace directory IS the data store. No external database.
- **Plain files**: All data is Markdown and JSON, editable by any text editor.
- **Graceful degradation**: AI features degrade gracefully if the API is unreachable; all core features work without AI.
- **Non-blocking**: Git and AI failures are logged but never block the user.
