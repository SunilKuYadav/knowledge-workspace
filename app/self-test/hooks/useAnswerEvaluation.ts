"use client";

import { useCallback } from "react";
import type {
  AssessmentQuestion,
  MCQQuestion,
  QuestionEvaluation,
} from "../lib/types";
import { QuestionEvaluationSchema } from "../lib/types";
import { useAssessmentStore } from "../store/assessmentStore";

/* ─── Pure MCQ Local Evaluation ──────────────────────────── */

/**
 * Evaluates an MCQ answer locally without an AI call.
 * Exported as a pure function for testing (Property 5).
 *
 * - Correct: score=10, feedback="Correct!", keyInsights from explanation
 * - Incorrect: score=0, feedback from explanation, mistakes from distractor explanations
 */
export function evaluateMCQLocally(
  question: MCQQuestion,
  selectedIndex: number
): QuestionEvaluation {
  const isCorrect = selectedIndex === question.correctIndex;

  if (isCorrect) {
    return {
      score: 10,
      feedback: "Correct!",
      mistakes: [],
      keyInsights: [question.explanation],
    };
  }

  // Build mistakes from distractor explanations
  // The distractorExplanations array has 3 entries for the 3 wrong options.
  // Map the selectedIndex to the correct distractor explanation.
  const distractorIndices = [0, 1, 2, 3].filter(
    (i) => i !== question.correctIndex
  );
  const selectedDistractorPos = distractorIndices.indexOf(selectedIndex);
  const mistakes: string[] = [];

  if (selectedDistractorPos >= 0 && selectedDistractorPos < question.distractorExplanations.length) {
    mistakes.push(question.distractorExplanations[selectedDistractorPos]);
  }

  return {
    score: 0,
    feedback: question.explanation,
    mistakes,
    keyInsights: [question.explanation],
  };
}

/* ─── Hook ───────────────────────────────────────────────── */

export interface EvaluationContext {
  topicTitle: string;
  category: string;
  content: string;
}

export function useAnswerEvaluation() {
  const evaluateAnswer = useCallback(
    async (
      question: AssessmentQuestion,
      answer: string,
      context: EvaluationContext
    ): Promise<QuestionEvaluation | null> => {
      // MCQ: evaluate locally
      if (question.type === "mcq") {
        const selectedIndex = parseInt(answer, 10);
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
          return null;
        }
        return evaluateMCQLocally(question, selectedIndex);
      }

      // Other types: AI evaluation with 30s timeout
      useAssessmentStore.setState({ isEvaluating: true });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch("/api/ai/assessment/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            answer,
            topicTitle: context.topicTitle,
            category: context.category,
            content: context.content,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Evaluation failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const parsed = QuestionEvaluationSchema.safeParse(data);

        if (!parsed.success) {
          throw new Error("Invalid evaluation response format");
        }

        useAssessmentStore.setState({ isEvaluating: false });
        return parsed.data;
      } catch (err) {
        clearTimeout(timeoutId);
        useAssessmentStore.setState({ isEvaluating: false });

        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("Evaluation timed out after 30 seconds");
        }
        throw err;
      }
    },
    []
  );

  return { evaluateAnswer };
}
