export { createAIClient, createOllamaClient } from './client';
export type { AIClient, AIClientOptions, OllamaClient } from './client';

export { logInput, logOutput, logError, installAIFetchLogger } from './logger';

export { generateSummary } from './summarize';

export { generateQuiz } from './generateQuiz';
export type { QuizQuestion } from './generateQuiz';

export { generateFlashcards } from './generateFlashcards';

export { explainConcept, suggestSimilarProblems, generateInterviewPrep } from './explain';

export { getAIStatus, startHealthCheck, stopHealthCheck } from './status';

export { SYSTEM_CONTEXT, withContext } from './prompts';
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
} from './prompts';
