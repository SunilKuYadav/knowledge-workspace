"use client";

interface LoadingPhaseProps {
  message: string;
}

export function LoadingPhase({ message }: LoadingPhaseProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
      <div className="flex items-center justify-center gap-3">
        <svg
          className="animate-spin h-5 w-5 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
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
        <span className="text-zinc-600 dark:text-zinc-400">{message}</span>
      </div>
    </div>
  );
}
