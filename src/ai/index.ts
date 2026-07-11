export { createAIClient, modelConfigToParams } from "./client";
export type { AIClient, AIClientOptions, InferenceParams } from "./client";

// New config system (preferred)
export {
  CONTEXT_PROFILE,
  MODEL_CONFIG,
  getInferenceConfig,
  getTierForRoute,
  getModelCapabilities,
  resolveInference,
  resolveInferenceForTier,
  toRequestParams,
} from "./config";
export type {
  ModelTier,
  ModelConfig,
  ModelCapabilities,
  ContextProfileKey,
  InferenceRequest,
} from "./config";

// Legacy exports — thin wrappers for backward compatibility
export { getModelForRoute, getModel, getAllModels } from "./model-router";

export { modelManager, ensureModelLoaded } from "./model-manager";
export { getReadyClient, getReadyClientForTier, getInferenceConfigForRoute } from "./llm";

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
