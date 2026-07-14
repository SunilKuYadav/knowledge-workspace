"use client";

import { useCallback, useState } from "react";
import type {
  AssessmentPhaseType,
  AssessmentQuestion,
  DifficultyLevel,
} from "../lib/types";
import { AssessmentQuestionSchema } from "../lib/types";
import { truncateContent } from "../lib/validation";
import { z } from "zod";

/* ─── Request Types ──────────────────────────────────────── */

export interface QuestionGenerationParams {
  topicTitle: string;
  category: string;
  tags: string[];
  phaseType: AssessmentPhaseType;
  difficulty: DifficultyLevel;
  experienceLevel: 5 | 10 | 15;
  content: string;
  previousPhaseScores?: { phaseType: AssessmentPhaseType; score: number }[];
  incorrectQuestions?: string[];
}

/* ─── Response Schema ────────────────────────────────────── */

const GenerateResponseSchema = z.object({
  questions: z.array(AssessmentQuestionSchema).min(2).max(3),
});

/* ─── Hook ───────────────────────────────────────────────── */

export function useQuestionGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestions = useCallback(
    async (
      params: QuestionGenerationParams
    ): Promise<AssessmentQuestion[] | null> => {
      setIsLoading(true);
      setError(null);

      const truncatedContent = truncateContent(params.content);

      const body = {
        topicTitle: params.topicTitle,
        category: params.category,
        tags: params.tags,
        phaseType: params.phaseType,
        difficulty: params.difficulty,
        experienceLevel: params.experienceLevel,
        content: truncatedContent,
        previousPhaseScores: params.previousPhaseScores,
        incorrectQuestions: params.incorrectQuestions,
      };

      const attempt = async (): Promise<AssessmentQuestion[] | null> => {
        const response = await fetch("/api/ai/assessment/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(
            `Question generation failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const parsed = GenerateResponseSchema.safeParse(data);

        if (!parsed.success) {
          throw new Error(
            `Invalid response format: ${parsed.error.issues.map((i) => i.message).join("; ")}`
          );
        }

        return parsed.data.questions;
      };

      try {
        const questions = await attempt();
        setIsLoading(false);
        return questions;
      } catch (firstError) {
        // Retry once on failure
        try {
          const questions = await attempt();
          setIsLoading(false);
          return questions;
        } catch (retryError) {
          const message =
            retryError instanceof Error
              ? retryError.message
              : "Question generation failed after retry";
          setError(message);
          setIsLoading(false);
          return null;
        }
      }
    },
    []
  );

  return { generateQuestions, isLoading, error };
}
