"use client";

import { useCallback, useState } from "react";
import type {
  AssessmentHistory,
  AssessmentRecord,
  AssessmentPhaseType,
  TrendIndicator,
} from "../lib/types";
import { computeTrend, extractWeakAreas } from "../lib/scoring";
import {
  loadAssessmentHistoryAction,
  deleteRecordAction,
} from "../actions/assessment-actions";

/* ─── Types ──────────────────────────────────────────────── */

export interface WeakAreaTarget {
  weakPhaseTypes: AssessmentPhaseType[];
  incorrectQuestions: string[];
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useAssessmentHistory(
  topicId: string,
  category: string,
  slug: string
) {
  const [history, setHistory] = useState<AssessmentHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<TrendIndicator | null>(null);

  /**
   * Load the full assessment history for the topic.
   */
  const loadHistory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadAssessmentHistoryAction(
        topicId,
        category,
        slug
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to load assessment history");
      }

      const loadedHistory = result.history ?? null;
      setHistory(loadedHistory);

      // Compute trend from completed records
      if (loadedHistory && loadedHistory.assessments.length > 0) {
        const completedRecords = loadedHistory.assessments.filter(
          (r) => r.status === "completed"
        );
        setTrend(computeTrend(completedRecords));
      } else {
        setTrend(null);
      }

      setIsLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load history";
      setError(message);
      setIsLoading(false);
    }
  }, [topicId, category, slug]);

  /**
   * Delete a specific assessment record.
   */
  const deleteRecord = useCallback(
    async (recordId: string): Promise<boolean> => {
      setError(null);

      try {
        const result = await deleteRecordAction(
          topicId,
          category,
          slug,
          recordId
        );

        if (!result.success) {
          throw new Error(result.error ?? "Failed to delete record");
        }

        // Update local state optimistically
        setHistory((prev) => {
          if (!prev) return prev;
          const updatedAssessments = prev.assessments.filter(
            (r) => r.id !== recordId
          );
          const updatedHistory = { ...prev, assessments: updatedAssessments };

          // Recompute trend
          const completedRecords = updatedAssessments.filter(
            (r) => r.status === "completed"
          );
          setTrend(computeTrend(completedRecords));

          return updatedHistory;
        });

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete record";
        setError(message);
        return false;
      }
    },
    [topicId, category, slug]
  );

  /**
   * Get a specific record by ID from the loaded history.
   */
  const getRecordDetail = useCallback(
    (recordId: string): AssessmentRecord | null => {
      if (!history) return null;
      return history.assessments.find((r) => r.id === recordId) ?? null;
    },
    [history]
  );

  /**
   * Extract weak areas from a past record for starting a targeted regenerated test.
   * Returns the weak phase types and incorrectly answered questions (Req 9.5).
   */
  const startRegeneratedTest = useCallback(
    (recordId: string): WeakAreaTarget | null => {
      if (!history) return null;

      const record = history.assessments.find((r) => r.id === recordId);
      if (!record) return null;

      const { phases, questions } = extractWeakAreas(record);

      const weakPhaseTypes = phases.map((p) => p.phaseType);
      const incorrectQuestions = questions.map((q) => q.question.question);

      return { weakPhaseTypes, incorrectQuestions };
    },
    [history]
  );

  return {
    history,
    trend,
    isLoading,
    error,
    loadHistory,
    deleteRecord,
    getRecordDetail,
    startRegeneratedTest,
  };
}
