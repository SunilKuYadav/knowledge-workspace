'use client';

import Link from 'next/link';
import type { CategorizedItem } from '../lib/types';
import { useInteractiveReviewSession } from '../hooks/useInteractiveReviewSession';
import {
  IdlePhase,
  LoadingPhase,
  AnsweringPhase,
  FeedbackPhase,
  SummaryPhase,
} from './phases';

interface InteractiveReviewSessionProps {
  dueItems: CategorizedItem[];
}

export function InteractiveReviewSession({ dueItems }: InteractiveReviewSessionProps) {
  const {
    currentItemIndex,
    currentItem,
    phase,
    questions,
    currentQuestionIndex,
    userResponse,
    evaluation,
    answers,
    sessionSummary,
    hint,
    hintLoading,
    error,
    isPending,
    itemsCompleted,
    allSessionComplete,
    setUserResponse,
    startReview,
    submitAnswer,
    nextQuestion,
    requestHint,
    finishItemReview,
  } = useInteractiveReviewSession(dueItems);

  // ─── Empty / Complete states ───

  if (dueItems.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          No items due for review right now.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Check back later or browse the schedule tab to see upcoming reviews.
        </p>
      </div>
    );
  }

  if (allSessionComplete) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          🎉 All Reviews Complete!
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          You reviewed {itemsCompleted} item{itemsCompleted !== 1 ? 's' : ''} this session.
        </p>
      </div>
    );
  }

  // ─── Active session ───

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Item {currentItemIndex + 1}/{dueItems.length}
          {questions.length > 0 &&
            ` · Question ${currentQuestionIndex + 1}/${questions.length}`}
        </p>
        <div className="flex-1 mx-4 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
            style={{ width: `${(itemsCompleted / dueItems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Item header card */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {currentItem.item.itemType}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
            {currentItem.category}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            Confidence: {currentItem.item.confidence}/5
          </span>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {currentItem.item.itemId}
        </h2>
        <Link
          href={
            currentItem.item.itemType === 'topic'
              ? `/topics/${currentItem.item.itemId}`
              : `/problems/${currentItem.item.itemId}`
          }
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
        >
          View full content →
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Phase rendering */}
      {phase === 'idle' && (
        <IdlePhase currentItem={currentItem} onStart={startReview} />
      )}
      {phase === 'generating' && <LoadingPhase message="Generating review questions..." />}
      {phase === 'answering' && questions[currentQuestionIndex] && (
        <AnsweringPhase
          question={questions[currentQuestionIndex]}
          userResponse={userResponse}
          onResponseChange={setUserResponse}
          onSubmit={submitAnswer}
          onRequestHint={requestHint}
          hintLoading={hintLoading}
          hint={hint}
        />
      )}
      {phase === 'evaluating' && <LoadingPhase message="Evaluating your response..." />}
      {phase === 'feedback' && evaluation && (
        <FeedbackPhase
          evaluation={evaluation}
          isLastQuestion={currentQuestionIndex >= questions.length - 1}
          onNext={nextQuestion}
        />
      )}
      {phase === 'summary' && (
        <SummaryPhase
          currentItem={currentItem}
          answers={answers}
          sessionSummary={sessionSummary}
          isPending={isPending}
          onFinish={finishItemReview}
        />
      )}
    </div>
  );
}
