import type { TopicFormData, ProblemFormData, FormType } from "./types";

/**
 * Calls the AI enhance-prompt endpoint to refine a rough user prompt
 * into a more detailed, structured version before form parsing.
 */
export async function enhancePromptWithAI(
  text: string,
  formType: FormType,
): Promise<string> {
  const response = await fetch("/api/ai/enhance-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), formType }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Failed to enhance prompt");
  }

  return json.enhanced;
}

/**
 * Calls the AI parse-form endpoint to extract structured form data
 * from a natural language description.
 */
export async function parseFormWithAI(
  text: string,
  formType: FormType,
): Promise<TopicFormData | ProblemFormData> {
  const response = await fetch("/api/ai/parse-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), formType }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Failed to parse text");
  }

  return json.data;
}

/**
 * Topic creation assist response shape.
 */
export interface TopicCreationAssistResult {
  prerequisites: string[];
  relatedTopics: string[];
  suggestedPrerequisites: string[];
  estimatedMinutes: number;
  overview: string;
}

/**
 * Problem creation assist response shape.
 */
export interface ProblemCreationAssistResult {
  relatedTopicIds: string[];
  suggestedTopics: string[];
  similarProblemIds: string[];
  readinessAssessment: string;
  suggestedPatterns: string[];
}

/**
 * Calls the AI creation-assist endpoint to get intelligent suggestions
 * for a topic being created (prerequisites, related topics, skeleton overview).
 */
export async function getTopicCreationAssist(params: {
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
}): Promise<TopicCreationAssistResult> {
  const response = await fetch("/api/ai/creation-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "topic", ...params }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Failed to get creation suggestions");
  }

  return json.suggestions;
}

/**
 * Calls the AI creation-assist endpoint to get intelligent suggestions
 * for a problem being created (related topics, readiness, similar problems).
 */
export async function getProblemCreationAssist(params: {
  title: string;
  platform: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
}): Promise<ProblemCreationAssistResult> {
  const response = await fetch("/api/ai/creation-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "problem", ...params }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Failed to get creation suggestions");
  }

  return json.suggestions;
}
