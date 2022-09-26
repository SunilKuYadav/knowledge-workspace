/**
 * Flashcard generation prompt builder.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { REVISION_CONTEXT } from '../system/revision';
import { JSON_CONTEXT } from '../system/json';
import { FLASHCARDS_SCHEMA } from '../schemas/flashcards';

export function buildFlashcardsPrompt(content: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, REVISION_CONTEXT, JSON_CONTEXT],
    task: `Generate 5-10 flashcards based on the following technical content. Each flashcard should have a question/concept on the front and a concise answer/explanation on the back.

${FLASHCARDS_SCHEMA}

Content:
${content}

JSON:`,
  });
}
