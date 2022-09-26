/**
 * Quiz generation prompt builder.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { TEACHING_CONTEXT } from '../system/teaching';
import { JSON_CONTEXT } from '../system/json';
import { QUIZ_SCHEMA } from '../schemas/quiz';

export function buildQuizPrompt(content: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task: `Generate 5 multiple-choice quiz questions based on the following technical content. Each question should test understanding of key concepts.

${QUIZ_SCHEMA}

Content:
${content}

JSON:`,
  });
}
