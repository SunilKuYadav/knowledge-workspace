"use client";

import { useEffect, useCallback, useState } from "react";
import type { Topic } from "@/src/types/Topic";
import { useAssessmentStore } from "./store/assessmentStore";
import { useAssessmentSession } from "./hooks/useAssessmentSession";
import { useAssessmentHistory } from "./hooks/useAssessmentHistory";
import { useContentUpdate } from "./hooks/useContentUpdate";
import { PHASE_ORDER } from "./lib/constants";
import { AssessmentLauncher } from "./components/assessment-launcher/AssessmentLauncher";
import { PhaseHeader } from "./components/phase-header/PhaseHeader";
import { QuestionCard } from "./components/question-card/QuestionCard";
import { EvaluationCard } from "./components/evaluation-card/EvaluationCard";
import { PhaseSummary } from "./components/phase-summary/PhaseSummary";
import { EarlyExitPrompt } from "./components/early-exit-prompt/EarlyExitPrompt";
import { FeedbackReport } from "./components/feedback-report/FeedbackReport";
import { ContentUpdatePreview } from "./components/content-update-preview/ContentUpdatePreview";
import { HistoryList } from "./components/history-list/HistoryList";
import { HistoryDetail } from "./components/history-detail/HistoryDetail";

/* ─── Props ──────────────────────────────────────────────── */

interface SelfTestModuleProps {
  topicId: string;
  topic: Topic;
  artifacts: Record<string, string>;
}

/* ─── Experience Level (hardcoded for now, could come from config) ─── */

const DEFAULT_EXPERIENCE_LEVEL: 5 | 10 | 15 = 5;

/* ─── Component ──────────────────────────────────────────── */

export function SelfTestModule({
  topicId,
  topic,
  artifacts,
}: SelfTestModuleProps) {
  const store = useAssessmentStore();
  const session = useAssessmentSession(topicId, topic, artifacts);

  // Derive category and slug from topic for history
  const category = topic.category;
  const slug = topic.slug ?? topicId;

  const {
    history,
    trend,
    isLoading: historyLoading,
    error: historyError,
    loadHistory,
    deleteRecord,
    getRecordDetail,
    startRegeneratedTest,
  } = useAssessmentHistory(topicId, category, slug);

  const {
    preview: contentUpdatePreview,
    isLoading: contentUpdateLoading,
    error: contentUpdateError,
    requestUpdate,
    confirmUpdate,
    discardUpdate,
  } = useContentUpdate();

  // Track which history record is selected for detail view
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /* ─── Handlers ─────────────────────────────────────────── */

  const handleStart = useCallback(() => {
    session.startAssessment(DEFAULT_EXPERIENCE_LEVEL);
  }, [session]);

  const handleResume = useCallback(() => {
    // Find in-progress record from history
    const inProgressRecord = history?.assessments.find(
      (r) => r.status === "in-progress"
    );
    if (inProgressRecord) {
      session.resumeAssessment(inProgressRecord, DEFAULT_EXPERIENCE_LEVEL);
    }
  }, [session, history]);

  const handleDiscard = useCallback(() => {
    // Discard existing in-progress session and start fresh
    session.startAssessment(DEFAULT_EXPERIENCE_LEVEL);
  }, [session]);

  const handleSubmitAnswer = useCallback(
    (answer: string) => {
      session.submitAnswer(answer);
    },
    [session]
  );

  const handleNextQuestion = useCallback(() => {
    const { currentQuestionIndex, currentQuestions } = store;
    const isLast = currentQuestionIndex >= currentQuestions.length - 1;

    if (isLast) {
      // Last question in phase — trigger next question which the store handles
      // The hook's completePhase handles evaluation accumulation
      session.nextQuestion();
    } else {
      session.nextQuestion();
    }
  }, [session, store]);

  const handleCompletePhaseContinue = useCallback(() => {
    session.advancePhase(DEFAULT_EXPERIENCE_LEVEL);
  }, [session]);

  const handleEarlyExitEnd = useCallback(() => {
    store.reset();
  }, [store]);

  const handleEarlyExitContinue = useCallback(() => {
    session.declineEarlyExit(DEFAULT_EXPERIENCE_LEVEL);
  }, [session]);

  const handleUpdateContent = useCallback(
    (artifact: string, gap: string) => {
      const weaknesses = store.feedbackReport?.weaknesses ?? [];
      requestUpdate(topicId, artifact, weaknesses, gap);
    },
    [topicId, store.feedbackReport, requestUpdate]
  );

  const handleConfirmContentUpdate = useCallback(async () => {
    if (!contentUpdatePreview) return;
    await confirmUpdate(
      topicId,
      contentUpdatePreview.artifact,
      contentUpdatePreview.updatedContent
    );
  }, [topicId, contentUpdatePreview, confirmUpdate]);

  const handleDiscardContentUpdate = useCallback(() => {
    discardUpdate();
  }, [discardUpdate]);

  const handleCloseReport = useCallback(() => {
    store.reset();
    setSelectedRecordId(null);
    loadHistory(); // Refresh history after completion
  }, [store, loadHistory]);

  const handleHistorySelect = useCallback(
    (recordId: string) => {
      setSelectedRecordId(recordId);
    },
    []
  );

  const handleHistoryDelete = useCallback(
    async (recordId: string) => {
      await deleteRecord(recordId);
    },
    [deleteRecord]
  );

  const handleHistoryRegenerate = useCallback(
    (recordId: string) => {
      const weakAreas = startRegeneratedTest(recordId);
      if (!weakAreas) {
        store.setError("Could not extract weak areas from this record.");
        return;
      }

      // Start a new assessment session targeting weak areas
      // The startAssessment will generate fresh questions, but the weak areas
      // context informs the user about what to focus on
      session.startAssessment(DEFAULT_EXPERIENCE_LEVEL);
    },
    [startRegeneratedTest, session, store]
  );

  const handleRetry = useCallback(() => {
    store.setError(null);
  }, [store]);

  /* ─── Derived State ────────────────────────────────────── */

  const {
    status,
    currentPhaseIndex,
    currentPhaseType,
    currentDifficulty,
    currentQuestions,
    currentQuestionIndex,
    currentEvaluation,
    currentAnswer,
    phaseResults,
    feedbackReport,
    confidenceScore,
    isGenerating,
    error,
  } = store;

  const hasInProgressSession =
    history?.assessments.some((r) => r.status === "in-progress") ?? false;

  /* ─── Render ───────────────────────────────────────────── */

  // Error state
  if (status === "error" && error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Generating feedback
  if ((status as string) === "generating-feedback") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Generating your feedback report...
          </p>
        </div>
      </div>
    );
  }

  // Summary / Feedback report
  if (status === "summary" && feedbackReport && confidenceScore !== null) {
    return (
      <div className="max-w-3xl mx-auto p-6 relative">
        <FeedbackReport
          report={feedbackReport}
          confidenceScore={confidenceScore}
          topicId={topicId}
          onUpdateContent={handleUpdateContent}
          onClose={handleCloseReport}
        />

        {/* Content Update Overlay */}
        {(contentUpdatePreview || contentUpdateLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <ContentUpdatePreview
                originalContent={contentUpdatePreview?.originalContent ?? ""}
                updatedContent={contentUpdatePreview?.updatedContent ?? ""}
                artifact={contentUpdatePreview?.artifact ?? ""}
                isLoading={contentUpdateLoading}
                onConfirm={handleConfirmContentUpdate}
                onDiscard={handleDiscardContentUpdate}
              />
            </div>
          </div>
        )}

        {/* Content Update Error */}
        {contentUpdateError && !contentUpdatePreview && !contentUpdateLoading && (
          <div className="mt-4 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-300">
              {contentUpdateError}
            </p>
            <button
              type="button"
              onClick={discardUpdate}
              className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  // Early exit
  if (status === "early-exit") {
    const lastPhaseResult = phaseResults[phaseResults.length - 1];
    return (
      <div className="max-w-3xl mx-auto p-6">
        <EarlyExitPrompt
          phaseScore={lastPhaseResult?.phaseScore ?? 0}
          onEndSession={handleEarlyExitEnd}
          onContinue={handleEarlyExitContinue}
        />
      </div>
    );
  }

  // Phase summary
  if (status === "phase-summary") {
    const lastPhaseResult = phaseResults[phaseResults.length - 1];
    if (lastPhaseResult) {
      return (
        <div className="max-w-3xl mx-auto p-6">
          <PhaseSummary
            phaseResult={lastPhaseResult}
            onContinue={handleCompletePhaseContinue}
          />
        </div>
      );
    }
  }

  // Evaluating — showing evaluation feedback for current question
  if (status === "evaluating" && currentEvaluation) {
    const question = currentQuestions[currentQuestionIndex];
    const isLastInPhase = currentQuestionIndex >= currentQuestions.length - 1;

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {currentPhaseType && (
          <PhaseHeader
            phaseType={currentPhaseType}
            phaseNumber={currentPhaseIndex + 1}
            totalPhases={PHASE_ORDER.length}
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={currentQuestions.length}
            difficulty={currentDifficulty}
          />
        )}
        <EvaluationCard
          evaluation={currentEvaluation}
          question={question}
          userAnswer={currentAnswer}
          onNext={handleNextQuestion}
          isLastInPhase={isLastInPhase}
        />
      </div>
    );
  }

  // Active session: starting or in-phase (answering questions)
  if (status === "starting" || status === "in-phase") {
    const question = currentQuestions[currentQuestionIndex];

    // Still generating questions (loading state)
    if (isGenerating || !question) {
      return (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Generating questions...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {currentPhaseType && (
          <PhaseHeader
            phaseType={currentPhaseType}
            phaseNumber={currentPhaseIndex + 1}
            totalPhases={PHASE_ORDER.length}
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={currentQuestions.length}
            difficulty={currentDifficulty}
          />
        )}
        <QuestionCard
          question={question}
          onSubmit={handleSubmitAnswer}
          isEvaluating={store.isEvaluating}
        />
      </div>
    );
  }

  // Idle — show launcher + history (or history detail)
  const selectedRecord = selectedRecordId
    ? getRecordDetail(selectedRecordId)
    : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Assessment Launcher */}
      <AssessmentLauncher
        topicStatus={topic.status}
        hasInProgressSession={hasInProgressSession}
        onStart={handleStart}
        onResume={handleResume}
        onDiscard={handleDiscard}
      />

      {/* History Detail View */}
      {selectedRecord ? (
        <HistoryDetail
          record={selectedRecord}
          onClose={() => setSelectedRecordId(null)}
        />
      ) : (
        <>
          {/* Assessment History */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            </div>
          ) : historyError ? (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
              <p className="text-sm text-red-700 dark:text-red-300">
                {historyError}
              </p>
              <button
                type="button"
                onClick={loadHistory}
                className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <HistoryList
              records={history?.assessments ?? []}
              trend={trend}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
              onRegenerate={handleHistoryRegenerate}
            />
          )}
        </>
      )}
    </div>
  );
}
