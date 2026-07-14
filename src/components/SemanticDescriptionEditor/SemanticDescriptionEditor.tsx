"use client";

/**
 * Collapsible editor for the semantic description metadata on Topics and Problems.
 * Allows the user to specify learning intent, target depth, focus areas,
 * free-form context, and concepts they already know.
 */

import { useState, useCallback } from "react";
import type { SemanticDescriptionEditorProps } from "./types";
import type { SemanticDescription, TargetLevel } from "@/types";

const TARGET_LEVEL_OPTIONS: { value: TargetLevel; label: string }[] = [
  { value: "beginner", label: "Beginner (L3/L4)" },
  { value: "intermediate", label: "Intermediate (L4)" },
  { value: "senior", label: "Senior (L4/L5)" },
  { value: "staff", label: "Staff (L5/L6)" },
  { value: "principal", label: "Principal (L6/L7)" },
];

const FOCUS_SUGGESTIONS = [
  "theory",
  "implementation",
  "interview",
  "production",
  "patterns",
  "trade-offs",
  "edge-cases",
  "complexity-analysis",
  "system-design",
  "optimization",
];

export default function SemanticDescriptionEditor({
  value,
  onChange,
  defaultExpanded = false,
}: SemanticDescriptionEditorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const update = useCallback(
    (patch: Partial<NonNullable<SemanticDescription>>) => {
      const current = value ?? {};
      const next = { ...current, ...patch };

      // Clean up empty fields
      if (!next.intent) delete next.intent;
      if (!next.targetLevel) delete next.targetLevel;
      if (!next.context) delete next.context;
      if (!next.focus || next.focus.length === 0) delete next.focus;
      if (!next.knownConcepts || next.knownConcepts.length === 0)
        delete next.knownConcepts;

      // If everything is empty, set to undefined
      if (Object.keys(next).length === 0) {
        onChange(undefined);
      } else {
        onChange(next);
      }
    },
    [value, onChange],
  );

  const handleFocusToggle = useCallback(
    (tag: string) => {
      const current = value?.focus ?? [];
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      update({ focus: next });
    },
    [value, update],
  );

  const hasContent = value && Object.keys(value).length > 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AI Context
          </span>
          {hasContent && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              configured
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Help AI generate better content by providing context about your
            learning goals for this specific item.
          </p>

          {/* Intent */}
          <div>
            <label
              htmlFor="semantic-intent"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Learning Intent
            </label>
            <input
              id="semantic-intent"
              type="text"
              value={value?.intent ?? ""}
              onChange={(e) => update({ intent: e.target.value || undefined })}
              placeholder="e.g., Master this for Google L5 interviews, focus on optimization"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Target Level */}
          <div>
            <label
              htmlFor="semantic-level"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Target Depth (overrides global setting for this item)
            </label>
            <select
              id="semantic-level"
              value={value?.targetLevel ?? ""}
              onChange={(e) =>
                update({
                  targetLevel: (e.target.value || undefined) as
                    | TargetLevel
                    | undefined,
                })
              }
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Use global setting</option>
              {TARGET_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Focus Areas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_SUGGESTIONS.map((tag) => {
                const active = value?.focus?.includes(tag) ?? false;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleFocusToggle(tag)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context */}
          <div>
            <label
              htmlFor="semantic-context"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Additional Context
            </label>
            <textarea
              id="semantic-context"
              value={value?.context ?? ""}
              onChange={(e) => update({ context: e.target.value || undefined })}
              placeholder="e.g., Already comfortable with basic recursion. Need to nail the iterative approach for interviews."
              rows={2}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Known Concepts */}
          <div>
            <label
              htmlFor="semantic-known"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Already Known (AI will skip these in explanations)
            </label>
            <input
              id="semantic-known"
              type="text"
              value={value?.knownConcepts?.join(", ") ?? ""}
              onChange={(e) => {
                const concepts = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                update({ knownConcepts: concepts.length > 0 ? concepts : undefined });
              }}
              placeholder="e.g., binary-trees, recursion, hashmaps (comma-separated)"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Comma-separated concepts you already know well
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
