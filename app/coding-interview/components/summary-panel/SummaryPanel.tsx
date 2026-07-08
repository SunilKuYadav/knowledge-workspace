"use client";

import type { SummaryPanelProps } from "./types";
import { getPriorityBadge } from "./constants";

export function SummaryPanel({ summary }: SummaryPanelProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Session Summary
      </h2>

      {/* 1. Strengths */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-green-700 dark:text-green-400 mb-3">
          Strengths
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {summary.strengths.map((item, idx) => (
            <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Weaknesses */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-3">
          Weaknesses
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {summary.weaknesses.map((item, idx) => (
            <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Missed Edge Cases */}
      {summary.missedEdgeCases.length > 0 && (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Missed Edge Cases
          </h3>
          <div className="space-y-3">
            {summary.missedEdgeCases.map((ec, idx) => (
              <div key={idx} className="border-l-2 border-amber-400 pl-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {ec.case}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {ec.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Alternative Solutions */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Alternative Solutions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left py-2 pr-4 text-zinc-500 dark:text-zinc-400 font-medium">
                  Approach
                </th>
                <th className="text-left py-2 pr-4 text-zinc-500 dark:text-zinc-400 font-medium">
                  Time
                </th>
                <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                  Space
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.alternativeSolutions.map((sol, idx) => (
                <tr
                  key={idx}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                    {sol.approach}
                  </td>
                  <td className="py-2 pr-4 font-mono text-zinc-600 dark:text-zinc-400">
                    {sol.timeComplexity}
                  </td>
                  <td className="py-2 font-mono text-zinc-600 dark:text-zinc-400">
                    {sol.spaceComplexity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Study Recommendations */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Study Recommendations
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {summary.studyRecommendations.map((item, idx) => (
            <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Similar Problems */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Similar Problems
        </h3>
        <div className="space-y-2">
          {summary.similarProblems.map((prob, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {prob.title}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {prob.targetSkill}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Next Topics */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Next Topics
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {summary.nextTopics.map((topic, idx) => (
            <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300">
              {topic}
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Improvement Plan (priority-ordered) */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Improvement Plan
        </h3>
        <div className="space-y-3">
          {summary.improvementPlan.map((item, idx) => {
            const badge = getPriorityBadge(item.priority);
            return (
              <div key={idx} className="flex items-start gap-3">
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}
                >
                  {badge.label}
                </span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {item.action}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
