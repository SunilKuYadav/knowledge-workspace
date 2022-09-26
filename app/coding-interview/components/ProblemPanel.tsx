'use client';

import type { GeneratedProblem } from '../lib/types';

interface ProblemPanelProps {
  problem: GeneratedProblem;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  hard: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
};

export function ProblemPanel({ problem }: ProblemPanelProps) {
  return (
    <div className="overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="p-6 space-y-6">
        {/* Title + Difficulty */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {problem.title}
            </h2>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${difficultyColors[problem.difficulty] || ''}`}
            >
              {problem.difficulty}
            </span>
          </div>

          {/* Category */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {problem.category}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Problem Statement */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Problem Statement
          </h3>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {problem.statement}
          </div>
        </section>

        {/* Constraints */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Constraints
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {problem.constraints.map((constraint, i) => (
              <li key={i}>{constraint}</li>
            ))}
          </ul>
        </section>

        {/* Input Format */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Input Format
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {problem.inputFormat}
          </p>
        </section>

        {/* Output Format */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Output Format
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {problem.outputFormat}
          </p>
        </section>

        {/* Samples */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Examples
          </h3>
          <div className="space-y-4">
            {problem.samples.map((sample, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-2"
              >
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Example {i + 1}
                </p>
                <div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Input:</span>
                  <pre className="mt-1 text-sm bg-zinc-50 dark:bg-zinc-800 rounded p-2 overflow-x-auto text-zinc-800 dark:text-zinc-200">
                    {sample.input}
                  </pre>
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Output:</span>
                  <pre className="mt-1 text-sm bg-zinc-50 dark:bg-zinc-800 rounded p-2 overflow-x-auto text-zinc-800 dark:text-zinc-200">
                    {sample.output}
                  </pre>
                </div>
                {sample.explanation && (
                  <div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Explanation:</span>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {sample.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
