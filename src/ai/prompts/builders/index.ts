/**
 * Prompt builders — each function produces a composed prompt for a specific feature.
 */

export { buildSummaryPrompt } from "./summary";
export { buildExplainPrompt } from "./explain";
export {
  buildInterviewPrepPrompt,
  buildSimilarProblemsPrompt,
} from "./interview";
export { buildQuizPrompt } from "./quiz";
export { buildFlashcardsPrompt } from "./flashcards";
export { buildTopicParsePrompt, buildProblemParsePrompt } from "./parser";
export {
  buildEnhancePromptForTopic,
  buildEnhancePromptForProblem,
  buildEnhancePromptForText,
} from "./enhance";
export {
  buildGenerateTextPrompt,
  buildCustomGeneralPrompt,
  buildCustomItemPrompt,
  buildGenerateContentPrompt,
  buildArtifactPrompt,
} from "./content";
export {
  buildReviewPrompt,
  buildEvaluationPrompt,
  buildHintPrompt,
  buildSessionSummaryPrompt,
} from "./review";

// ─── Coding Interview Module ────────────────────────────────────────────────
export {
  buildProblemGenerationPrompt,
  buildEvaluatePrompt,
  buildCodingInterviewHintPrompt,
  buildOpeningFollowUpPrompt,
  buildFollowUpPrompt,
  buildScorePrompt,
  FOLLOW_UP_TOPIC_AREAS,
  MAX_INTERVIEWER_QUESTIONS,
} from "./coding-interview";
export type {
  GenerateProblemParams,
  HintParams,
  FollowUpParams,
} from "./coding-interview";

// ─── Problem Module ─────────────────────────────────────────────────────────
export {
  buildGenerateDescriptionPrompt,
  buildGenerateNotePrompt,
  buildGenerateVariationPrompt,
} from "./problem";
export type {
  GenerateDescriptionParams,
  GenerateNoteParams,
  GenerateVariationParams,
} from "./problem";

// ─── Creation Assist Module ─────────────────────────────────────────────────
export {
  buildTopicCreationAssistPrompt,
  buildProblemCreationAssistPrompt,
  buildStudyPlanPrompt,
} from "./creation-assist";
export type {
  TopicCreationAssistParams,
  ProblemCreationAssistParams,
  StudyPlanGenerationParams,
} from "./creation-assist";
