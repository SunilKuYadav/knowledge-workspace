/**
 * Explain concept prompt builder.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { TEACHING_CONTEXT } from '../system/teaching';
import { CODING_CONTEXT } from '../system/coding';
import { KNOWLEDGE_CONTEXT } from '../system/knowledge';
import { MARKDOWN_CONTEXT } from '../system/markdown';

export function buildExplainPrompt(concept: string, context: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, CODING_CONTEXT, KNOWLEDGE_CONTEXT, MARKDOWN_CONTEXT],
    task: `Explain the following concept clearly and concisely for someone preparing for technical interviews. Include examples where helpful.

Concept: ${concept}

Context:
${context}

Explanation:`,
  });
}
