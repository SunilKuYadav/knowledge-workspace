"use client";

interface AssessmentLauncherProps {
  topicStatus: "not-started" | "in-progress" | "completed";
  hasInProgressSession: boolean;
  onStart: () => void;
  onResume: () => void;
  onDiscard: () => void;
}

export function AssessmentLauncher({
  topicStatus,
  hasInProgressSession,
  onStart,
  onResume,
  onDiscard,
}: AssessmentLauncherProps) {
  // Requirement 2.3: Assessment start disabled when not-started
  if (topicStatus === "not-started") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <button
          type="button"
          disabled
          className="px-5 py-2.5 text-sm font-medium rounded-lg bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          aria-disabled="true"
        >
          Start Assessment
        </button>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mark as in-progress before starting
        </p>
      </div>
    );
  }

  // Requirement 5.4 & 5.7: Resume from checkpoint / one in-progress session per topic
  if (hasInProgressSession) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          You have an in-progress assessment session.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onResume}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Resume Session
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Start New
          </button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Starting new will discard the existing session
        </p>
      </div>
    );
  }

  // Default: show Start Assessment button
  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      <button
        type="button"
        onClick={onStart}
        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Start Assessment
      </button>
    </div>
  );
}
