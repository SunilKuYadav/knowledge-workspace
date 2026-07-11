"use client";

import { useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import type { CopyStatus, FullscreenActions, FullscreenPanelData } from "../types";
import {
  CopyIcon,
  CheckIcon,
  ResetIcon,
  FormatIcon,
  ExitFullscreenIcon,
} from "./Icons";
import { ConsolePanel } from "../../console-panel";
import { TestCasePanel } from "../../test-case-panel";
import { EvaluationPanel } from "../../evaluation-panel";

interface FullscreenLayoutProps {
  editorRef: RefObject<HTMLDivElement | null>;
  language: string;
  readOnly: boolean;
  copyStatus: CopyStatus;
  formatError: string | null;
  onCopy: () => void;
  onReset: () => void;
  onFormat: () => void;
  onExitFullscreen: () => void;
  fullscreenActions?: FullscreenActions;
  fullscreenPanelData?: FullscreenPanelData;
}

/**
 * Full-screen layout for the code editor with action buttons, test cases,
 * console output, and evaluation panels. Resizable vertical split between
 * editor and results panels.
 */
export function FullscreenLayout({
  editorRef,
  language,
  readOnly,
  copyStatus,
  formatError,
  onCopy,
  onReset,
  onFormat,
  onExitFullscreen,
  fullscreenActions,
  fullscreenPanelData,
}: FullscreenLayoutProps) {
  // Vertical resizable: editor height vs bottom panel height
  const [editorHeightPercent, setEditorHeightPercent] = useState(65);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bottom panel tab state
  const [activeTab, setActiveTab] = useState<"testCases" | "console" | "evaluation">("testCases");

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    function onMouseMove(moveEvent: MouseEvent) {
      if (!isDragging.current || !container) return;
      const relativeY = moveEvent.clientY - containerRect.top;
      const percent = (relativeY / containerRect.height) * 100;
      // Clamp between 25% and 85%
      setEditorHeightPercent(Math.min(85, Math.max(25, percent)));
    }

    function onMouseUp() {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const testResults = fullscreenPanelData?.testResults ?? [];
  const executionResult = fullscreenPanelData?.executionResult ?? null;
  const evaluation = fullscreenPanelData?.evaluation ?? null;
  const evaluationContent = fullscreenPanelData?.evaluationContent ?? null;
  const testCaseContent = fullscreenPanelData?.testCaseContent ?? null;
  const isExecuting = fullscreenActions?.isExecuting ?? false;

  // Count passed test cases for badge
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Copy code to clipboard"
          >
            {copyStatus === "copied" ? (
              <>
                <CheckIcon />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Reset to boilerplate code"
          >
            <ResetIcon />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onFormat}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Format code"
          >
            <FormatIcon />
            <span>Format</span>
          </button>
          <button
            type="button"
            onClick={onExitFullscreen}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md
              bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900
              dark:hover:bg-zinc-300 transition-colors"
            aria-label="Exit fullscreen (Esc or F11)"
            title="Exit fullscreen (Esc or F11)"
          >
            <ExitFullscreenIcon />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Format error */}
      {formatError && (
        <div className="px-4 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 shrink-0">
          <p className="text-xs text-red-700 dark:text-red-400">
            {formatError}
          </p>
        </div>
      )}

      {/* Main content: editor + action bar + bottom panel */}
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
        {/* Editor area */}
        <div
          className="overflow-auto min-h-0"
          style={{ height: `${editorHeightPercent}%` }}
        >
          <div ref={editorRef} className="h-full" />
        </div>

        {/* Resize handle */}
        <div
          className="h-1.5 cursor-row-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors bg-zinc-100 dark:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-700 shrink-0"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize editor and results panel"
        />

        {/* Bottom section: action buttons + tabbed panels */}
        <div
          className="flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${100 - editorHeightPercent}%` }}
        >
          {/* Action buttons bar */}
          {fullscreenActions && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 shrink-0">
              <button
                type="button"
                onClick={fullscreenActions.onRun}
                disabled={fullscreenActions.isExecuting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  text-white bg-green-600 hover:bg-green-700
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fullscreenActions.isExecuting ? <SpinnerIcon /> : <RunIcon />}
                <span>{fullscreenActions.isExecuting ? "Running..." : "Run"}</span>
              </button>
              <button
                type="button"
                onClick={() => fullscreenActions.onHint(1)}
                disabled={fullscreenActions.isHintLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  text-white bg-amber-600 hover:bg-amber-700
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fullscreenActions.isHintLoading ? <SpinnerIcon /> : <HintIcon />}
                <span>{fullscreenActions.isHintLoading ? "Generating..." : "Hint"}</span>
              </button>
              {fullscreenActions.onNote && (
                <button
                  type="button"
                  onClick={fullscreenActions.onNote}
                  disabled={fullscreenActions.isNoteGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                    text-white bg-purple-600 hover:bg-purple-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fullscreenActions.isNoteGenerating ? <SpinnerIcon /> : <NoteIcon />}
                  <span>{fullscreenActions.isNoteGenerating ? "Generating..." : "Note"}</span>
                </button>
              )}
              {fullscreenActions.onVariation && (
                <button
                  type="button"
                  onClick={fullscreenActions.onVariation}
                  disabled={fullscreenActions.isVariationLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                    text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700
                    hover:bg-zinc-300 dark:hover:bg-zinc-600
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fullscreenActions.isVariationLoading ? <SpinnerIcon /> : <VariationIcon />}
                  <span>{fullscreenActions.isVariationLoading ? "Creating..." : "Variation"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={fullscreenActions.onEvaluate}
                disabled={fullscreenActions.isExecuting || fullscreenActions.isEvaluating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  text-white bg-red-600 hover:bg-red-700
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fullscreenActions.isEvaluating ? <SpinnerIcon /> : <EvaluateIcon />}
                <span>{fullscreenActions.isEvaluating ? "Evaluating..." : "Evaluate"}</span>
              </button>

              {/* Status indicator for active processes */}
              <ActiveStatusIndicator
                isHintLoading={fullscreenActions.isHintLoading}
                isEvaluating={fullscreenActions.isEvaluating}
                isNoteGenerating={fullscreenActions.isNoteGenerating}
                isVariationLoading={fullscreenActions.isVariationLoading}
              />
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0">
            <TabButton
              active={activeTab === "testCases"}
              onClick={() => setActiveTab("testCases")}
              badge={totalCount > 0 ? `${passedCount}/${totalCount}` : undefined}
            >
              Test Cases
            </TabButton>
            <TabButton
              active={activeTab === "console"}
              onClick={() => setActiveTab("console")}
            >
              Console
            </TabButton>
            <TabButton
              active={activeTab === "evaluation"}
              onClick={() => setActiveTab("evaluation")}
              badge={fullscreenActions?.isEvaluating ? "⏳" : (evaluation || evaluationContent) ? "✓" : undefined}
            >
              Evaluation
            </TabButton>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {activeTab === "testCases" && (
              testCaseContent ? (
                <>{testCaseContent}</>
              ) : (
                <TestCasePanel results={testResults} isExecuting={isExecuting} />
              )
            )}
            {activeTab === "console" && (
              <ConsolePanel result={executionResult} isExecuting={isExecuting} />
            )}
            {activeTab === "evaluation" && (
              fullscreenActions?.isEvaluating ? (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg
                      className="h-5 w-5 animate-spin text-red-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Evaluating your solution...</span>
                  </div>
                </div>
              ) : evaluationContent ? (
                <>{evaluationContent}</>
              ) : evaluation ? (
                <EvaluationPanel evaluation={evaluation} />
              ) : (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    Submit your solution to see the evaluation
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Button ─────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
      {badge && (
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
          active
            ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200"
            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Action Button Icons ────────────────────────────────── */

function RunIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function VariationIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}

function EvaluateIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ─── Active Status Indicator ────────────────────────────── */

function ActiveStatusIndicator({
  isHintLoading,
  isEvaluating,
  isNoteGenerating,
  isVariationLoading,
}: {
  isHintLoading?: boolean;
  isEvaluating?: boolean;
  isNoteGenerating?: boolean;
  isVariationLoading?: boolean;
}) {
  const activeProcesses: string[] = [];
  if (isHintLoading) activeProcesses.push("Generating hint");
  if (isEvaluating) activeProcesses.push("Evaluating solution");
  if (isNoteGenerating) activeProcesses.push("Generating note");
  if (isVariationLoading) activeProcesses.push("Creating variation");

  if (activeProcesses.length === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <svg
        className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
        {activeProcesses.join(" • ")}
      </span>
    </div>
  );
}
