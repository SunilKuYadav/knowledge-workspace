"use client";

interface ConfidenceIndicatorProps {
  testResults: { passed: boolean }[];
}

export function ConfidenceIndicator({ testResults }: ConfidenceIndicatorProps) {
  const passed = testResults.filter((t) => t.passed).length;
  const total = testResults.length;
  const passRate = passed / total;

  let confidence: number;
  let label: string;
  let color: string;
  let bgColor: string;

  if (passRate <= 0.2) {
    confidence = 1;
    label = "Needs Work";
    color = "text-red-600 dark:text-red-400";
    bgColor = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  } else if (passRate <= 0.5) {
    confidence = 2;
    label = "Getting There";
    color = "text-orange-600 dark:text-orange-400";
    bgColor = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
  } else if (passRate <= 0.75) {
    confidence = 3;
    label = "Good Progress";
    color = "text-yellow-600 dark:text-yellow-400";
    bgColor = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  } else if (passRate < 1) {
    confidence = 4;
    label = "Almost There";
    color = "text-lime-600 dark:text-lime-400";
    bgColor = "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800";
  } else {
    confidence = 5;
    label = "Solved!";
    color = "text-green-600 dark:text-green-400";
    bgColor = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2 ${bgColor}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`w-2 h-5 rounded-sm transition-colors ${
                level <= confidence
                  ? passRate === 1
                    ? "bg-green-500"
                    : passRate > 0.75
                      ? "bg-lime-500"
                      : passRate > 0.5
                        ? "bg-yellow-500"
                        : passRate > 0.2
                          ? "bg-orange-500"
                          : "bg-red-500"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <span className={`text-sm font-medium ${color}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {passed}/{total} tests passed
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">•</span>
        <span>Confidence: {confidence}/5</span>
        {passRate === 1 && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              Status → Solved ✓
            </span>
          </>
        )}
      </div>
    </div>
  );
}
