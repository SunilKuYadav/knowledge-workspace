# Implementation Plan: Coding Interview Module

## Overview

This plan implements the Universal AI Coding Interview Module as a reusable, self-contained component under `app/coding-interview/`. Tasks are ordered to build foundational layers first (types, store, services) then compose them into components and API routes, finishing with integration and testing.

## Tasks

- [x] 1. Set up project foundation — types, constants, and validation
  Create the base directory structure and implement core type definitions, constants, and validation utilities. Install CodeMirror and fast-check dependencies.

  **Requirements:** 1 (AC 1-8), 12 (AC 1)

  **Files:**
  - `app/coding-interview/lib/types.ts` — All TypeScript interfaces
  - `app/coding-interview/lib/constants.ts` — Default/min/max values, formatTime utility
  - `app/coding-interview/lib/validation.ts` — validateInterviewProps, validateContext, validateDuration
  - `package.json` — Add CodeMirror packages and fast-check

  **Acceptance Criteria:**
  - All TypeScript interfaces from design exported from types.ts
  - Constants: DEFAULT_DURATION=45, MIN_DURATION=1, MAX_DURATION=180, EXECUTION_TIMEOUT=5000, AI_TIMEOUT=30000, MAX_OUTPUT_LENGTH=10000, WARNING_THRESHOLD_SECONDS=300
  - formatTime returns MM:SS with zero-padding
  - Validation rejects invalid source, missing context fields, out-of-range duration
  - Validation accepts valid configurations
  - `npm run build` succeeds

- [x] 2. Implement Zustand store with sessionStorage persistence
  Create the Zustand store with all interview state slices and custom sessionStorage persistence middleware with staleness detection.

  **Requirements:** 12 (AC 1-9)

  **Files:**
  - `app/coding-interview/store/interviewStore.ts` — Zustand store definition with actions
  - `app/coding-interview/store/persistence.ts` — sessionStorage middleware with 24h max age

  **Acceptance Criteria:**
  - Store initializes with correct defaults (phase='initializing', code='', etc.)
  - Store exposes all actions: setPhase, setCode, setProblem, tickTimer, pauseTimer, resumeTimer, addHint, setEvaluation, addConversationMessage, setScore, setSummary, setError, clearSession
  - Persistence writes to sessionStorage on mutations
  - Restores state if within 24 hours, discards if older
  - clearSession removes key from sessionStorage

- [x] 3. Implement deep equality utility and execution worker
  Build deep equality comparison for test case validation and Web Worker for sandboxed code execution with timeout enforcement.

  **Requirements:** 3 (AC 1-8)

  **Files:**
  - `app/coding-interview/services/deepEqual.ts` — Deep equality for primitives, arrays, objects, nested
  - `app/coding-interview/services/executionWorker.ts` — Web Worker script for code execution
  - `app/coding-interview/services/executionService.ts` — Worker management with timeout enforcement

  **Acceptance Criteria:**
  - deepEqual returns correct results for all JS types including nested structures
  - Worker captures console.log into consoleOutput
  - Worker returns syntax errors with line number without running tests
  - Worker returns runtime errors with type, message, stack
  - Worker runs each test case independently with pass/fail
  - Service terminates worker after 5s timeout per test case
  - Reports executionTimeMs and memoryUsageMb
  - Output truncated at 10,000 chars with indicator

- [x] 4. Implement code formatting service
  Build formatting utility with consistent rules and graceful syntax error handling.

  **Requirements:** 2 (AC 8, 9)

  **Files:**
  - `app/coding-interview/services/formatService.ts` — formatCode function with error handling

  **Acceptance Criteria:**
  - Produces consistent 2-space indentation
  - Is idempotent: format(format(code)) === format(code)
  - Returns original code unchanged on syntax error
  - Returns error message when formatting fails
  - Handles both JavaScript and TypeScript

- [x] 5. Implement CodeEditor component with CodeMirror
  Build CodeEditor component using CodeMirror 6 with all editor features and toolbar actions.

  **Requirements:** 2 (AC 1-12)

  **Files:**
  - `app/coding-interview/components/CodeEditor.tsx` — CodeMirror wrapper with toolbar

  **Acceptance Criteria:**
  - Syntax highlighting for JS/TS (keywords, strings, comments, numbers, types)
  - Auto-indentation after block openers
  - Bracket/quote auto-close
  - Line numbers in gutter
  - Theme follows application dark/light mode
  - Copy shows 2s confirmation
  - Reset shows confirmation dialog before restoring boilerplate
  - Format works on valid code, shows error on invalid
  - Fullscreen toggle with visible exit control
  - Min height 300px embedded

- [x] 6. Implement Timer hook and TimerPanel component
  Build useTimer hook and TimerPanel UI with countdown, pause/resume, warning, and auto-expire.

  **Requirements:** 9 (AC 1-7)

  **Files:**
  - `app/coding-interview/hooks/useTimer.ts` — Timer logic hook
  - `app/coding-interview/components/TimerPanel.tsx` — Timer display component

  **Acceptance Criteria:**
  - Timer counts from 0 elapsed, counts down from duration
  - Displays MM:SS format updated every 1s
  - Pause/resume works correctly
  - Auto-submits on expire (calls onExpire)
  - Defaults to 45 min, accepts 1-180
  - Warning color at ≤5 min remaining
  - Persists state via store

- [x] 7. Implement ProblemPanel and HintPanel components
  Build problem description panel (resizable) and progressive hint panel with 4 levels.

  **Requirements:** 5 (AC 1), 8 (AC 1-8)

  **Files:**
  - `app/coding-interview/components/ProblemPanel.tsx` — Resizable problem display
  - `app/coding-interview/components/HintPanel.tsx` — Progressive hint UI

  **Acceptance Criteria:**
  - ProblemPanel renders all problem fields
  - Panel resizable 250px to 60% viewport
  - HintPanel shows level indicator (1-4)
  - Consumed hints displayed chronologically
  - "Show Solution" visible only after level 4
  - hintsUsed tracked in store

- [x] 8. Implement ConsolePanel and TestCasePanel components
  Build console output and test case results display components.

  **Requirements:** 3 (AC 2-8), 5 (AC 6)

  **Files:**
  - `app/coding-interview/components/ConsolePanel.tsx` — Console output display
  - `app/coding-interview/components/TestCasePanel.tsx` — Test case results display

  **Acceptance Criteria:**
  - ConsolePanel shows logs, truncation indicator, syntax/runtime errors, time/memory
  - ConsolePanel shows loading indicator during execution
  - TestCasePanel lists cases with input, expected, actual, pass/fail
  - TestCasePanel shows timeout error for timed-out cases

- [x] 9. Implement AI API routes — problem generation and hints
  Create API routes for generating interview problems and progressive hints.

  **Requirements:** 4 (AC 1-9), 8 (AC 2-5)

  **Files:**
  - `app/api/ai/coding-interview/generate-problem/route.ts` — Problem generation endpoint
  - `app/api/ai/coding-interview/hint/route.ts` — Hint generation endpoint

  **Acceptance Criteria:**
  - generate-problem accepts source, context, language, difficulty
  - Returns valid GeneratedProblem with ≥2 tags, ≥2 samples, ≥2 edge cases, ≥5 hidden tests
  - Includes Big-O complexities and 1-5 company tags
  - Context-aware: problem overlaps with provided context
  - Difficulty-constrained when specified
  - Returns error after 30s timeout
  - hint route returns level-appropriate content per level 1-4

- [x] 10. Implement AI API routes — evaluation and scoring
  Create evaluation route for senior-engineer feedback and scoring/summary route.

  **Requirements:** 6 (AC 1-9), 10 (AC 1-8), 11 (AC 1-9)

  **Files:**
  - `app/api/ai/coding-interview/evaluate/route.ts` — Evaluation endpoint
  - `app/api/ai/coding-interview/score/route.ts` — Scoring and summary endpoint
  - `app/coding-interview/lib/scoring.ts` — Pure scoring functions

  **Acceptance Criteria:**
  - evaluate returns EvaluationReport with 6 non-empty sections
  - Includes per-test-case results, positives and improvements
  - Returns error after 30s timeout
  - score returns ScoringReport (0-100 overall, 7 dimensions) and SessionSummary
  - Correct readiness mapping thresholds
  - Penalties applied for hints, time, attempts
  - SessionSummary has correct field counts
  - scoring.ts pure functions work correctly

- [x] 11. Implement AI API route — follow-up interview
  Create follow-up conversation route for adaptive interview questions.

  **Requirements:** 7 (AC 1-9)

  **Files:**
  - `app/api/ai/coding-interview/follow-up/route.ts` — Follow-up endpoint

  **Acceptance Criteria:**
  - Generates contextual questions referencing user's code
  - Adapts based on conversationHistory
  - Returns { complete: true } after 8 questions
  - Explores: alternatives, trade-offs, large inputs, memory, iterative vs recursive, production
  - Provides hints for incomplete answers
  - Returns error indication on AI failure
  - Accepts responses up to 2000 chars

- [x] 12. Implement EvaluationPanel, FollowUpPanel, ScorePanel, and SummaryPanel
  Build UI components for evaluation results, follow-up chat, scoring, and summary.

  **Requirements:** 6 (AC 7-8), 7 (AC 7, 9), 10 (AC 1-8), 11 (AC 1-9)

  **Files:**
  - `app/coding-interview/components/EvaluationPanel.tsx` — Structured evaluation display
  - `app/coding-interview/components/FollowUpPanel.tsx` — Chat interface with controls
  - `app/coding-interview/components/ScorePanel.tsx` — Score report display
  - `app/coding-interview/components/SummaryPanel.tsx` — Summary and recommendations

  **Acceptance Criteria:**
  - EvaluationPanel renders 6 sections with feedback
  - FollowUpPanel has chat UI, 2000-char input, end-discussion button
  - ScorePanel shows overall score, 7 dimensions with justifications, readiness badge
  - SummaryPanel renders all sections with priority-ordered improvement plan

- [x] 13. Implement orchestration hooks and API client
  Build useInterviewSession, useCodeExecution, useFollowUp hooks and the API client module.

  **Requirements:** 1 (AC 6-8), 3 (AC 1), 5 (AC 3-5, 7-8), 4 (AC 8), 6 (AC 9), 7 (AC 8)

  **Files:**
  - `app/coding-interview/hooks/useInterviewSession.ts` — Main lifecycle orchestration
  - `app/coding-interview/hooks/useCodeExecution.ts` — Execution trigger with loading state
  - `app/coding-interview/hooks/useFollowUp.ts` — Follow-up conversation management
  - `app/coding-interview/lib/api.ts` — API client functions with 30s timeouts

  **Acceptance Criteria:**
  - useInterviewSession validates props, generates problem, manages phase transitions
  - Handles 30s timeout with retry (up to 3 attempts)
  - useCodeExecution triggers worker, disables buttons, updates store
  - Submit shows confirmation then calls evaluate
  - useFollowUp manages conversation, handles complete signal
  - API client functions use AbortController with 30s timeout
  - All functions throw descriptive errors

- [x] 14. Implement InterviewModule top-level component
  Build the top-level InterviewModule that renders phase-appropriate layouts and ConfirmDialog.

  **Requirements:** 1 (AC 1-8), 5 (AC 1-8)

  **Files:**
  - `app/coding-interview/InterviewModule.tsx` — Top-level client component
  - `app/coding-interview/components/ConfirmDialog.tsx` — Reusable confirmation modal
  - `app/coding-interview/components/index.ts` — Barrel exports

  **Acceptance Criteria:**
  - Renders error for invalid props
  - Shows loading during problem generation
  - Coding phase: split layout (ProblemPanel left, CodeEditor right, Timer top, Console/TestCase bottom)
  - Run/Submit disabled during execution
  - Submit triggers ConfirmDialog
  - Evaluating shows loading then EvaluationPanel
  - Follow-up shows FollowUpPanel
  - Summary shows ScorePanel + SummaryPanel
  - Self-contained, no external layout dependencies

- [x] 15. Property-based tests for validation, scoring, and utilities
  Implement property-based tests using fast-check for pure logic layer.

  **Requirements:** Design Properties 1, 2, 5, 6, 8, 14, 15, 16, 17, 19, 20

  **Files:**
  - `app/coding-interview/__tests__/validation.test.ts` — Props validation properties
  - `app/coding-interview/__tests__/scoring.test.ts` — Scoring logic properties
  - `app/coding-interview/__tests__/deepEqual.test.ts` — Deep equality properties
  - `app/coding-interview/__tests__/persistence.test.ts` — Persistence round-trip properties
  - `app/coding-interview/__tests__/formatService.test.ts` — Format idempotence properties

  **Acceptance Criteria:**
  - All tests use fast-check with ≥100 iterations
  - Covers Properties 1, 2 (config validation, duration range)
  - Covers Properties 15, 16, 17 (readiness, penalty monotonicity, score ranges)
  - Covers Property 8 (deep equality)
  - Covers Properties 19, 20 (round-trip, staleness)
  - Covers Properties 5, 6 (format idempotence, error preservation)
  - All tests pass with `npm run test`

- [x] 16. Integration verification and build validation
  Verify the complete module builds without errors, all components render correctly in each phase, and the module can be embedded in an existing page.

  **Requirements:** 1 (AC 6), all requirements integration

  **Files:**
  - `app/coding-interview/index.ts` — Public export of InterviewModule

  **Acceptance Criteria:**
  - `npm run build` succeeds with no TypeScript errors
  - `npm run lint` passes
  - `npm run test` passes all property-based and unit tests
  - InterviewModule can be imported and rendered in any page
  - No circular dependencies in the module

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3", "4", "9", "10", "11"] },
    { "id": 2, "tasks": ["5", "6", "7", "8", "12"] },
    { "id": 3, "tasks": ["13", "15"] },
    { "id": 4, "tasks": ["14"] },
    { "id": 5, "tasks": ["16"] }
  ]
}
```

## Notes

- Tasks 2-4 and 9-11 can be parallelized since they have no interdependencies beyond Task 1.
- Tasks 5-8 and 12 can be parallelized once their respective dependencies complete.
- Task 13 is a key integration point that connects hooks to store and API routes.
- Task 14 is the final assembly step before testing.
- CodeMirror 6 packages are tree-shakeable; only import needed extensions to minimize bundle.
- Web Worker must be a separate file (executionWorker.ts) for Next.js bundling compatibility.
