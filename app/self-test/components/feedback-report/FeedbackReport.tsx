"use client";

import { useState } from "react";
import type {
  FeedbackReport as FeedbackReportType,
  AssessmentPhaseType,
} from "../../lib/types";
import { markTopicCompletedAction } from "../../actions/status-actions";

interface FeedbackReportProps {
  report: FeedbackReportType;
  confidenceScore: number;
  topicId: string;
  onUpdateContent: (artifact: string, gap: string) => void;
  onClose: () => void;
}

const PHASE_LABELS: Record<AssessmentPhaseType, string> = {
  conceptual: "Conceptual",
  mcq: "Multiple Choice",
  applied: "Applied",
  "code-challenge": "Code Challenge",
};

const COMPLETION_THRESHOLD = 4.5;

function getConfidenceColor(score: number) {
  if (score >= 4.5) return "text-green-500";
  if (score >= 3) return "text-yellow-500";
  return "text-red-500";
}

function getConfidenceBg(score: number) {
  if (score >= 4.5)
    return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
  if (score >= 3)
    return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
  return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
}

function getPhaseScoreColor(score: number) {
  if (score >= 8) return "text-green-500";
  if (score >= 5) return "text-yellow-500";
  return "text-red-500";
}

function getPhaseBarColor(score: number) {
  if (score >= 5) return "bg-green-500";
  return "bg-red-500";
}

export function FeedbackReport({
  report,
  confidenceScore,
  topicId,
  onUpdateContent,
  onClose,
}: FeedbackReportProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const canComplete = confidenceScore >= COMPLETION_THRESHOLD;

  const phaseEntries = Object.entries(report.phaseScores) as [
    AssessmentPhaseType,
    number,
  ][];

  async function handleMarkCompleted() {
    setIsCompleting(true);
    setCompletionError(null);

    const result = await markTopicCompletedAction(topicId, confidenceScore);

    if (result.success) {
      setIsCompleted(true);
    } else {
      setCompletionError(
        result.error || "Failed to update topic status. Please try again.",
      );
    }

    setIsCompleting(false);
  }

  return (
    <div className="flex flex-col gap-6 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Overall Confidence Score */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Assessment Report
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Close report"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Confidence Score Display */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-full border-2 ${getConfidenceBg(confidenceScore)}`}
        >
          <span
            className={`text-2xl font-bold ${getConfidenceColor(confidenceScore)}`}
          >
            {confidenceScore.toFixed(1)}
          </span>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Confidence Score
          </p>
          <p className="text-lg text-zinc-400 dark:text-zinc-500">/5.0</p>
        </div>
      </div>

      {/* Per-Phase Progress Bars */}
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
          Phase Scores
        </p>
        <div className="flex flex-col gap-3">
          {phaseEntries.map(([phase, score]) => {
            const isPassing = score >= 5;
            const progressPercent = (score / 10) * 100;

            return (
              <div key={phase} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {PHASE_LABELS[phase]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${getPhaseScoreColor(score)}`}
                    >
                      {score.toFixed(1)}/10
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isPassing
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {isPassing ? "Pass" : "Fail"}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getPhaseBarColor(score)}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths */}
      <div>
        <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
          Strengths
        </p>
        <ul className="space-y-1.5">
          {report.strengths.map((strength, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">●</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {strength}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div>
        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
          Areas for Improvement
        </p>
        <ul className="space-y-1.5">
          {report.weaknesses.map((weakness, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5 flex-shrink-0">●</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {weakness}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Study Recommendations */}
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
          Study Recommendations
        </p>
        <div className="flex flex-col gap-2">
          {report.studyRecommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800"
            >
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {rec.recommendation}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Target: {rec.targetSection}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Content Updates */}
      {report.suggestedContentUpdates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Suggested Content Updates
          </p>
          <div className="flex flex-col gap-2">
            {report.suggestedContentUpdates.map((update, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-800"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {update.artifact}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                    {update.gap}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateContent(update.artifact, update.gap)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Update Content
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Gate - Requirement 2.1, 2.4 */}
      {!canComplete && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
            Topic completion requires a confidence score of {COMPLETION_THRESHOLD} or higher
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Review the areas for improvement above and retake the assessment to
            achieve a higher score.
          </p>
        </div>
      )}

      {/* Completion Success State */}
      {isCompleted && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            ✓ Topic marked as completed
          </p>
        </div>
      )}

      {/* Completion Error State - Requirement 2.5 */}
      {completionError && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {completionError}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {/* Requirement 2.1 & 2.2: Show Mark as Completed only when score >= 4.5 */}
        {canComplete && !isCompleted && (
          <button
            type="button"
            onClick={handleMarkCompleted}
            disabled={isCompleting}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isCompleting ? "Updating..." : "Mark as Completed"}
          </button>
        )}
        {/* Requirement 2.5: Retry button on failure */}
        {completionError && canComplete && !isCompleted && (
          <button
            type="button"
            onClick={handleMarkCompleted}
            disabled={isCompleting}
            className="px-5 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
