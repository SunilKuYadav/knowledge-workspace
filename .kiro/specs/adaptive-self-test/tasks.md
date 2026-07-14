# Implementation Plan: Adaptive Self-Test

## Overview

This implementation plan breaks down the Adaptive Self-Test feature into 20 tasks, starting with foundational types and pure logic, then building the persistence layer, AI integration, UI components, and finally wiring everything together with topic status management.

## Tasks

- [x] 1. Create core types, schemas, and constants
  Create `app/self-test/lib/types.ts` with all Zod schemas (AssessmentPhaseTypeSchema, DifficultyLevelSchema, AssessmentStatusSchema, TrendIndicatorSchema, ConceptualQuestionSchema, MCQQuestionSchema, AppliedQuestionSchema, CodeChallengeQuestionSchema, AssessmentQuestionSchema discriminated union, QuestionEvaluationSchema, PhaseResultSchema, FeedbackReportSchema, AssessmentRecordSchema, AssessmentHistorySchema) with all inferred TypeScript types exported. Create `app/self-test/lib/constants.ts` with phase configuration (ordered array of phase types), scoring weights (conceptual: 0.2, mcq: 0.2, applied: 0.3, code-challenge: 0.3), thresholds (COMPLETION_THRESHOLD=4.5, EARLY_EXIT_THRESHOLD=3, DIFFICULTY_UP_THRESHOLD=8, DIFFICULTY_DOWN_THRESHOLD=4, MAX_HISTORY_RECORDS=50, CONTENT_TRUNCATION_LIMIT=12000), and phase question counts (min: 2, max: 3). Create `app/self-test/lib/validation.ts` with truncateContent(content, limit?) function that truncates to 12,000 chars and validateAIResponse<T>(schema, data) helper.

  **Requirements:** 3.3, 4.1, 4.3, 4.4, 6.4, 7.2

  **Files:**
  - `app/self-test/lib/types.ts` — All Zod schemas and inferred TypeScript types
  - `app/self-test/lib/constants.ts` — Phase config, scoring weights, thresholds
  - `app/self-test/lib/validation.ts` — truncateContent and validateAIResponse helpers

- [x] 2. Implement pure scoring and difficulty functions
  Create `app/self-test/lib/scoring.ts` with computePhaseScore (average of scores rounded to 1 decimal), computeConfidenceScore (weighted average mapped to 1.0-5.0 rounded to nearest 0.5), computeTrend (requires 6+ records, compares last 3 vs preceding 3 averages with 0.5 threshold), extractWeakAreas (phases < 5/10, questions < 5/10). Create `app/self-test/lib/difficulty.ts` with deriveInitialDifficulty (confidence 1-2→easy, 3→medium, 4-5→hard; 15YOE shifts harder, 5YOE shifts easier, clamped) and adjustDifficulty (score ≥8→harder, ≤4→easier, 5-7→maintain, clamped). Create `app/self-test/__tests__/scoring.test.ts` and `app/self-test/__tests__/difficulty.test.ts` with unit tests and fast-check property tests (Properties 1-4, 11, 12).

  **Requirements:** 3.2, 3.4, 7.2, 9.6, 9.7, 10.1-10.7

  **Files:**
  - `app/self-test/lib/scoring.ts` — computePhaseScore, computeConfidenceScore, computeTrend, extractWeakAreas
  - `app/self-test/lib/difficulty.ts` — deriveInitialDifficulty, adjustDifficulty
  - `app/self-test/__tests__/scoring.test.ts` — Unit + property tests for scoring
  - `app/self-test/__tests__/difficulty.test.ts` — Unit + property tests for difficulty

- [x] 3. Create AssessmentRepository interface and filesystem implementation
  Create `src/repository/AssessmentRepository.ts` interface with getHistory, saveRecord, updateRecord, deleteRecord, getInProgressRecord methods. Create `src/filesystem/FileAssessmentRepository.ts` implementing the interface for notes/{category}/{slug}/assessment-history.json with max 50 records FIFO eviction, graceful missing file handling, and schema validation on read. Create `app/self-test/__tests__/history.test.ts` with unit tests for FIFO eviction and property tests (Property 10). Export from `src/repository/index.ts` barrel.

  **Requirements:** 5.2, 5.3, 5.5, 9.1, 9.4

  **Files:**
  - `src/repository/AssessmentRepository.ts` — Interface definition
  - `src/filesystem/FileAssessmentRepository.ts` — Filesystem implementation
  - `app/self-test/__tests__/history.test.ts` — Unit + property tests
  - `src/repository/index.ts` — Barrel export

- [x] 4. Create server actions for assessment persistence
  Create `app/self-test/actions/assessment-actions.ts` with startAssessmentAction (creates in-progress record), checkpointPhaseAction (updates record with phase data), completeAssessmentAction (marks completed, creates RevisionEntry, git commits), deleteRecordAction (removes record, git commits), loadAssessmentHistoryAction (reads history), getInProgressAction (returns in-progress record or null). Create `app/self-test/actions/content-actions.ts` with updateTopicContentAction (saves via FileTopicRepository.saveContent, git commits) and loadTopicContentAction (reads artifact content).

  **Requirements:** 5.2, 5.3, 5.5, 8.4, 9.1, 9.4, 9.8

  **Files:**
  - `app/self-test/actions/assessment-actions.ts` — Assessment CRUD server actions
  - `app/self-test/actions/content-actions.ts` — Content update server actions

- [x] 5. Create Zustand session store
  Create `app/self-test/store/assessmentStore.ts` as purely in-memory Zustand store (no persist middleware) managing session identity, status machine (idle/starting/in-phase/evaluating/phase-summary/early-exit/generating-feedback/summary/error), phase tracking, current questions and index, answer input, evaluation state, accumulated phaseResults, final feedbackReport and confidenceScore, loading/error flags. Implement all actions: startSession, resumeSession, setQuestions, setAnswer, submitEvaluation, nextQuestion, completePhase, advanceToNextPhase, setFeedbackReport, setError, setGenerating, reset. Create `app/self-test/__tests__/store.test.ts` with unit tests for state transitions and reset.

  **Requirements:** 5.1, 5.4, 5.7

  **Files:**
  - `app/self-test/store/assessmentStore.ts` — Zustand store definition
  - `app/self-test/__tests__/store.test.ts` — Unit tests for store

- [x] 6. Create AI API routes for question generation and evaluation
  Create `app/api/ai/assessment/generate/route.ts` (POST: generates 2-3 questions per phase type with difficulty/experience calibration, validates against question schemas). Create `app/api/ai/assessment/evaluate/route.ts` (POST: evaluates answer with 30-second timeout, validates against QuestionEvaluationSchema). Create `app/api/ai/assessment/feedback/route.ts` (POST: generates FeedbackReport with strengths/weaknesses/recommendations). Create `app/api/ai/assessment/content-update/route.ts` (POST: generates improved content from feedback context). Create `app/self-test/__tests__/schemas.test.ts` with validation tests (Properties 6, 7, 8).

  **Requirements:** 4.1-4.6, 6.1, 6.3, 7.1, 8.2

  **Files:**
  - `app/api/ai/assessment/generate/route.ts` — Question generation endpoint
  - `app/api/ai/assessment/evaluate/route.ts` — Answer evaluation endpoint
  - `app/api/ai/assessment/feedback/route.ts` — Feedback report endpoint
  - `app/api/ai/assessment/content-update/route.ts` — Content update endpoint
  - `app/self-test/__tests__/schemas.test.ts` — Schema validation tests

- [x] 7. Create AI prompt builders for assessment
  Create `src/ai/prompts/builders/assessment.ts` with buildQuestionGenerationPrompt (composes system modules with phase-specific instructions adapted to experience level), prompt templates for each phase type (conceptual, MCQ with distractors, applied scenarios, code-challenge with test cases), buildEvaluationPrompt (scores 0-10, feedback, mistakes, insights), buildFeedbackReportPrompt (strengths, weaknesses, recommendations mapped to artifact sections), and buildContentUpdatePrompt (improves content addressing identified gaps).

  **Requirements:** 4.1, 4.2, 6.1, 7.1, 8.2

  **Files:**
  - `src/ai/prompts/builders/assessment.ts` — All assessment prompt builders

- [x] 8. Create assessment session hooks
  Create `app/self-test/hooks/useAssessmentSession.ts` (main orchestration: initializes store, handles phase transitions, early-exit flow, triggers feedback generation). Create `useQuestionGeneration.ts` (calls /api/ai/assessment/generate, validates response, retry-once logic). Create `useAnswerEvaluation.ts` (MCQ: local evaluation; others: AI call with 30s timeout). Create `useFeedbackReport.ts` (calls feedback API, computes deterministic confidence, handles AI failure gracefully). Create `useContentUpdate.ts` (loads content, calls content-update API, manage confirm/discard). Create `useAssessmentHistory.ts` (loads history, CRUD operations, computes trend). Create `app/self-test/__tests__/mcq-evaluation.test.ts` with property tests (Property 5).

  **Requirements:** 3.1-3.6, 4.5, 5.4, 5.6, 5.7, 6.1-6.5, 7.1-7.5, 8.1-8.6, 9.2-9.5, 10.1-10.7

  **Files:**
  - `app/self-test/hooks/useAssessmentSession.ts` — Main session orchestration
  - `app/self-test/hooks/useQuestionGeneration.ts` — Question generation hook
  - `app/self-test/hooks/useAnswerEvaluation.ts` — Answer evaluation hook
  - `app/self-test/hooks/useFeedbackReport.ts` — Feedback report hook
  - `app/self-test/hooks/useContentUpdate.ts` — Content update hook
  - `app/self-test/hooks/useAssessmentHistory.ts` — History CRUD hook
  - `app/self-test/__tests__/mcq-evaluation.test.ts` — MCQ evaluation property tests

- [x] 9. Create assessment UI components — launcher, phase header, question cards
  Create AssessmentLauncher.tsx (start button disabled if not-started, resume prompt for in-progress, start new alongside history). Create PhaseHeader.tsx (phase name, number 1-4, progress dots, difficulty badge, question progress). Create QuestionCard.tsx (dispatches to TextAnswer/MCQOptions/CodeEditor by type). Create MCQOptions.tsx (4 radio options, highlights correct/incorrect, shows explanations). Create TextAnswer.tsx (textarea for conceptual/applied). Create CodeEditor.tsx (CodeMirror for code challenges with problem statement and examples).

  **Requirements:** 2.3, 3.1, 5.4, 5.7, 6.2

  **Files:**
  - `app/self-test/components/assessment-launcher/AssessmentLauncher.tsx`
  - `app/self-test/components/phase-header/PhaseHeader.tsx`
  - `app/self-test/components/question-card/QuestionCard.tsx`
  - `app/self-test/components/mcq-options/MCQOptions.tsx`
  - `app/self-test/components/text-answer/TextAnswer.tsx`
  - `app/self-test/components/code-editor/CodeEditor.tsx`

- [x] 10. Create assessment UI components — evaluation, phase summary, early exit
  Create EvaluationCard.tsx (score badge color-coded, feedback text, mistakes list, key insights, expected answer, next button). Create PhaseSummary.tsx (phase score with progress bar, per-question breakdown, difficulty badge, continue button). Create EarlyExitPrompt.tsx (recommendation message, 2-5 study recommendations, End Session and Continue Anyway buttons).

  **Requirements:** 3.2, 3.5, 3.6, 6.2, 6.4, 10.1-10.3

  **Files:**
  - `app/self-test/components/evaluation-card/EvaluationCard.tsx`
  - `app/self-test/components/phase-summary/PhaseSummary.tsx`
  - `app/self-test/components/early-exit-prompt/EarlyExitPrompt.tsx`

- [x] 11. Create assessment UI components — feedback report and content update
  Create FeedbackReport.tsx (overall Confidence_Score, per-phase progress bars with pass/fail badges, strengths/weaknesses lists, study recommendations, Mark as Completed button if score >= 4.5, Update Content buttons). Create ContentUpdatePreview.tsx (diff view original vs AI-suggested, Confirm/Discard buttons, loading state). Create TrendIndicator.tsx (up Improving green, right Stable gray, down Declining red badges).

  **Requirements:** 7.3, 7.4, 8.1-8.6, 9.6

  **Files:**
  - `app/self-test/components/feedback-report/FeedbackReport.tsx`
  - `app/self-test/components/content-update-preview/ContentUpdatePreview.tsx`
  - `app/self-test/components/trend-indicator/TrendIndicator.tsx`

- [x] 12. Create assessment history UI components
  Create HistoryList.tsx (chronological list with date, Confidence_Score, mini phase scores, trend badge, View Details/Delete/Retry Weak Areas buttons per record, empty state). Create HistoryDetail.tsx (expandable sections per phase showing questions, user answer, AI expected answer, per-question score and feedback, overall summary, close button).

  **Requirements:** 9.2, 9.3, 9.4, 9.5, 9.7

  **Files:**
  - `app/self-test/components/history-list/HistoryList.tsx`
  - `app/self-test/components/history-detail/HistoryDetail.tsx`

- [x] 13. Create SelfTestModule root component and page route
  Create `app/self-test/SelfTestModule.tsx` as root client component receiving SelfTestModuleProps (topicId, topic, artifacts), initializes Zustand store, coordinates between views based on store status (launcher/active session/phase summary/feedback/history). Create `app/self-test/page.tsx` as server component that reads topicId from searchParams, loads topic, artifacts, and history, passes to SelfTestModule. Add navigation to topic detail page linking to /self-test?topicId={id}.

  **Requirements:** 2.3, 5.4, 9.2, 9.10

  **Files:**
  - `app/self-test/SelfTestModule.tsx` — Root client component
  - `app/self-test/page.tsx` — Server component page route

- [x] 14. Implement Mark In-Progress button and topic status server action
  Create `app/self-test/actions/status-actions.ts` with markTopicInProgressAction (calls TopicService.updateTopic with status: "in-progress") and markTopicCompletedAction (updates status to "completed", creates RevisionEntry, git commits). Create MarkInProgressButton client component (shows when status is "not-started", disables during request, hides otherwise, error toast on failure). Integrate into `app/topics/[id]/page.tsx` header.

  **Requirements:** 1.1, 1.2, 1.3, 1.4, 2.2

  **Files:**
  - `app/self-test/actions/status-actions.ts` — Topic status server actions
  - `app/self-test/components/mark-in-progress-button/MarkInProgressButton.tsx`
  - `app/topics/[id]/page.tsx` — Integration of MarkInProgressButton

- [x] 15. Implement topic completion flow via assessment confidence gate
  In FeedbackReport.tsx, conditionally render "Mark as Completed" button only when confidenceScore >= 4.5, calling markTopicCompletedAction. When score < 4.5 display per-phase breakdown and improvement areas without completion option. Handle completion failures with error message and retry. In AssessmentLauncher disable start when topic.status === "not-started".

  **Requirements:** 2.1, 2.2, 2.3, 2.4, 2.5

  **Files:**
  - `app/self-test/components/feedback-report/FeedbackReport.tsx` — Add completion gate
  - `app/self-test/components/assessment-launcher/AssessmentLauncher.tsx` — Add status check

- [x] 16. Wire up adaptive difficulty calibration in session flow
  In useAssessmentSession, call deriveInitialDifficulty(topic.confidence, experienceLevel) at session start. After each phase, call adjustDifficulty(currentDifficulty, phaseScore) for next phase. On early-exit decline, reduce difficulty one level. Pass previous phase scores and incorrect questions to AI generation for subsequent phases.

  **Requirements:** 3.4, 3.5, 3.6, 10.1-10.7

  **Files:**
  - `app/self-test/hooks/useAssessmentSession.ts` — Add difficulty calibration logic

- [x] 17. Implement assessment history CRUD and trend display
  In useAssessmentHistory hook implement loadHistory, deleteRecord with optimistic UI, getRecordDetail, startRegeneratedTest (extracts weak areas, starts targeted session). Integrate HistoryList into SelfTestModule idle state. Compute and display trend via computeTrend only when 6+ records exist.

  **Requirements:** 9.1-9.10

  **Files:**
  - `app/self-test/hooks/useAssessmentHistory.ts` — History CRUD implementation
  - `app/self-test/SelfTestModule.tsx` — Integrate history list

- [x] 18. Implement content update flow from feedback
  In useContentUpdate implement requestUpdate (loads content, calls AI content-update API with feedback context), confirmUpdate (saves via updateTopicContentAction, git commits), discardUpdate (closes preview). Wire Update Content buttons in FeedbackReport to trigger flow, showing ContentUpdatePreview modal.

  **Requirements:** 8.1-8.6

  **Files:**
  - `app/self-test/hooks/useContentUpdate.ts` — Content update flow
  - `app/self-test/components/feedback-report/FeedbackReport.tsx` — Wire update buttons

- [x] 19. Integration testing and schema validation tests
  Create `app/self-test/__tests__/schemas.property.test.ts` with fast-check property tests for MCQ schema (Property 6), Code Challenge schema (Property 7), Evaluation bounds (Property 8). Create truncation.test.ts (Property 9). Create history.property.test.ts for FIFO eviction (Property 10) and trend (Property 11). Verify all 12 correctness properties pass with minimum 100 iterations.

  **Requirements:** 3.2, 4.1, 4.3, 4.4, 6.4, 7.2, 9.1, 9.6, 9.7, 10.1-10.7

  **Files:**
  - `app/self-test/__tests__/schemas.property.test.ts` — Schema property tests
  - `app/self-test/__tests__/truncation.test.ts` — Truncation property tests
  - `app/self-test/__tests__/history.property.test.ts` — History property tests

- [x] 20. Update existing SelfTestButton and integrate with topic detail page
  Update `src/components/self-test-button/` to navigate to /self-test?topicId={id} instead of opening modal. Remove/deprecate old useSelfTestButton modal logic. Verify topic detail page shows MarkInProgressButton (when not-started), SelfTestButton (routes to /self-test), and status badges update after completion.

  **Requirements:** 1.1-1.4, 2.3

  **Files:**
  - `src/components/self-test-button/` — Update navigation logic
  - `app/topics/[id]/page.tsx` — Verify integration
