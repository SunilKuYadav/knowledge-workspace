/**
 * Interview prep and similar problems prompt builders.
 */
import { composePrompt } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";
import { INTERVIEW_CONTEXT } from "../system/interview";
import { CODING_CONTEXT } from "../system/coding";
import { DSA_CONTEXT } from "../system/dsa";
import { MARKDOWN_CONTEXT } from "../system/markdown";
import { JSON_CONTEXT } from "../system/json";
import { SIMILAR_PROBLEMS_SCHEMA } from "../schemas/similar";

export function buildInterviewPrepPrompt(
  title: string,
  platform: string,
  difficulty: string,
  patterns: string,
): string {
  return composePrompt({
    modules: [
      IDENTITY_CONTEXT,
      INTERVIEW_CONTEXT,
      CODING_CONTEXT,
      DSA_CONTEXT,
      MARKDOWN_CONTEXT,
    ],
    task: `Generate interview preparation material for the following coding problem. Include:
1. Key questions an interviewer might ask
2. Hints for approaching the problem
3. Common follow-up questions
4. Edge cases to consider
5. Time and space complexity discussion points

Problem: ${title}
Platform: ${platform}
Difficulty: ${difficulty}
Patterns: ${patterns}

Interview Prep:`,
  });
}

export function buildSimilarProblemsPrompt(
  title: string,
  platform: string,
  difficulty: string,
  patterns: string,
  companies: string,
): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, JSON_CONTEXT],
    task: `Given the following coding problem metadata, suggest 5 similar problems that would help practice the same patterns and concepts.

Problem: ${title}
Platform: ${platform}
Difficulty: ${difficulty}
Patterns: ${patterns}
Companies: ${companies}

${SIMILAR_PROBLEMS_SCHEMA}

JSON:`,
  });
}
