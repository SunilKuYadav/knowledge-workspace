export { createAIClient } from "./client";
export type { AIClient, AIClientOptions } from "./client";
export { getModelForRoute, getModel, getAllModels } from "./model-router";
export type { ModelTier } from "./model-router";
export { modelManager, ensureModelLoaded } from "./model-manager";
export { getReadyClient, getReadyClientForTier } from "./llm";

export { logInput, logOutput, logError, installAIFetchLogger } from "./logger";

export { generateSummary } from "./summarize";

export { generateQuiz } from "./generateQuiz";
export type { QuizQuestion } from "./generateQuiz";

export { generateFlashcards } from "./generateFlashcards";

export {
  explainConcept,
  suggestSimilarProblems,
  generateInterviewPrep,
} from "./explain";

export { getAIStatus, startHealthCheck, stopHealthCheck } from "./status";

export { SYSTEM_CONTEXT, withContext } from "./prompts";
export {
  buildSummaryPrompt,
  buildExplainPrompt,
  buildInterviewPrepPrompt,
  buildSimilarProblemsPrompt,
  buildQuizPrompt,
  buildFlashcardsPrompt,
  buildTopicParsePrompt,
  buildProblemParsePrompt,
  buildGenerateTextPrompt,
  buildCustomGeneralPrompt,
  buildCustomItemPrompt,
  buildReviewPrompt,
  buildEvaluationPrompt,
  buildHintPrompt,
  buildSessionSummaryPrompt,
  buildGenerateContentPrompt,
} from "./prompts";
