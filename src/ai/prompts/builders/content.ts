/**
 * Content generation and text generation prompt builders.
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { TEACHING_CONTEXT } from '../system/teaching';
import { MARKDOWN_CONTEXT } from '../system/markdown';

export function buildGenerateTextPrompt(userPrompt: string, context?: string): string {
  let task = `Generate well-formatted Markdown content based on the user's request. Output only the Markdown content with no additional commentary or wrapping.\n\n`;

  if (context) {
    task += `Here is the existing document context for reference:\n---\n${context}\n---\n\n`;
  }

  task += `User request: ${userPrompt}\n\nMarkdown output:`;

  return composePrompt({
    modules: [IDENTITY_CONTEXT, MARKDOWN_CONTEXT],
    task,
  });
}

export function buildCustomGeneralPrompt(prompt: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `Answer the following question:\n\n${prompt}`,
  });
}

export function buildCustomItemPrompt(
  prompt: string,
  contextType: string,
  contextContent: string
): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `The user is studying a ${contextType}. Here is the relevant context:\n\n${contextContent}\n\nUser question: ${prompt}`,
  });
}

export function buildGenerateContentPrompt(
  answers: Array<{
    question: string;
    questionType: string;
    response: string;
    score: number;
    mistakes: string[];
    keyInsights: string[];
    feedback: string;
    correctAnswer: string;
  }>,
  existingContent: string,
  itemType: string,
  contentType: string
): string {
  const sessionData = answers
    .map(
      (a, i) =>
        `Q${i + 1} (${a.questionType}): ${a.question}\nUser Answer: ${a.response}\nScore: ${a.score}/5\nCorrect Answer: ${a.correctAnswer}\nMistakes: ${a.mistakes.join('; ') || 'None'}\nKey Insights: ${a.keyInsights.join('; ') || 'None'}\nFeedback: ${a.feedback}`
    )
    .join('\n\n');

  const contentTypePrompts: Record<string, string> = {
    notes: `Generate updated/improved notes in Markdown format. Include key concepts, important details, and things the user should remember. Merge with any existing notes content — do not lose existing information, but add new insights from this session.`,
    mistakes: `Generate a consolidated list of common mistakes and pitfalls in Markdown format. Include mistakes from this session AND any from the existing content. Each mistake should have a brief explanation of why it's wrong and how to avoid it. Format as a clear list.`,
    patterns: `Generate coding patterns and approaches in Markdown format. Include patterns relevant to this topic/problem that were tested in the session. Merge with existing patterns. Each pattern should include when to use it and a brief example or explanation.`,
    solution: `Generate an improved solution explanation in Markdown format. Based on the review session Q&A, provide a clear solution approach with explanation. Include time/space complexity if relevant. Build upon existing solution content.`,
    flashcards: `Generate flashcards in Markdown format. Create Q&A pairs based on the review session insights and existing content. Format each as:\n\n### Card N\n**Q:** question\n**A:** answer\n\nFocus on key concepts, common mistakes, and important patterns that need to be memorized.`,
  };

  const instruction = contentTypePrompts[contentType] || contentTypePrompts.notes;

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `Generate study material based on a review session.

Item type: ${itemType}

Existing content for this item:
${existingContent || '(No existing content)'}

Review session Q&A:
${sessionData}

Instructions: ${instruction}

Generate the content in clean Markdown format. Be thorough, accurate, and practical.`,
  });
}
