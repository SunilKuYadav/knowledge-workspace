/**
 * Content generation and text generation prompt builders.
 */
import { composePrompt } from "../utils/compose";
import { formatSemanticContext } from "../utils/format";
import { IDENTITY_CONTEXT } from "../system/identity";
import { TEACHING_CONTEXT } from "../system/teaching";
import { MARKDOWN_CONTEXT } from "../system/markdown";
import { ARTIFACT_PROMPTS } from "../artifacts";
import type { ArtifactType } from "@/types";
import type { SemanticDescription } from "@/types";

// ─── Generic text generation ───────────────────────────────────────────────

export function buildGenerateTextPrompt(
  userPrompt: string,
  context?: string,
): string {
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
  contextContent: string,
): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `The user is studying a ${contextType}. Here is the relevant context:\n\n${contextContent}\n\nUser question: ${prompt}`,
  });
}

// ─── Master artifact generation ─────────────────────────────────────────────

/**
 * Builds a prompt that generates a complete artifact from scratch for a topic.
 *
 * Composes: IDENTITY + TEACHING + MARKDOWN + artifact-specific instructions.
 * Substitutes {{TOPIC}}, {{CATEGORY}}, and {{ARTIFACT}} in the instructions.
 *
 * @param topic    The topic title (e.g. "Binary Search Tree")
 * @param category The topic category (e.g. "dsa")
 * @param artifact The artifact type to generate (e.g. "notes")
 * @param semanticDesc Optional per-item semantic context to tailor generation
 */
export function buildArtifactPrompt(
  topic: string,
  category: string,
  artifact: ArtifactType,
  semanticDesc?: SemanticDescription,
): string {
  const artifactInstructions = ARTIFACT_PROMPTS[artifact]
    .replace(/\{\{TOPIC\}\}/g, topic)
    .replace(/\{\{CATEGORY\}\}/g, category)
    .replace(/\{\{ARTIFACT\}\}/g, artifact);

  const semanticContext = formatSemanticContext(semanticDesc);

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `## Topic
${topic}

## Category
${category}

## Artifact to generate
${artifact}

${semanticContext ? semanticContext + "\n\n" : ""}${artifactInstructions}

Generate ONLY the requested artifact. Do NOT generate content for any other artifact.
Start directly with the content. Do not include introductory or closing remarks.${semanticContext ? "\n\nIMPORTANT: Tailor the generated content to the item-specific context above. Respect the stated learning intent, focus areas, target depth, and skip any concepts listed as already known." : ""}`,
  });
}

// ─── Review session content generation ──────────────────────────────────────

/**
 * Builds a prompt that generates or updates a content artifact based on
 * a completed review session. Each artifact type has specific instructions
 * for how to incorporate session insights.
 */
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
  contentType: string,
): string {
  const sessionData = answers
    .map(
      (a, i) =>
        `Q${i + 1} (${a.questionType}): ${a.question}\nUser Answer: ${a.response}\nScore: ${a.score}/5\nCorrect Answer: ${a.correctAnswer}\nMistakes: ${a.mistakes.join("; ") || "None"}\nKey Insights: ${a.keyInsights.join("; ") || "None"}\nFeedback: ${a.feedback}`,
    )
    .join("\n\n");

  const contentTypeInstructions: Record<string, string> = {
    notes: `Generate updated/improved notes in Markdown format. Include key concepts, important details, and things the user should remember. Merge with any existing notes content — do not lose existing information, but add new insights from this session.`,
    mistakes: `Generate a consolidated list of common mistakes and pitfalls in Markdown format. Include mistakes from this session AND any from the existing content. Each mistake should have a brief explanation of why it's wrong and how to avoid it. Format as a clear list.`,
    patterns: `Generate coding patterns and approaches in Markdown format. Include patterns relevant to this topic/problem that were tested in the session. Merge with existing patterns. Each pattern should include when to use it and a brief example or explanation.`,
    solution: `Generate an improved solution explanation in Markdown format. Based on the review session Q&A, provide a clear solution approach with explanation. Include time/space complexity if relevant. Build upon existing solution content.`,
    implementation: `Generate implementation guidance in Markdown format. Based on session insights, include key implementation steps, common bugs identified in the session, and reusable templates. Merge with existing content.`,
    flashcards: `Generate flashcards in Markdown format. Create Q&A pairs based on the review session insights and existing content. Format each as:\n\n### Card N\n**Q:** question\n**A:** answer\n\nFocus on key concepts, common mistakes, and important patterns that need to be memorized.`,
  };

  const instruction =
    contentTypeInstructions[contentType] ?? contentTypeInstructions.notes;

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, MARKDOWN_CONTEXT],
    task: `Generate study material based on a review session.

Item type: ${itemType}

Existing content for this item:
${existingContent || "(No existing content)"}

Review session Q&A:
${sessionData}

Instructions: ${instruction}

Generate the content in clean Markdown format. Be thorough, accurate, and practical.`,
  });
}
