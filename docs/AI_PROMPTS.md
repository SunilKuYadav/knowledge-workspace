# AI Prompts Reference

Complete inventory of all AI prompts in the Knowledge Workspace application.
All prompts are centralized in `src/ai/prompts/`.

---

## Architecture

```
src/ai/prompts/
├── system/          # Composable personality/behavior modules (static defaults)
├── builders/        # Feature-specific prompt builders (functions)
├── artifacts/       # Topic artifact generation instructions
├── schemas/        # JSON output schema instructions
├── utils/           # Composition & formatting helpers
├── config.ts        # Experience-level-aware dynamic prompt generators
├── loadConfig.ts    # Server-side config loader from workspace
└── index.ts         # Public API re-exports
```

Prompts are built using either:
- `composePrompt()` — joins static system modules with a task instruction (legacy)
- `composeWithConfig()` — joins experience-calibrated modules with a task instruction (preferred)

---

## Prompt Configuration System

The prompt system is **user-configurable** via `/settings` (UI) or the config file at
`~/knowledge-workspace/.config/prompt-config.json`.

### Experience Levels

| Level | Target | Teaching Depth |
|-------|--------|----------------|
| **1 year (default)** | Junior/Mid (L3/L4) | Step-by-step explanations, visual analogies, building blocks |
| 5 years | Senior (L4/L5) | Clear foundations, practical examples, pattern recognition |
| 10 years | Staff (L5/L6) | First principles, formal analysis, production depth |
| 15 years | Principal (L6/L7) | Architectural thinking, skip fundamentals, organizational impact |

### Config Schema (`PromptConfig`)

```typescript
{
  experienceLevel: 1 | 5 | 10 | 15,        // Default: 1
  targetRole: string,                    // Default: "Junior/Mid Engineer (L3/L4)"
  targetCompanies: string[],             // Default: ["Google", "Meta", "Microsoft", "Amazon", "Apple"]
  overrides: {                           // Per-action customization (optional)
    [actionKey]: {
      append?: string,                   // Additional instructions appended to generated prompt
      replace?: string,                  // Completely replaces the generated prompt
    }
  }
}
```

### Configurable Prompt Actions

| Action Key | Config Function | Affected By |
|------------|----------------|-------------|
| `identity` | `buildIdentityPrompt(config)` | Experience level, target role, companies |
| `teaching` | `buildTeachingPrompt(config)` | Experience level (changes entire teaching framework) |
| `interview` | `buildInterviewPrompt(config)` | Experience level, companies (changes evaluation bar) |
| `dsa` | `buildDSAPrompt(config)` | Experience level, companies |
| `systemDesign` | `buildSystemDesignPrompt(config)` | Experience level, companies |
| `revision` | `buildRevisionPrompt(config)` | Experience level |
| `codingInterview` | `buildCodingInterviewPrompt(config)` | Experience level, companies |

### APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings/prompt-config` | GET | Read current config (or defaults) |
| `/api/settings/prompt-config` | PUT | Save updated config |
| `/api/settings/prompt-preview` | POST | Preview final prompts for a given config |

---

## System Context Modules

Reusable building blocks that define the AI persona and behavior.
These are the **static defaults** — when the prompt config system is active,
experience-calibrated versions are generated dynamically by `config.ts`.

Each module is prepended to the prompt via `composePrompt({ modules: [...], task })`
or dynamically via `composeWithConfig({ actionKeys: [...], task, config })`.

| Module | File | Purpose |
|--------|------|---------|
| `IDENTITY_CONTEXT` | `system/identity.ts` | Staff Engineer persona, TypeScript-first rule |
| `TEACHING_CONTEXT` | `system/teaching.ts` | First-principles teaching order (Problem → Why → Intuition → …) |
| `INTERVIEW_CONTEXT` | `system/interview.ts` | Google-interviewer thinking: edge cases, follow-ups, trade-offs |
| `ENGINEERING_CONTEXT` | `system/engineering.ts` | Always discuss engineering trade-offs |
| `CODING_CONTEXT` | `system/coding.ts` | Code writing guidelines (readability, edge cases, complexity) |
| `MARKDOWN_CONTEXT` | `system/markdown.ts` | Markdown formatting rules (headings, tables, code blocks) |
| `JSON_CONTEXT` | `system/json.ts` | Strict JSON-only output rules |
| `SAFETY_CONTEXT` | `system/safety.ts` | No hallucination, no outdated info, cite trade-offs |
| `KNOWLEDGE_CONTEXT` | `system/knowledge.ts` | Connect topics into a learning graph |
| `DSA_CONTEXT` | `system/dsa.ts` | Algorithm problem explanation structure |
| `SYSTEM_DESIGN_CONTEXT` | `system/system-design.ts` | System design discussion template |
| `REVISION_CONTEXT` | `system/revision.ts` | Optimize for long-term memory retention |

---

## Prompt Builders

### General Content

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildSummaryPrompt(content)` | `builders/summary.ts` | AI Sidebar | Summarize technical content with bullet points |
| `buildExplainPrompt(concept, context)` | `builders/explain.ts` | AI Sidebar | Explain a concept for interview prep |
| `buildGenerateTextPrompt(prompt, context?)` | `builders/content.ts` | Markdown Editor AI | Generate markdown content from user request |
| `buildCustomGeneralPrompt(prompt)` | `builders/content.ts` | AI Sidebar (general) | Answer a freeform question |
| `buildCustomItemPrompt(prompt, type, content)` | `builders/content.ts` | AI Sidebar (item context) | Answer question about a specific topic/problem |
| `buildArtifactPrompt(topic, category, artifact)` | `builders/content.ts` | Topic page generation | Generate a full artifact (overview, notes, etc.) |
| `buildGenerateContentPrompt(answers, content, type, contentType)` | `builders/content.ts` | Post-review content gen | Generate/update study material from review session |

### Quiz & Flashcards

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildQuizPrompt(content)` | `builders/quiz.ts` | AI Sidebar | Generate 5 MCQ questions from content |
| `buildFlashcardsPrompt(content)` | `builders/flashcards.ts` | AI Sidebar | Generate 5–10 flashcards from content |

### Interview Prep

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildInterviewPrepPrompt(title, platform, difficulty, patterns)` | `builders/interview.ts` | Problem page | Generate interview prep material for a problem |
| `buildSimilarProblemsPrompt(title, platform, difficulty, patterns, companies)` | `builders/interview.ts` | Problem page | Suggest 5 similar problems |

### Form Parsing (NL → Structured Data)

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildTopicParsePrompt(text)` | `builders/parser.ts` | Create page | Extract topic metadata from natural language |
| `buildProblemParsePrompt(text)` | `builders/parser.ts` | Create page | Extract problem metadata from natural language |

### Prompt Enhancement

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildEnhancePromptForTopic(text)` | `builders/enhance.ts` | Create page | Refine vague topic description into structured prompt |
| `buildEnhancePromptForProblem(text)` | `builders/enhance.ts` | Create page | Refine vague problem description into structured prompt |
| `buildEnhancePromptForText(text, context?)` | `builders/enhance.ts` | Markdown Editor | Refine vague writing prompt into clear instructions |

### Spaced Repetition Review

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildReviewPrompt(content, itemType, confidence)` | `builders/review.ts` | Review session | Generate 3 review questions adjusted to confidence |
| `buildEvaluationPrompt(question, response, type, content, itemType)` | `builders/review.ts` | Review session | Evaluate student answer (score 1–5) |
| `buildHintPrompt(question, type, content)` | `builders/review.ts` | Review session | Give a hint without revealing the answer |
| `buildSessionSummaryPrompt(answers, content, itemType)` | `builders/review.ts` | Review session | Summarize session with confidence recommendation |

### Coding Interview Module

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildProblemGenerationPrompt(params)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/generate-problem` | Generate a complete coding problem with test cases |
| `buildEvaluatePrompt(code, language, problem, testResults)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/evaluate` | Evaluate submitted solution across 6 dimensions |
| `buildCodingInterviewHintPrompt(params)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/hint` | Progressive hints (4 levels: clarify → pseudocode) |
| `buildOpeningFollowUpPrompt(params)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/follow-up` | Generate opening follow-up question after submission |
| `buildFollowUpPrompt(params)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/follow-up` | Generate adaptive follow-up based on conversation |
| `buildScorePrompt(evaluation, history, code, hints, execCount, elapsed, duration)` | `builders/coding-interview.ts` | `/api/ai/coding-interview/score` | Score session across 7 dimensions + generate summary |

### Problem Management

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildGenerateDescriptionPrompt(params)` | `builders/problem.ts` | `/api/ai/problem/generate-description` | Generate full problem description with test cases |
| `buildGenerateNotePrompt(params)` | `builders/problem.ts` | `/api/ai/problem/generate-note` | Generate "key things to remember" note from solution |
| `buildGenerateVariationPrompt(params)` | `builders/problem.ts` | `/api/ai/problem/generate-variation` | Generate a problem variation testing same patterns |
| `buildGenerateTestCasesPrompt(params)` | `builders/problem.ts` | `/api/ai/problem/generate-test-cases` | Generate comprehensive categorized test suite |

### Topic Problem Generation

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildSuggestProblemsPrompt(params, level, role)` | `builders/topic-problems.ts` | `/api/ai/topic/suggest-problems` | Suggest 5-8 coding problems for a topic |
| `buildGenerateProblemFromTopicPrompt(params, level)` | `builders/topic-problems.ts` | `/api/ai/topic/generate-problem` | Generate a complete problem from topic metadata |

### Solution Evaluation

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildEvaluateSolutionPrompt(params, level, role)` | `builders/solution-evaluation.ts` | `/api/ai/problem/evaluate-solution` | Evaluate submitted code with experience-calibrated scoring |

### Test Validation

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildProblemTestValidationPrompt(params)` | `builders/test-validation.ts` | `/api/ai/problem/validate-test-cases` | Validate test case correctness for problem descriptions |
| `buildCodingInterviewTestValidationPrompt(problem)` | `builders/test-validation.ts` | `/api/ai/coding-interview/validate-test-cases` | Validate hidden test cases for coding interview problems |

### Evaluation Actions (AI Sidebar)

| Builder | File | Used By | Purpose |
|---------|------|---------|---------|
| `buildEvaluationActionPrompt(action, ctx, config)` | `builders/evaluation-actions.ts` | `/api/ai` (sidebar) | Post-evaluation actions: improve solution, generate notes, alternative approach, follow-up suggestions |

---

## Artifact Prompts

Each artifact type has detailed generation instructions in `artifacts/`.
Used by `buildArtifactPrompt()` when generating topic study materials.

| Artifact Type | File | What It Generates |
|--------------|------|-------------------|
| `overview` | `artifacts/overview.ts` | Topic intro (what, why, analogy, workflow) — under 10 min read |
| `notes` | `artifacts/notes.ts` | Deep study notes (concepts, internals, complexity, diagrams) |
| `patterns` | `artifacts/patterns.ts` | Recognition-first interview patterns with templates |
| `mistakes` | `artifacts/mistakes.ts` | Mistakes by experience level (beginner → senior → interview) |
| `implementation` | `artifacts/implementation.ts` | Implementation guide (pseudocode, TypeScript, templates, bugs) |
| `examples` | `artifacts/examples.ts` | Progressive examples (beginner → real-world at scale) |
| `interview` | `artifacts/interview.ts` | Interview prep (FAANG questions, follow-ups, whiteboard guide) |
| `cheatsheet` | `artifacts/cheatsheet.ts` | One-page revision sheet (dense, no fluff, tables only) |

---

## JSON Schema Instructions

Embedded in prompts to enforce structured output format.

| Schema | File | Output Format |
|--------|------|---------------|
| `QUIZ_SCHEMA` | `schemas/quiz.ts` | Array of `{ question, options[], correctIndex, explanation }` |
| `FLASHCARDS_SCHEMA` | `schemas/flashcards.ts` | Array of `{ front, back, tags[] }` |
| `REVIEW_QUESTIONS_SCHEMA` | `schemas/review.ts` | Array of `{ type, question, expectedAnswer, difficulty }` |
| `EVALUATION_SCHEMA` | `schemas/review.ts` | `{ score, mistakes[], correctAnswer, keyInsights[], feedback }` |
| `SESSION_SUMMARY_SCHEMA` | `schemas/review.ts` | `{ recommendedConfidence, allMistakes[], focusAreas[], summary }` |
| `TOPIC_PARSE_SCHEMA` | `schemas/topic.ts` | `{ title, category, difficulty, tags[] }` |
| `PROBLEM_PARSE_SCHEMA` | `schemas/problem.ts` | `{ title, platform, difficulty, companies[], patterns[], url }` |
| `SIMILAR_PROBLEMS_SCHEMA` | `schemas/similar.ts` | Array of problem name strings |

---

## Utilities

| Function | File | Purpose |
|----------|------|---------|
| `composePrompt({ modules, task })` | `utils/compose.ts` | Join static system modules + task into final prompt string |
| `composeWithConfig({ actionKeys, extraModules?, task, config })` | `utils/compose.ts` | Join experience-calibrated modules + task (preferred) |
| `getPromptForAction(actionKey, config)` | `config.ts` | Get final prompt text for an action with overrides applied |
| `loadPromptConfig()` | `loadConfig.ts` | Server-side: load user config from workspace (cached 5s) |
| `section(label, content)` | `utils/format.ts` | Wrap content with `## label` header |
| `field(key, value)` | `utils/format.ts` | Format a `key: value` line |
| `metadata(fields)` | `utils/format.ts` | Format array of key-value pairs |
| `joinBlocks(...blocks)` | `utils/format.ts` | Join content blocks with double newlines |

---

## Usage Examples

```typescript
import {
  composePrompt,
  composeWithConfig,
  loadPromptConfig,
  getPromptForAction,
  IDENTITY_CONTEXT,
  TEACHING_CONTEXT,
  MARKDOWN_CONTEXT,
  buildArtifactPrompt,
  buildProblemGenerationPrompt,
  buildSuggestProblemsPrompt,
  buildEvaluateSolutionPrompt,
  buildEvaluationActionPrompt,
  buildProblemTestValidationPrompt,
  buildCodingInterviewTestValidationPrompt,
  buildGenerateProblemFromTopicPrompt,
} from "@/ai/prompts";

// ─── Legacy: Static module composition ───
const prompt = composePrompt({
  modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
  task: "Explain binary search trees.",
});

// ─── Preferred: Config-aware composition ───
const config = await loadPromptConfig(); // loads from workspace or defaults (1 YOE)

const configPrompt = composeWithConfig({
  actionKeys: ["identity", "teaching"],
  extraModules: [MARKDOWN_CONTEXT],
  task: "Explain binary search trees.",
  config,
});

// ─── Get a single action's final prompt ───
const interviewPrompt = getPromptForAction("interview", config);

// ─── Builders ───
const artifactPrompt = buildArtifactPrompt("Binary Search", "dsa", "notes");

const problemPrompt = buildProblemGenerationPrompt({
  source: "practice",
  difficulty: "medium",
  language: "typescript",
});

// ─── Topic problem suggestions (experience-calibrated) ───
const suggestPrompt = buildSuggestProblemsPrompt(
  { topicId: "...", topicTitle: "Binary Search", category: "dsa", tags: ["binary-search"], difficulty: "medium", artifactContent: "..." },
  config.experienceLevel,
  config.targetRole,
);

// ─── Solution evaluation (experience-calibrated) ───
const evalPrompt = buildEvaluateSolutionPrompt(
  { code: "...", problemId: "...", title: "Two Sum", description: "...", difficulty: "easy", patterns: ["hash-map"], constraints: ["..."], testResults: [] },
  config.experienceLevel,
  config.targetRole,
);

// ─── Evaluation follow-up actions ───
const followUpPrompt = buildEvaluationActionPrompt("eval-followup", evaluationContext, config);
```
