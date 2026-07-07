"use client";

import { useTimer } from "../hooks/useTimer";
import { DEFAULT_DURATION } from "../lib/constants";

interface TimerPanelProps {
  durationMinutes?: number;
  onExpire: () => void;
}

/**
 * Timer display panel showing elapsed and remaining time with
 * pause/resume controls and warning styling when time is low.
 */
export function TimerPanel({
  durationMinutes = DEFAULT_DURATION,
  onExpire,
}: TimerPanelProps) {
  const {
    elapsedSeconds,
    remainingSeconds,
    isRunning,
    isWarning,
    isExpired,
    pause,
    resume,
    formatTime,
  } = useTimer({ durationMinutes, onExpire });

  const remainingColor = isExpired
    ? "text-red-600 dark:text-red-400"
    : isWarning
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
      {/* Elapsed time */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Elapsed
        </span>
        <span className="text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Remaining time */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Remaining
        </span>
        <span className={`text-sm font-mono font-medium ${remainingColor}`}>
          {formatTime(remainingSeconds)}
        </span>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Pause / Resume button */}
      {!isExpired && (
        <button
          type="button"
          onClick={isRunning ? pause : resume}
          className="text-xs font-medium px-3 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {isRunning ? "Pause" : "Resume"}
        </button>
      )}

      {/* Expired indicator */}
      {isExpired && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          Time&apos;s up
        </span>
      )}
    </div>
  );
}
