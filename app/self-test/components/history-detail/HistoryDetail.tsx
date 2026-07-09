"use client";

import { useState } from "react";
import type {
  AssessmentRecord,
  AssessmentQuestion,
  QuestionEvaluation,
  PhaseResult,
} from "../../lib/types";

interface HistoryDetailProps {
  record: AssessmentRecord;
  onClose: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  conceptual: "Conceptual",
  mcq: "Multiple Choice",
  applied: "Applied",
  "code-challenge": "Code Challenge",
};

function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 7) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 5) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getExpectedAnswer(question: AssessmentQuestion): string | null {
  if (question.type === "conceptual" || question.type === "applied") {
    return question.expectedAnswer;
  }
  if (question.type === "mcq") {
    return question.options[question.correctIndex];
  }
  return null;
}

function PhaseSection({ phase }: { phase: PhaseResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {PHASE_LABELS[phase.phaseType] ?? phase.phaseType}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getScoreBg(phase.phaseScore)} ${getScoreColor(phase.phaseScore)}`}
          >
            {phase.phaseScore.toFixed(1)}/10
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {phase.difficulty}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Accordion content */}
      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          {phase.questions.map((question, idx) => {
            const userAnswer = phase.userAnswers[idx] ?? "";
            const evaluation: QuestionEvaluation | undefined =
              phase.evaluations[idx];
            const expectedAnswer = getExpectedAnswer(question);

            return (
              <div
                key={idx}
                className="border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-700/50"
              >
                {/* Question */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Q{idx + 1}: {question.question}
                  </p>
                  {evaluation && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${getScoreBg(evaluation.score)} ${getScoreColor(evaluation.score)}`}
                    >
                      {evaluation.score}/10
                    </span>
                  )}
                </div>

                {/* User answer */}
                <div className="mt-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Your answer:
                  </span>
                  <p className="mt-0.5 rounded bg-zinc-50 px-2 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {userAnswer || (
                      <span className="italic text-zinc-400">No answer</span>
                    )}
                  </p>
                </div>

                {/* Expected answer */}
                {expectedAnswer && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Expected answer:
                    </span>
                    <p className="mt-0.5 rounded bg-blue-50 px-2 py-1.5 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {expectedAnswer}
                    </p>
                  </div>
                )}

                {/* Evaluation from AI */}
                {evaluation?.expectedAnswer && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      AI expected answer:
                    </span>
                    <p className="mt-0.5 rounded bg-blue-50 px-2 py-1.5 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {evaluation.expectedAnswer}
                    </p>
                  </div>
                )}

                {/* Feedback */}
                {evaluation && (
                  <div className="mt-2 space-y-1">
                    {evaluation.feedback && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {evaluation.feedback}
                      </p>
                    )}
                    {evaluation.mistakes.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          Mistakes:
                        </span>
                        <ul className="mt-0.5 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                          {evaluation.mistakes.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluation.keyInsights.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          Key insights:
                        </span>
                        <ul className="mt-0.5 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                          {evaluation.keyInsights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HistoryDetail({ record, onClose }: HistoryDetailProps) {
  const completedDate = record.completedAt
    ? new Date(record.completedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(record.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="space-y-4">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Assessment Details
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          aria-label="Close details"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Overall summary */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Date
            </span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {completedDate}
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Confidence
            </span>
            <p
              className={`text-sm font-semibold ${record.confidenceScore != null ? getScoreColor(record.confidenceScore * 2) : "text-zinc-600 dark:text-zinc-400"}`}
            >
              {record.confidenceScore != null
                ? `${record.confidenceScore.toFixed(1)}/5.0`
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Difficulty
            </span>
            <p className="text-sm font-medium capitalize text-zinc-800 dark:text-zinc-200">
              {record.initialDifficulty}
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Experience
            </span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {record.experienceLevel} YOE
            </p>
          </div>
        </div>

        {/* Feedback report strengths/weaknesses */}
        {record.feedbackReport && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Strengths
              </span>
              <ul className="mt-1 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                {record.feedbackReport.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Weaknesses
              </span>
              <ul className="mt-1 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                {record.feedbackReport.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Phase accordion sections */}
      <div className="space-y-2">
        {record.phases.map((phase) => (
          <PhaseSection key={phase.phaseType} phase={phase} />
        ))}
      </div>
    </div>
  );
}
