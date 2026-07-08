"use client";

import type { EvaluationPanelProps } from "./types";

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Evaluation Results
      </h2>

      {/* 1. Correctness */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Correctness
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          {evaluation.correctness.testsPassed}/
          {evaluation.correctness.testsTotal} tests passed
        </p>
        <div className="space-y-2">
          {evaluation.correctness.results.map((result, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded ${
                result.passed
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              <span>{result.passed ? "✓" : "✗"}</span>
              <span className="font-mono text-xs truncate">
                Input: {JSON.stringify(result.input)}
              </span>
              {!result.passed && (
                <span className="ml-auto text-xs">
                  Expected: {JSON.stringify(result.expectedOutput)} | Got:{" "}
                  {JSON.stringify(result.actualOutput)}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Algorithm Choice */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Algorithm Choice
        </h3>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Submitted:{" "}
            <span className="font-mono">
              {evaluation.algorithmChoice.submittedComplexity}
            </span>
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Optimal:{" "}
            <span className="font-mono">
              {evaluation.algorithmChoice.optimalComplexity}
            </span>
          </span>
          {evaluation.algorithmChoice.isOptimal ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              Optimal
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Not Optimal
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {evaluation.algorithmChoice.feedback}
        </p>
      </section>

      {/* 3. Complexity Analysis */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Complexity Analysis
        </h3>
        <div className="flex gap-4 mb-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Time:{" "}
            <span className="font-mono">
              {evaluation.complexityAnalysis.timeComplexity}
            </span>
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Space:{" "}
            <span className="font-mono">
              {evaluation.complexityAnalysis.spaceComplexity}
            </span>
          </span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {evaluation.complexityAnalysis.explanation}
        </p>
      </section>

      {/* 4. Code Quality */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Code Quality
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({evaluation.codeQuality.score}/100)
          </span>
        </h3>
        {evaluation.codeQuality.positives.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
              Positives
            </p>
            <ul className="list-disc list-inside space-y-1">
              {evaluation.codeQuality.positives.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {evaluation.codeQuality.improvements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
              Improvements
            </p>
            <ul className="list-disc list-inside space-y-1">
              {evaluation.codeQuality.improvements.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 5. Edge Case Handling */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Edge Case Handling
        </h3>
        {evaluation.edgeCaseHandling.handled.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
              Handled
            </p>
            <ul className="list-disc list-inside space-y-1">
              {evaluation.edgeCaseHandling.handled.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {evaluation.edgeCaseHandling.missed.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
              Missed
            </p>
            <ul className="list-disc list-inside space-y-1">
              {evaluation.edgeCaseHandling.missed.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 6. Error Handling */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Error Handling
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          {evaluation.errorHandling.assessment}
        </p>
        {evaluation.errorHandling.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Suggestions
            </p>
            <ul className="list-disc list-inside space-y-1">
              {evaluation.errorHandling.suggestions.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
