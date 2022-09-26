/**
 * Review session prompt builders.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { INTERVIEW_CONTEXT } from '../system/interview';
import { TEACHING_CONTEXT } from '../system/teaching';
import { JSON_CONTEXT } from '../system/json';
import { REVIEW_QUESTIONS_SCHEMA, EVALUATION_SCHEMA, SESSION_SUMMARY_SCHEMA } from '../schemas/review';

export function buildReviewPrompt(
  content: string,
  itemType: 'topic' | 'problem',
  confidence: number
): string {
  const difficultyLevel =
    confidence <= 2 ? 'basic' : confidence <= 3 ? 'intermediate' : 'advanced';

  const questionTypes =
    itemType === 'problem'
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

  return composePrompt({
    modules: [IDENTITY_CONTEXT, INTERVIEW_CONTEXT, JSON_CONTEXT],
    task: `You are conducting a spaced-repetition review session.

The user's current confidence level is ${confidence}/5 (${difficultyLevel}). Adjust question difficulty accordingly:
- For confidence 1-2: Focus on fundamentals, definitions, basic recall
- For confidence 3: Mix of recall and application
- For confidence 4-5: Advanced application, edge cases, optimization, trade-offs

Generate exactly 3 review questions based on the following content.

Question types to include:
${questionTypes}

Content to review:
${content}

${REVIEW_QUESTIONS_SCHEMA}

JSON:`,
  });
}

export function buildEvaluationPrompt(
  question: string,
  userResponse: string,
  questionType: string,
  content: string,
  itemType: string
): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task: `Evaluate a student's response during a review session.

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

JSON:`,
  });
}

export function buildHintPrompt(
  question: string,
  questionType: string,
  content: string
): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT],
    task: `The student is stuck on a review question and needs a hint.

Question (type: ${questionType}):
${question}

Reference material:
${content}

Provide a helpful hint that guides them toward the answer without giving it away directly. Be concise (2-3 sentences). Point them in the right direction.

Hint:`,
  });
}

export function buildSessionSummaryPrompt(
  answers: Array<{ question: string; response: string; score: number; mistakes: string[] }>,
  content: string,
  itemType: string
): string {
  const answersText = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.question}\nResponse: ${a.response}\nScore: ${a.score}/5\nMistakes: ${a.mistakes.join('; ') || 'None'}`
    )
    .join('\n\n');

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task: `Provide a session summary after a review.

Item type: ${itemType}
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

JSON:`,
  });
}
