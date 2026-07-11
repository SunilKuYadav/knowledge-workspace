"use client";

import { useCodeEditor } from "./useCodeEditor";
import {
  CopyIcon,
  CheckIcon,
  ResetIcon,
  FormatIcon,
  FullscreenIcon,
  ExitFullscreenIcon,
} from "./components/Icons";
import type { CodeEditorProps } from "./types";
import { FullscreenLayout } from "./components/FullscreenLayout";

export function CodeEditor(props: CodeEditorProps) {
  const {
    editorRef,
    isFullscreen,
    copyStatus,
    formatError,
    handleCopy,
    handleReset,
    handleFormat,
    handleFullscreenToggle,
    language,
    readOnly,
  } = useCodeEditor(props);

  // Fullscreen mode with action buttons, test cases, and evaluation
  if (isFullscreen) {
    return (
      <FullscreenLayout
        editorRef={editorRef}
        language={language}
        readOnly={readOnly}
        copyStatus={copyStatus}
        formatError={formatError}
        onCopy={handleCopy}
        onReset={handleReset}
        onFormat={handleFormat}
        onExitFullscreen={handleFullscreenToggle}
        fullscreenActions={props.fullscreenActions}
        fullscreenPanelData={props.fullscreenPanelData}
      />
    );
  }

  return (
    <div className="flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mr-2">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
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

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Reset to boilerplate code"
          >
            <ResetIcon />
            <span>Reset</span>
          </button>

          {/* Format button */}
          <button
            type="button"
            onClick={handleFormat}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Format code"
          >
            <FormatIcon />
            <span>Format</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={handleFullscreenToggle}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
              text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
              transition-colors"
            aria-label="Enter fullscreen (F11)"
            title="Enter fullscreen (F11)"
          >
            <FullscreenIcon />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Format error message */}
      {formatError && (
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">
            {formatError}
          </p>
        </div>
      )}

      {/* Editor container */}
      <div
        ref={editorRef}
        className="flex-1 overflow-auto min-h-0"
      />
    </div>
  );
}
