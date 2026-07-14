"use client";

import { useState } from "react";
import type { ProblemDescription } from "@/types";
import type { ExecutionResult, TestCaseResult } from "@/app/coding-interview/lib/types";
import type { PracticeTarget } from "../../types";

interface TestCaseListProps {
  desc: ProblemDescription | null;
  practiceTarget: PracticeTarget;
  executionResult: ExecutionResult | null;
  isExecuting: boolean;
  onRunSingle: (index: number) => void;
  validationResults?: {
    index: number;
    input: string;
    expectedOutput: string;
    isValid: boolean;
    correctedOutput?: string;
    reason?: string;
  }[] | null;
}

interface RawTestCase {
  input: string;
  expectedOutput: string;
  label: "example" | "hidden";
}

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Displays test cases in collapsible items with individual run buttons.
 * Shows input/expected before running, and adds actual output + pass/fail after.
 */
export function TestCaseList({
  desc,
  practiceTarget,
  executionResult,
  isExecuting,
  onRunSingle,
  validationResults,
}: TestCaseListProps) {
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());

  if (!desc) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Generate a description to see test cases
      </p>
    );
  }

  // Collect all raw test cases based on practice target
  const rawTestCases: RawTestCase[] = (() => {
    if (practiceTarget.type === "variation" && practiceTarget.variationId) {
      const v = desc.variations?.find((vr) => vr.id === practiceTarget.variationId);
      if (v) {
        const examples = (v.samples || []).map((s) => ({
          input: s.input,
          expectedOutput: s.output,
          label: "example" as const,
        }));
        const hidden = (v.testCases || []).map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          label: "hidden" as const,
        }));
        return [...examples, ...hidden];
      }
    }
    const examples = desc.examples.map((ex) => ({
      input: ex.input,
      expectedOutput: ex.expectedOutput,
      label: "example" as const,
    }));
    const hidden = desc.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      label: "hidden" as const,
    }));
    return [...examples, ...hidden];
  })();

  if (rawTestCases.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        No test cases available
      </p>
    );
  }

  const results = executionResult?.testResults ?? [];
  const passedCount = results.filter((r) => r?.passed).length;
  const ranCount = results.filter((r) => r?.actualOutput !== undefined).length;

  const toggleCase = (index: number) => {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      {/* Summary bar */}
      {ranCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          <span
            className={
              passedCount === rawTestCases.length
                ? "text-green-600 dark:text-green-400 font-medium"
                : "text-zinc-600 dark:text-zinc-300 font-medium"
            }
          >
            {passedCount}/{rawTestCases.length} passed
          </span>
          {executionResult && (
            <>
              <span>•</span>
              <span>{executionResult.executionTimeMs.toFixed(1)}ms</span>
              <span>•</span>
              <span>{executionResult.memoryUsageMb.toFixed(1)} MB</span>
            </>
          )}
        </div>
      )}

      {/* Test case items — failed cases sorted to top */}
      {(() => {
        const indexed = rawTestCases.map((tc, index) => ({ tc, index }));
        const sorted = [...indexed].sort((a, b) => {
          const aResult = results[a.index];
          const bResult = results[b.index];
          const aFailed = aResult && aResult.actualOutput !== undefined && !aResult.passed;
          const bFailed = bResult && bResult.actualOutput !== undefined && !bResult.passed;
          // Also prioritize invalid test cases from validation
          const aInvalid = validationResults?.find((v) => v.index === a.index && !v.isValid);
          const bInvalid = validationResults?.find((v) => v.index === b.index && !v.isValid);
          if ((aFailed || aInvalid) && !(bFailed || bInvalid)) return -1;
          if (!(aFailed || aInvalid) && (bFailed || bInvalid)) return 1;
          return 0;
        });

        return sorted.map(({ tc, index }) => {
          const result: TestCaseResult | undefined = results[index];
          const isExpanded = expandedCases.has(index);
          const hasRun = result && result.actualOutput !== undefined;
          const validation = validationResults?.find((v) => v.index === index);

          return (
            <TestCaseItem
              key={index}
              index={index}
              rawTestCase={tc}
              result={result}
              isExpanded={isExpanded}
              hasRun={!!hasRun}
              isExecuting={isExecuting}
              onToggle={() => toggleCase(index)}
              onRun={() => onRunSingle(index)}
              validation={validation}
            />
          );
        });
      })()}
    </div>
  );
}

interface TestCaseItemProps {
  index: number;
  rawTestCase: RawTestCase;
  result: TestCaseResult | undefined;
  isExpanded: boolean;
  hasRun: boolean;
  isExecuting: boolean;
  onToggle: () => void;
  onRun: () => void;
  validation?: {
    index: number;
    isValid: boolean;
    correctedOutput?: string;
    reason?: string;
  };
}

function TestCaseItem({
  index,
  rawTestCase,
  result,
  isExpanded,
  hasRun,
  isExecuting,
  onToggle,
  onRun,
  validation,
}: TestCaseItemProps) {
  const passed = result?.passed;
  const isInvalid = validation && !validation.isValid;

  // Determine border/bg color based on result state
  const borderColor = isInvalid
    ? "border-amber-200 dark:border-amber-800"
    : !hasRun
      ? "border-zinc-200 dark:border-zinc-700"
      : passed
        ? "border-green-200 dark:border-green-800"
        : "border-red-200 dark:border-red-800";

  const bgColor = isInvalid
    ? "bg-amber-50/50 dark:bg-amber-900/10"
    : !hasRun
      ? "bg-white dark:bg-zinc-900"
      : passed
        ? "bg-green-50/50 dark:bg-green-900/10"
        : "bg-red-50/50 dark:bg-red-900/10";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Header row — always visible */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
          aria-expanded={isExpanded}
        >
          {/* Expand/collapse chevron */}
          <svg
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>

          {/* Test case label */}
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case {index + 1}
          </span>

          {/* Type badge */}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              rawTestCase.label === "example"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {rawTestCase.label === "example" ? "example" : "hidden"}
          </span>

          {/* Pass/fail indicator */}
          {hasRun && (
            <span
              className={`text-sm ${passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              aria-label={passed ? "Passed" : "Failed"}
            >
              {passed ? "✓" : "✗"}
            </span>
          )}

          {/* Validation indicator */}
          {validation && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                validation.isValid
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {validation.isValid ? "valid" : "invalid"}
            </span>
          )}
        </button>

        {/* Run single button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRun();
          }}
          disabled={isExecuting}
          className="px-2 py-1 text-[11px] font-medium rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={`Run Case ${index + 1}`}
          aria-label={`Run test case ${index + 1}`}
        >
          ▶ Run
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
          <div className="text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400">Input: </span>
            <span className="text-zinc-700 dark:text-zinc-300 break-all">
              {rawTestCase.input}
            </span>
          </div>
          <div className="text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400">Expected: </span>
            <span className={`break-all ${isInvalid ? "text-red-600 dark:text-red-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
              {rawTestCase.expectedOutput}
            </span>
          </div>
          {isInvalid && validation.correctedOutput && (
            <div className="text-xs font-mono">
              <span className="text-zinc-500 dark:text-zinc-400">Corrected: </span>
              <span className="text-green-700 dark:text-green-400 break-all font-medium">
                {validation.correctedOutput}
              </span>
            </div>
          )}
          {isInvalid && validation.reason && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              ⚠ {validation.reason}
            </div>
          )}
          {hasRun && result && (
            <div className="text-xs font-mono">
              <span className="text-zinc-500 dark:text-zinc-400">Actual: </span>
              <span
                className={`break-all ${
                  passed
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {formatValue(result.actualOutput)}
              </span>
            </div>
          )}
          {hasRun && result && result.executionTimeMs > 0 && (
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              {result.executionTimeMs.toFixed(1)}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
