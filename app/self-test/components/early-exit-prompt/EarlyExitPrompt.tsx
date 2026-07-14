"use client";

interface EarlyExitPromptProps {
  phaseScore: number;
  studyRecommendations?: string[];
  onEndSession: () => void;
  onContinue: () => void;
}

export function EarlyExitPrompt({
  phaseScore,
  studyRecommendations = [],
  onEndSession,
  onContinue,
}: EarlyExitPromptProps) {
  return (
    <div className="flex flex-col gap-5 p-5 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
      {/* Score context */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Early Exit Recommended
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Your conceptual phase score was{" "}
          <span className="font-bold text-red-500">
            {phaseScore.toFixed(1)}/10
          </span>
          . This indicates the topic may need more study before continuing the
          assessment.
        </p>
      </div>

      {/* Study recommendations */}
      {studyRecommendations.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Recommended Study Areas
          </p>
          <ul className="space-y-2">
            {studyRecommendations.map((recommendation, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {recommendation}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onEndSession}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 transition-colors"
        >
          End Session
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Continue Anyway
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
          Difficulty will be reduced
        </span>
      </div>
    </div>
  );
}
