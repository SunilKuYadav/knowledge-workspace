/**
 * Assessment prompt builders for the Adaptive Self-Test feature.
 *
 * Composes system modules with phase-specific instructions
 * adapted to experience level and difficulty.
 */
import { composePrompt, composeWithConfig } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";
import { INTERVIEW_CONTEXT } from "../system/interview";
import { TEACHING_CONTEXT } from "../system/teaching";
import { JSON_CONTEXT } from "../system/json";
import type { PromptConfig } from "@/types/PromptConfig";
import type {
  AssessmentPhaseType,
  DifficultyLevel,
  PhaseResult,
} from "@/app/self-test/lib/types";

// ─── Phase-Specific Instructions ────────────────────────────────────────────

const PHASE_INSTRUCTIONS: Record<AssessmentPhaseType, string> = {
  conceptual: `Generate open-ended conceptual questions that test deep understanding.
Questions should require explanation, not just recall. Test understanding of "why" and "how", not just "what".

Return JSON matching this schema:
{
  "questions": [
    {
      "type": "conceptual",
      "question": "<open-ended question>",
      "expectedAnswer": "<comprehensive expected answer>"
    }
  ]
}`,

  mcq: `Generate multiple-choice questions with exactly 4 options per question.
Each question must have exactly 1 correct answer. Distractors should be plausible but clearly wrong to someone who understands the topic.

Return JSON matching this schema:
{
  "questions": [
    {
      "type": "mcq",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctIndex": 0,
      "explanation": "<why the correct answer is correct>",
      "distractorExplanations": ["<why wrong option 1 is wrong>", "<why wrong option 2 is wrong>", "<why wrong option 3 is wrong>"]
    }
  ]
}

Rules:
- correctIndex is 0-3 (index of the correct option)
- distractorExplanations has exactly 3 entries (one per incorrect option, in order of appearance excluding the correct one)
- Distractors should target common misconceptions`,

  applied: `Generate scenario-based applied questions that test practical problem-solving.
Each question should present a real-world scenario requiring application of concepts.

Return JSON matching this schema:
{
  "questions": [
    {
      "type": "applied",
      "question": "<question overview>",
      "scenario": "<detailed scenario description>",
      "expectedAnswer": "<comprehensive expected answer with approach>"
    }
  ]
}`,

  "code-challenge": `Generate coding challenge questions with clear problem statements and examples.
Each challenge should test implementation skills with well-defined inputs and outputs.

Return JSON matching this schema:
{
  "questions": [
    {
      "type": "code-challenge",
      "question": "<brief question title>",
      "problemStatement": "<detailed problem description>",
      "inputFormat": "<description of input format>",
      "outputFormat": "<description of expected output format>",
      "examples": [
        {
          "input": "<example input>",
          "expectedOutput": "<expected output>",
          "explanation": "<why this is the expected output>"
        }
      ]
    }
  ]
}

Rules:
- Include 1-3 examples per question
- Examples should cover a normal case and at least one edge case
- Problem statements should be unambiguous`,
};

// ─── Difficulty Calibration ─────────────────────────────────────────────────

function getDifficultyInstructions(
  difficulty: DifficultyLevel,
  experienceLevel: number,
): string {
  const difficultyDescriptions: Record<DifficultyLevel, string> = {
    easy: "Focus on fundamentals and core concepts. Questions should be answerable with solid foundational knowledge.",
    medium:
      "Require deeper understanding. Questions should need analysis, comparison, or multi-step reasoning.",
    hard: "Challenge with advanced scenarios. Questions should require expert-level thinking, edge case awareness, and production depth.",
  };

  let calibration = `Difficulty: ${difficulty}\n${difficultyDescriptions[difficulty]}`;

  if (experienceLevel >= 15) {
    calibration +=
      "\n\nCalibration for 15+ YOE: Assume architectural thinking. Frame questions around problem-space analysis, system-level implications, and cross-domain connections. Skip fundamentals entirely.";
  } else if (experienceLevel >= 10) {
    calibration +=
      "\n\nCalibration for 10+ YOE: Expect first-principles reasoning, formal analysis, and production depth. Questions should probe at the level of a Staff/Senior interview.";
  } else {
    calibration +=
      "\n\nCalibration for 5 YOE: Focus on clear foundations, practical examples, and standard interview difficulty. Questions should build confidence while validating understanding.";
  }

  return calibration;
}

// ─── Prompt Builders ────────────────────────────────────────────────────────

/**
 * Builds a prompt for generating assessment questions for a specific phase.
 * Includes phase-specific instructions adapted to difficulty and experience level.
 */
export function buildQuestionGenerationPrompt(params: {
  topicTitle: string;
  category: string;
  tags: string[];
  phaseType: AssessmentPhaseType;
  difficulty: DifficultyLevel;
  experienceLevel: number;
  content?: string;
  previousPhaseScores?: Record<string, number>;
  incorrectQuestions?: string[];
  config?: PromptConfig;
}): string {
  const {
    topicTitle,
    category,
    tags,
    phaseType,
    difficulty,
    experienceLevel,
    content,
    previousPhaseScores,
    incorrectQuestions,
    config,
  } = params;

  const difficultyInstructions = getDifficultyInstructions(
    difficulty,
    experienceLevel,
  );
  const phaseInstructions = PHASE_INSTRUCTIONS[phaseType];

  let contextSection = `Topic: ${topicTitle}
Category: ${category}
Tags: ${tags.join(", ")}`;

  if (content) {
    contextSection += `\n\nTopic Content:\n${content}`;
  } else {
    contextSection +=
      "\n\nNo topic content available. Generate questions based on the topic title, category, and tags.";
  }

  let adaptiveSection = "";
  if (previousPhaseScores && Object.keys(previousPhaseScores).length > 0) {
    const scoresText = Object.entries(previousPhaseScores)
      .map(([phase, score]) => `  ${phase}: ${score}/10`)
      .join("\n");
    adaptiveSection += `\nPrevious phase scores:\n${scoresText}`;
  }

  if (incorrectQuestions && incorrectQuestions.length > 0) {
    adaptiveSection += `\n\nQuestions the user answered incorrectly (target these areas):\n${incorrectQuestions.map((q) => `- ${q}`).join("\n")}`;
  }

  const task = `Generate 2-3 assessment questions for the "${phaseType}" phase.

${difficultyInstructions}

${contextSection}
${adaptiveSection}

## Phase Instructions

${phaseInstructions}

Generate exactly 2-3 questions. Return ONLY valid JSON matching the schema above.`;

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

/**
 * Builds a prompt for evaluating a user's answer.
 * Returns prompt that instructs AI to score 0-10, provide feedback, mistakes, key insights.
 */
export function buildEvaluationPrompt(params: {
  question: string;
  userAnswer: string;
  topicTitle: string;
  category: string;
  phaseType: AssessmentPhaseType;
  content?: string;
  config?: PromptConfig;
}): string {
  const { question, userAnswer, topicTitle, category, phaseType, content, config } =
    params;

  const levelExpectation = config
    ? `\nEvaluate at the bar expected for ${config.targetRole} (${config.experienceLevel}+ YOE). ${
        config.experienceLevel <= 5
          ? "A correct answer with reasoning is a 6-7. A correct answer with edge case awareness and production thinking is an 8-9. A perfect answer with novel insights is a 10."
          : config.experienceLevel >= 15
            ? "Expect architectural depth, cross-system awareness, and novel insights for 9-10. Correct-but-shallow is a 5-6."
            : "Expect production depth and formal reasoning for 8-10. Textbook-correct is a 5-6."
      }`
    : "";

  const contentSection = content
    ? `\nReference content for evaluation:\n${content}`
    : "";

  const task = `Evaluate the user's answer to an assessment question.
${levelExpectation}

Topic: ${topicTitle}
Category: ${category}
Phase type: ${phaseType}
${contentSection}

Question:
${question}

User's Answer:
${userAnswer}

Evaluate the response and return JSON matching this schema:
{
  "score": <integer 0-10>,
  "feedback": "<constructive feedback, max 500 characters>",
  "mistakes": ["<mistake 1>", "<mistake 2>"],
  "keyInsights": ["<insight 1>", "<insight 2>"],
  "expectedAnswer": "<the ideal/expected answer>"
}

Scoring guide:
- 0-2: Fundamentally wrong or empty answer
- 3-4: Shows some understanding but major gaps
- 5-6: Correct at surface level but lacks depth
- 7-8: Strong answer with good reasoning
- 9-10: Exceptional answer with deep insight

Rules:
- mistakes: up to 5 specific mistakes or gaps
- keyInsights: up to 3 key takeaways the user should remember
- feedback: concise, constructive, max 500 characters
- expectedAnswer: what the ideal answer would include

Return ONLY valid JSON.`;

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

/**
 * Builds a prompt for generating a comprehensive feedback report.
 * Maps weaknesses to specific artifact sections.
 */
export function buildFeedbackReportPrompt(params: {
  topicTitle: string;
  category: string;
  phaseResults: PhaseResult[];
  experienceLevel: number;
  config?: PromptConfig;
}): string {
  const { topicTitle, category, phaseResults, experienceLevel, config } = params;

  const phaseResultsText = phaseResults
    .map((pr) => {
      const questionsText = pr.questions
        .map((q, i) => {
          const answer = pr.userAnswers[i] || "(no answer)";
          const evaluation = pr.evaluations[i];
          return `  Q${i + 1}: ${q.question}\n  Answer: ${answer}\n  Score: ${evaluation?.score ?? "N/A"}/10${evaluation?.mistakes.length ? `\n  Mistakes: ${evaluation.mistakes.join("; ")}` : ""}`;
        })
        .join("\n");
      return `Phase: ${pr.phaseType} (Score: ${pr.phaseScore}/10, Difficulty: ${pr.difficulty})\n${questionsText}`;
    })
    .join("\n\n");

  const levelContext =
    experienceLevel >= 15
      ? "Evaluate at principal engineer depth. Recommendations should focus on architectural thinking and system-level gaps."
      : experienceLevel >= 10
        ? "Evaluate at staff engineer depth. Recommendations should address production-readiness and formal analysis gaps."
        : "Evaluate at senior engineer depth. Recommendations should focus on foundational gaps and practical application.";

  const task = `Generate a comprehensive feedback report for the completed assessment.

Topic: ${topicTitle}
Category: ${category}
Experience Level: ${experienceLevel} YOE

${levelContext}

## Assessment Results

${phaseResultsText}

## Required Output

Return JSON matching this schema:
{
  "overallConfidence": <number 1.0-5.0>,
  "phaseScores": {
    "conceptual": <number 0-10>,
    "mcq": <number 0-10>,
    "applied": <number 0-10>,
    "code-challenge": <number 0-10>
  },
  "strengths": ["<strength 1>", ...],
  "weaknesses": ["<weakness 1>", ...],
  "studyRecommendations": [
    {
      "recommendation": "<what to study>",
      "targetSection": "<which artifact: overview, notes, patterns, or mistakes>"
    }
  ],
  "suggestedContentUpdates": [
    {
      "artifact": "<overview|notes|patterns|mistakes>",
      "gap": "<what's missing or weak>",
      "suggestion": "<how to improve the content>"
    }
  ]
}

Rules:
- strengths: 1-5 specific demonstrated strengths
- weaknesses: 1-5 specific areas needing improvement
- studyRecommendations: 2-5 recommendations, each mapped to a topic artifact section
- suggestedContentUpdates: suggest updates for artifacts where the user's content doesn't adequately cover weak areas
- Map each weakness to a specific topic section (overview, notes, patterns, or mistakes)
- phaseScores should reflect the actual performance in each phase
- overallConfidence: weighted score (conceptual 20%, mcq 20%, applied 30%, code-challenge 30%) mapped to 1.0-5.0 scale

Return ONLY valid JSON.`;

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

/**
 * Builds a prompt for generating improved topic content based on feedback.
 * Addresses identified gaps from the assessment.
 */
export function buildContentUpdatePrompt(params: {
  topicTitle: string;
  currentContent: string;
  artifact: string;
  weaknesses: string[];
  gap: string;
  config?: PromptConfig;
}): string {
  const { topicTitle, currentContent, artifact, weaknesses, gap, config } =
    params;

  const task = `Improve the topic content to address identified knowledge gaps from an assessment.

Topic: ${topicTitle}
Artifact: ${artifact}

## Identified Gap
${gap}

## Related Weaknesses
${weaknesses.map((w) => `- ${w}`).join("\n")}

## Current Content
${currentContent}

## Instructions

Generate an improved version of this content that:
1. Addresses the specific gap identified above
2. Strengthens the areas where weaknesses were found
3. Maintains the existing structure and style
4. Adds depth, examples, or clarification where needed
5. Does NOT remove existing correct content — only add and improve

Return the complete updated content as a JSON object:
{
  "updatedContent": "<the full improved markdown content>"
}

Rules:
- Preserve all existing correct information
- Add new sections or expand existing ones to fill the gap
- Use the same markdown formatting conventions as the original
- Keep additions focused and relevant to the identified gap
- Include practical examples where appropriate

Return ONLY valid JSON.`;

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
