"use client";

interface ContentUpdatePreviewProps {
  originalContent: string;
  updatedContent: string;
  artifact: string;
  isLoading: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}

export function ContentUpdatePreview({
  originalContent,
  updatedContent,
  artifact,
  isLoading,
  onConfirm,
  onDiscard,
}: ContentUpdatePreviewProps) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Content Update: {artifact}
        </h3>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generating content update…
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Side-by-side diff view */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Original
              </p>
              <div className="flex-1 p-3 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 overflow-auto max-h-80">
                <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono">
                  {originalContent}
                </pre>
              </div>
            </div>

            {/* Updated */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Updated
              </p>
              <div className="flex-1 p-3 rounded-md bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 overflow-auto max-h-80">
                <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono">
                  {updatedContent}
                </pre>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onDiscard}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              Confirm Update
            </button>
          </div>
        </>
      )}
    </div>
  );
}
