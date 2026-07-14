"use client";

import { useCallback, useState } from "react";
import type { FeedbackReport, PhaseResult } from "../lib/types";
import { FeedbackReportSchema } from "../lib/types";
import { computeConfidenceScore } from "../lib/scoring";
import { useAssessmentStore } from "../store/assessmentStore";

/* ─── Hook ───────────────────────────────────────────────── */

export function useFeedbackReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setFeedbackReport = useAssessmentStore(
    (state) => state.setFeedbackReport
  );

  const generateReport = useCallback(
    async (
      phaseResults: PhaseResult[],
      topicTitle: string,
      category: string,
      experienceLevel: 5 | 10 | 15
    ): Promise<FeedbackReport | null> => {
      setIsLoading(true);
      setError(null);

      // Always compute deterministic confidence from phase scores
      const phaseScores = {
        conceptual: 0,
        mcq: 0,
        applied: 0,
        "code-challenge": 0,
      };
      for (const phase of phaseResults) {
        phaseScores[phase.phaseType] = phase.phaseScore;
      }
      const confidence = computeConfidenceScore(phaseScores);

      try {
        const response = await fetch("/api/ai/assessment/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phaseResults,
            topicTitle,
            category,
            experienceLevel,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Feedback generation failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const parsed = FeedbackReportSchema.safeParse(data);

        if (!parsed.success) {
          throw new Error("Invalid feedback response format");
        }

        // Use AI-generated report but ensure confidence matches our deterministic computation
        const report: FeedbackReport = {
          ...parsed.data,
          overallConfidence: confidence,
          phaseScores,
        };

        setFeedbackReport(report, confidence);
        setIsLoading(false);
        return report;
      } catch (err) {
        // On AI failure: return deterministic scores only
        const fallbackReport: FeedbackReport = {
          overallConfidence: confidence,
          phaseScores,
          strengths: ["Assessment completed"],
          weaknesses: ["Detailed AI feedback unavailable"],
          studyRecommendations: [
            {
              recommendation: "Review phases with low scores",
              targetSection: "notes",
            },
            {
              recommendation: "Practice weak areas identified by score",
              targetSection: "patterns",
            },
          ],
          suggestedContentUpdates: [],
        };

        const message =
          err instanceof Error
            ? err.message
            : "Feedback generation failed";
        setError(message);
        setFeedbackReport(fallbackReport, confidence);
        setIsLoading(false);
        return fallbackReport;
      }
    },
    [setFeedbackReport]
  );

  return { generateReport, isLoading, error };
}
