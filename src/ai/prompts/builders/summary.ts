/**
 * Summary prompt builder.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { TEACHING_CONTEXT } from '../system/teaching';
import { MARKDOWN_CONTEXT } from '../system/markdown';

export function buildSummaryPrompt(content: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `Summarize the following technical content concisely. Focus on key concepts, important details, and main takeaways. Format the summary in Markdown with bullet points for clarity.

Content:
${content}

Summary:`,
  });
}
