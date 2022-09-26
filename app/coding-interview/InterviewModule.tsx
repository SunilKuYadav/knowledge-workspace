'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { InterviewModuleProps } from './lib/types';
import { useInterviewSession } from './hooks/useInterviewSession';
import { useCodeExecution } from './hooks/useCodeExecution';
import { useFollowUp } from './hooks/useFollowUp';
import { useInterviewStore } from './store/interviewStore';
import { requestHint } from './lib/api';
import {
  CodeEditor,
  ProblemPanel,
  TimerPanel,
  HintPanel,
  ConsolePanel,
  TestCasePanel,
  FollowUpPanel,
  ScorePanel,
  SummaryPanel,
  ConfirmDialog,
} from './components';

/**
 * Top-level InterviewModule component.
 * Self-contained — renders without external layout dependencies.
 * Orchestrates the full interview lifecycle with phase-based rendering.
 */
export function InterviewModule(props: InterviewModuleProps) {
  const router = useRouter();
  const { phase, error, needsPrompt, retry, startWithPrompt } = useInterviewSession(props);
  const { isExecuting, runCode, submitCode } = useCodeExecution();
  const { isLoading: isFollowUpLoading, sendResponse, endDiscussion } = useFollowUp();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);

  // Store selectors
  const problem = useInterviewStore((s) => s.problem);
  const code = useInterviewStore((s) => s.code);
  const language = useInterviewStore((s) => s.language);
  const duration = useInterviewStore((s) => s.duration);
  const lastExecutionResult = useInterviewStore((s) => s.lastExecutionResult);
  const conversationHistory = useInterviewStore((s) => s.conversationHistory);
  const scoringReport = useInterviewStore((s) => s.scoringReport);
  const sessionSummary = useInterviewStore((s) => s.sessionSummary);
  const setCode = useInterviewStore((s) => s.setCode);
  const addHint = useInterviewStore((s) => s.addHint);
  const clearSession = useInterviewStore((s) => s.clearSession);

  /**
   * Request a hint at the given level from the AI service.
   */
  const handleRequestHint = useCallback(
    async (level: number) => {
      if (!problem) return;
      setIsHintLoading(true);
      try {
        const hints = useInterviewStore.getState().hints;
        const { hint } = await requestHint({
          problemStatement: problem.statement,
          code,
          level,
          previousHints: hints,
        });
        addHint(hint);
      } catch {
        // Hint failures are non-blocking — user can try again
      } finally {
        setIsHintLoading(false);
      }
    },
    [problem, code, addHint]
  );

  /**
   * Handle Submit button: show confirmation dialog.
   */
  const handleSubmitClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  /**
   * Confirm submission — calls submitCode and hides dialog.
   */
  const handleConfirmSubmit = useCallback(() => {
    setShowConfirm(false);
    submitCode();
  }, [submitCode]);

  /**
   * Cancel submission — hides dialog.
   */
  const handleCancelSubmit = useCallback(() => {
    setShowConfirm(false);
  }, []);

  /**
   * Auto-submit when timer expires.
   */
  const handleTimerExpire = useCallback(() => {
    submitCode();
  }, [submitCode]);

  /**
   * End interview: show confirmation before clearing.
   */
  const handleEndInterview = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  /**
   * Confirm end interview — clears store and resets session.
   */
  const handleConfirmEnd = useCallback(() => {
    setShowEndConfirm(false);
    clearSession();
    router.back();
  }, [clearSession, router]);

  /**
   * Cancel end interview.
   */
  const handleCancelEnd = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  // ─── Phase-based rendering ────────────────────────────────

  // Error state
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Error</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {error || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Needs prompt — ask user what kind of problem they want
  if (needsPrompt) {
    return <PromptScreen onSubmit={startWithPrompt} />;
  }

  // Initializing / Generating
  if (phase === 'initializing' || phase === 'generating') {
    return <GeneratingScreen />;
  }

  // Evaluating
  if (phase === 'evaluating') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Evaluating your solution...
          </p>
        </div>
      </div>
    );
  }

  // Scoring
  if (phase === 'scoring') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Generating your score...
          </p>
        </div>
      </div>
    );
  }

  // Follow-up phase
  if (phase === 'follow-up') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="mx-auto max-w-3xl">
          <FollowUpPanel
            messages={conversationHistory}
            onSendResponse={sendResponse}
            onEndDiscussion={endDiscussion}
            isLoading={isFollowUpLoading}
          />
        </div>
      </div>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {scoringReport && <ScorePanel report={scoringReport} />}
          {sessionSummary && <SummaryPanel summary={sessionSummary} />}
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => { clearSession(); router.back(); }}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              End Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Coding / Executing / Confirming phase
  if (phase === 'coding' || phase === 'executing' || phase === 'confirming') {
    return (
      <div className="h-screen bg-zinc-50 dark:bg-zinc-950 p-4 flex flex-col overflow-hidden">
        {/* Timer at top */}
        <div className="mb-4 shrink-0 flex items-center justify-between">
          <TimerPanel durationMinutes={duration} onExpire={handleTimerExpire} />
          <button
            type="button"
            onClick={handleEndInterview}
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            End Interview
          </button>
        </div>

        {/* Main split layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Problem + Hints (resizable) */}
          <LeftPanel>
            {problem && <ProblemPanel problem={problem} />}
            <HintPanel onRequestHint={handleRequestHint} isLoading={isHintLoading} />
          </LeftPanel>

          {/* Right: Editor + Controls + Results */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 pl-4">
            {/* Code Editor */}
            <div className="flex-1 min-h-[200px]">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                boilerplate={problem?.boilerplate ?? ''}
              />
            </div>

            {/* Run / Submit buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={runCode}
                disabled={isExecuting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting ? 'Running...' : 'Run'}
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={isExecuting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>

            {/* Console + Test Cases */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 max-h-[30%] overflow-y-auto">
              <ConsolePanel result={lastExecutionResult} isExecuting={isExecuting} />
              <TestCasePanel
                results={lastExecutionResult?.testResults ?? []}
                isExecuting={isExecuting}
              />
            </div>
          </div>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={showConfirm}
          title="Submit Solution"
          message="Are you sure you want to submit your solution? Once submitted, you cannot modify your code."
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
        />

        {/* End Interview Confirm Dialog */}
        <ConfirmDialog
          isOpen={showEndConfirm}
          title="End Interview"
          message="Are you sure you want to end the interview? All progress will be lost and the session will be cleared."
          onConfirm={handleConfirmEnd}
          onCancel={handleCancelEnd}
        />
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}

/**
 * Loading screen with elapsed time counter shown while the problem is being generated.
 */
function GeneratingScreen() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
      <div className="text-center">
        <svg
          className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Generating problem...
        </p>
        <p className="mt-2 text-xs font-mono text-zinc-400 dark:text-zinc-500">
          {timeDisplay}
        </p>
      </div>
    </div>
  );
}

/**
 * Resizable left panel container for Problem + Hints.
 */
function LeftPanel({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(400);
  const isDragging = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startWidth = width;

    function onMouseMove(moveEvent: MouseEvent) {
      if (!isDragging.current) return;
      const maxWidth = window.innerWidth * 0.6;
      const newWidth = Math.min(maxWidth, Math.max(250, startWidth + (moveEvent.clientX - startX)));
      setWidth(newWidth);
    }

    function onMouseUp() {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      className="relative flex-shrink-0 flex flex-col gap-4 overflow-y-auto"
      style={{ width: `${width}px`, minWidth: '250px', maxWidth: '60vw' }}
    >
      {children}
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
      />
    </div>
  );
}

/**
 * Prompt screen shown when the module doesn't have enough context to generate a problem.
 * Lets the user describe what kind of problem they want.
 */
function PromptScreen({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState('');

  const suggestions = [
    'Two pointer / sliding window problem (medium difficulty)',
    'Binary tree traversal problem (easy)',
    'Dynamic programming problem (hard)',
    'Graph traversal with BFS/DFS (medium)',
    'Hash map / frequency counting problem (easy)',
    'String manipulation problem (medium)',
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
    }
  }

  function handleSuggestion(suggestion: string) {
    onSubmit(suggestion);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              What would you like to practice?
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Describe the type of coding problem you want, or pick a suggestion below.
            </p>
          </div>

          {/* Custom prompt input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A medium difficulty problem about linked lists and two pointers..."
              rows={3}
              className="w-full px-4 py-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Problem
            </button>
          </form>

          {/* Suggestions */}
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Quick picks
            </p>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestion(suggestion)}
                  className="text-left px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
