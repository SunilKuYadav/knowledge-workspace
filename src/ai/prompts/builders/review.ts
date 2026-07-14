/**
 * Review session prompt builders.
 */
import { composePrompt, composeWithConfig } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";
import { INTERVIEW_CONTEXT } from "../system/interview";
import { TEACHING_CONTEXT } from "../system/teaching";
import { JSON_CONTEXT } from "../system/json";
import {
  REVIEW_QUESTIONS_SCHEMA,
  EVALUATION_SCHEMA,
  SESSION_SUMMARY_SCHEMA,
} from "../schemas/review";
import type { PromptConfig } from "@/types/PromptConfig";

export function buildReviewPrompt(
  content: string,
  itemType: "topic" | "problem",
  confidence: number,
  config?: PromptConfig,
): string {
  const difficultyLevel =
    confidence <= 2 ? "basic" : confidence <= 3 ? "intermediate" : "advanced";

  // Adjust what "advanced" means based on experience level
  const levelCalibration = config
    ? getLevelCalibrationForReview(config, difficultyLevel)
    : "";

  const questionTypes =
    itemType === "problem"
      ? `Mix of:
- "code": Ask the user to write code or pseudocode solving a variation of the problem
- "conceptual": Ask about the approach, time/space complexity, or trade-offs
- "debug": Show a buggy code snippet and ask them to identify/fix the issue
- "edge-case": Ask about edge cases or boundary conditions`
      : `Mix of:
- "conceptual": Ask about key concepts, definitions, or how things work
- "application": Ask to apply the concept to a scenario
- "comparison": Ask to compare/contrast related concepts
- "code": Ask to write a small code snippet demonstrating the concept`;

  const task = `You are conducting a spaced-repetition review session.

The user's current confidence level is ${confidence}/5 (${difficultyLevel}). Adjust question difficulty accordingly:
- For confidence 1-2: Focus on fundamentals, definitions, basic recall
- For confidence 3: Mix of recall and application
- For confidence 4-5: Advanced application, edge cases, optimization, trade-offs
${levelCalibration}
Generate exactly 3 review questions based on the following content.

Question types to include:
${questionTypes}

Content to review:
${content}

${REVIEW_QUESTIONS_SCHEMA}

JSON:`;

  if (config) {
    return composeWithConfig({
      actionKeys: ["identity", "interview"],
      extraModules: [JSON_CONTEXT],
      task,
      config,
    });
  }

  return composePrompt({
    modules: [IDENTITY_CONTEXT, INTERVIEW_CONTEXT, JSON_CONTEXT],
    task,
  });
}

export function buildEvaluationPrompt(
  question: string,
  userResponse: string,
  questionType: string,
  content: string,
  itemType: string,
  config?: PromptConfig,
): string {
  const levelExpectation = config
    ? `\nEvaluate at the bar expected for ${config.targetRole} (${config.experienceLevel}+ YOE). ${config.experienceLevel <= 1 ? "Be encouraging — a partially correct answer that shows understanding of the core concept is a 3-4. A correct answer with any edge case handling is a 5." : config.experienceLevel <= 5 ? "A correct answer is a 3. A correct answer with clear reasoning and edge case awareness is a 4-5." : config.experienceLevel >= 15 ? "Expect architectural depth, cross-system awareness, and novel insights for a 5. Correct-but-shallow is a 3." : "Expect production depth and formal reasoning for a 4-5. Textbook-correct is a 3."}`
    : "";

  const task = `Evaluate a student's response during a review session.
${levelExpectation}
Context (${itemType}):
${content}

Question (type: ${questionType}):
${question}

Student's Response:
${userResponse}

Evaluate the response and provide:
1. A score from 1-5 (1=completely wrong, 2=mostly wrong, 3=partially correct, 4=mostly correct, 5=perfect)
2. A list of specific mistakes or gaps in understanding
3. The correct/ideal answer
4. Key insights they should remember

${EVALUATION_SCHEMA}

JSON:`;

  if (config) {
    return composeWithConfig({
      actionKeys: ["identity", "teaching"],
      extraModules: [JSON_CONTEXT],
      task,
      config,
    });
  }

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task,
  });
}

export function buildHintPrompt(
  question: string,
  questionType: string,
  content: string,
  config?: PromptConfig,
): string {
  const hintStyle = config
    ? config.experienceLevel <= 1
      ? "Be warm and encouraging. Give a concrete nudge that helps them take the next step. Use simple language."
      : config.experienceLevel <= 5
        ? "Give a targeted hint that points toward the key insight without revealing the full answer."
        : config.experienceLevel >= 15
          ? "Give a subtle hint — a question or framing that helps them see the problem differently. Don't simplify."
          : "Point toward the principle or technique they should apply. Be concise."
    : "";

  const task = `The student is stuck on a review question and needs a hint.

Question (type: ${questionType}):
${question}

Reference material:
${content}

Provide a helpful hint that guides them toward the answer without giving it away directly. Be concise (2-3 sentences). Point them in the right direction.${hintStyle ? `\n\n${hintStyle}` : ""}

Hint:`;

  if (config) {
    return composeWithConfig({
      actionKeys: ["identity", "teaching"],
      extraModules: [],
      task,
      config,
    });
  }

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT],
    task,
  });
}

export function buildSessionSummaryPrompt(
  answers: Array<{
    question: string;
    response: string;
    score: number;
    mistakes: string[];
  }>,
  content: string,
  itemType: string,
  config?: PromptConfig,
): string {
  const answersText = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.question}\nResponse: ${a.response}\nScore: ${a.score}/5\nMistakes: ${a.mistakes.join("; ") || "None"}`,
    )
    .join("\n\n");

  const levelContext = config
    ? `\nThe user is preparing for ${config.targetRole} roles (${config.experienceLevel}+ YOE) at ${config.targetCompanies.join(", ")}. Calibrate your focus areas and recommendations to what matters most at this level.`
    : "";

  const task = `Provide a session summary after a review.

Item type: ${itemType}${levelContext}
Reference content:
${content}

Session results:
${answersText}

Based on the session, provide:
1. An overall confidence score recommendation (1-5) for updating the spaced repetition schedule
2. A list of all mistakes made across the session (consolidated, no duplicates)
3. Key areas to focus on for next review
4. A brief encouraging summary

${SESSION_SUMMARY_SCHEMA}

JSON:`;

  if (config) {
    return composeWithConfig({
      actionKeys: ["identity", "teaching"],
      extraModules: [JSON_CONTEXT],
      task,
      config,
    });
  }

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task,
  });
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function getLevelCalibrationForReview(
  config: PromptConfig,
  difficultyLevel: string,
): string {
  if (config.experienceLevel <= 1) {
    if (difficultyLevel === "basic") {
      return `\nAt this user's level (${config.targetRole}), "basic" means: definitions, simple recall, "what does X do?" Focus on building solid fundamentals.`;
    }
    if (difficultyLevel === "intermediate") {
      return `\nAt this user's level (${config.targetRole}), "intermediate" means: applying concepts to simple scenarios, tracing through small examples, comparing two approaches.`;
    }
    return `\nAt this user's level (${config.targetRole}), "advanced" means: writing code for a straightforward variation, handling basic edge cases, explaining trade-offs in simple terms. Do NOT ask L5/L6-level questions.`;
  }

  if (config.experienceLevel <= 5) {
    if (difficultyLevel === "advanced") {
      return `\nAt this user's level (${config.targetRole}), "advanced" means: optimizing solutions, identifying non-obvious edge cases, discussing when this approach is the wrong choice, and writing code for variations.`;
    }
    return "";
  }

  if (config.experienceLevel >= 15) {
    if (difficultyLevel === "basic") {
      return `\nEven at "basic" confidence for this user's level (${config.targetRole}), ask questions at a senior depth — focus on recall of nuanced details, not elementary definitions.`;
    }
    if (difficultyLevel === "advanced") {
      return `\nAt this user's level (${config.targetRole}), "advanced" means: system-level implications, architectural trade-offs, cross-domain connections, and problems that require novel insight.`;
    }
    return "";
  }

  // 10 YOE
  if (difficultyLevel === "advanced") {
    return `\nAt this user's level (${config.targetRole}), "advanced" means: production-level edge cases, formal complexity analysis, system-level trade-offs, and the type of follow-up a Staff interviewer would ask.`;
  }
  return "";
}
