"use client";

import { useState } from "react";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import {
  CodeEditor,
  ConsolePanel,
  TestCasePanel,
} from "@/app/coding-interview/components";
import type { ProblemDescription, Problem } from "@/types";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import type { SolutionEvaluation, PracticeTarget } from "../../types";
import type { SolutionEntry } from "@/src/filesystem/FileProblemRepository";
import { CollapsibleSection } from "../collapsible-section";
import { ConfidenceIndicator } from "../confidence-indicator";

export interface PracticePanelProps {
  problem: Problem;
  desc: ProblemDescription | null;
  code: string;
  setCode: (code: string) => void;
  generating: boolean;
  genError: string | null;
  isExecuting: boolean;
  isGenNote: boolean;
  noteGenContent: string;
  variationLoading: boolean;
  executionResult: ExecutionResult | null;
  evaluation: SolutionEvaluation | null;
  isEvaluating: boolean;
  handleGenerateDescription: () => void;
  handleRunCode: () => void;
  handleGenerateNote: () => void;
  handleGenerateVariation: (upgradeVariationId?: string) => void;
  handleCancelNote: () => void;
  handleEvaluateSolution: () => void;
  hint: string | null;
  isGettingHint: boolean;
  hintStreamContent: string;
  handleGetHint: () => void;
  handleCancelHint: () => void;
  handleDismissHint: () => void;
  practiceTarget: PracticeTarget;
  onSwitchPracticeTarget: (target: PracticeTarget) => void;
  pendingSolution: SolutionEntry | null;
  onConfirmSaveSolution: () => void;
  onDismissPendingSolution: () => void;
}

export function PracticePanel({
  problem,
  desc,
  code,
  setCode,
  generating,
  genError,
  isExecuting,
  isGenNote,
  noteGenContent,
  variationLoading,
  executionResult,
  evaluation,
  isEvaluating,
  handleGenerateDescription,
  handleRunCode,
  handleGenerateNote,
  handleGenerateVariation,
  handleCancelNote,
  handleEvaluateSolution,
  hint,
  isGettingHint,
  hintStreamContent,
  handleGetHint,
  handleCancelHint,
  handleDismissHint,
  practiceTarget,
  onSwitchPracticeTarget,
  pendingSolution,
  onConfirmSaveSolution,
  onDismissPendingSolution,
}: PracticePanelProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // All tests passed — show note/variation/evaluate buttons
  const allTestsPassed =
    executionResult !== null &&
    !executionResult.error &&
    executionResult.testResults.length > 0 &&
    executionResult.testResults.every((t) => t.passed);

  // Get current practice context based on target
  const currentDescription = (() => {
    if (practiceTarget.type === "variation" && practiceTarget.variationId && desc?.variations) {
      const v = desc.variations.find((vr) => vr.id === practiceTarget.variationId);
      if (v) {
        return {
          title: v.title,
          difficulty: v.difficulty,
          description: v.description,
          constraints: v.constraints || [],
          examples: v.samples?.map((s) => ({
            input: s.input,
            expectedOutput: s.output,
            explanation: s.explanation,
          })) || [],
          timeComplexity: v.timeComplexity,
          spaceComplexity: v.spaceComplexity,
          boilerplate: v.boilerplate,
        };
      }
    }
    if (desc) {
      return {
        title: problem.title,
        difficulty: problem.difficulty,
        description: desc.description,
        constraints: desc.constraints,
        examples: desc.examples,
        timeComplexity: desc.timeComplexity,
        spaceComplexity: desc.spaceComplexity,
        boilerplate: desc.boilerplate,
      };
    }
    return null;
  })();

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left: Problem description — collapsible to left */}
      <div
        className={`shrink-0 border-r border-zinc-200 dark:border-zinc-700 flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? "w-10" : "w-[400px]"
        }`}
      >
        {/* Collapse toggle header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-1">
              Problem
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label={sidebarCollapsed ? "Expand problem panel" : "Collapse problem panel"}
            title={sidebarCollapsed ? "Expand problem panel" : "Collapse problem panel"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Panel content — hidden when collapsed */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {desc ? (
              <div className="p-4 space-y-3">
                {/* Practice target selector */}
                {desc.variations && desc.variations.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Practicing
                    </label>
                    <select
                      value={practiceTarget.type === "main" ? "main" : practiceTarget.variationId || "main"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "main") {
                          onSwitchPracticeTarget({
                            type: "main",
                            title: problem.title,
                            difficulty: problem.difficulty,
                          });
                        } else {
                          const variation = desc.variations?.find((v) => v.id === val);
                          if (variation) {
                            onSwitchPracticeTarget({
                              type: "variation",
                              variationId: variation.id,
                              title: variation.title,
                              difficulty: variation.difficulty,
                            });
                          }
                        }
                      }}
                      className="w-full text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="main">
                        📝 {problem.title} (Original)
                      </option>
                      {desc.variations.map((v) => (
                        <option key={v.id} value={v.id}>
                          🔀 {v.title} ({v.difficulty}){v.status === "solved" ? " ✓" : v.status === "attempted" ? " ◐" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title + difficulty for current target */}
                {currentDescription && (
                  <>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {currentDescription.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                            currentDescription.difficulty === "easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : currentDescription.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {currentDescription.difficulty}
                        </span>
                        {practiceTarget.type === "variation" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            Variation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Problem statement */}
                    <CollapsibleSection title="Description" defaultOpen={true}>
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                        <MarkdownRenderer>{currentDescription.description}</MarkdownRenderer>
                      </div>
                    </CollapsibleSection>

                    {/* Constraints */}
                    {currentDescription.constraints.length > 0 && (
                      <CollapsibleSection title="Constraints" count={currentDescription.constraints.length} defaultOpen={true}>
                        <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                          {currentDescription.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </CollapsibleSection>
                    )}

                    {/* Examples */}
                    {currentDescription.examples.length > 0 && (
                      <CollapsibleSection title="Examples" count={currentDescription.examples.length} defaultOpen={true}>
                        <div className="space-y-3">
                          {currentDescription.examples.map((ex, i) => (
                            <div
                              key={i}
                              className="rounded border border-zinc-200 dark:border-zinc-700 p-3 space-y-1"
                            >
                              <div className="text-xs">
                                <span className="text-zinc-500">Input: </span>
                                <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                                  {ex.input}
                                </code>
                              </div>
                              <div className="text-xs">
                                <span className="text-zinc-500">Output: </span>
                                <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                                  {ex.expectedOutput}
                                </code>
                              </div>
                              {ex.explanation && (
                                <p className="text-xs text-zinc-400">
                                  {ex.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}

                    {/* Expected complexity */}
                    {(currentDescription.timeComplexity || currentDescription.spaceComplexity) && (
                      <div className="flex gap-3 text-xs text-zinc-500">
                        {currentDescription.timeComplexity && (
                          <span>
                            Time: <code className="font-mono">{currentDescription.timeComplexity}</code>
                          </span>
                        )}
                        {currentDescription.spaceComplexity && (
                          <span>
                            Space: <code className="font-mono">{currentDescription.spaceComplexity}</code>
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  Generate a description first to see the problem statement here.
                </p>
                <button
                  onClick={handleGenerateDescription}
                  disabled={generating}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {generating ? "Generating..." : "Generate Description"}
                </button>
                {genError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {genError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Code editor + run + results */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <CodeEditor
            value={code}
            onChange={setCode}
            language="typescript"
            boilerplate={currentDescription?.boilerplate || "// Write your solution\n"}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
          <button
            onClick={handleRunCode}
            disabled={isExecuting || !desc}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? "Running..." : "▶ Run"}
          </button>

          {/* Hint button */}
          <button
            onClick={handleGetHint}
            disabled={isGettingHint || !desc || !code.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGettingHint ? "Thinking..." : "💡 Hint"}
          </button>

          {/* Note, Variation, Evaluate — only shown after all tests pass */}
          {allTestsPassed && (
            <>
              <button
                onClick={handleGenerateNote}
                disabled={isGenNote || !code.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50 transition-colors"
              >
                {isGenNote ? "Generating..." : "✨ Note"}
              </button>

              <button
                onClick={() => handleGenerateVariation()}
                disabled={variationLoading || !desc || (desc?.variations?.length ?? 0) >= 3}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                title={(desc?.variations?.length ?? 0) >= 3 ? "Max 3 variations reached" : undefined}
              >
                {variationLoading ? "Creating..." : "🔀 Variation"}
              </button>

              <button
                onClick={handleEvaluateSolution}
                disabled={isEvaluating || !desc || !code.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEvaluating ? "Evaluating..." : "🧠 Evaluate"}
              </button>
            </>
          )}
        </div>

        {/* Console + Test Results */}
        <div className="shrink-0 max-h-[40%] overflow-y-auto">
          <CollapsibleSection
            title="Test Results"
            defaultOpen={true}
            count={executionResult?.testResults?.length}
          >
            {executionResult && !executionResult.error && executionResult.testResults.length > 0 && (
              <div className="mb-3">
                <ConfidenceIndicator testResults={executionResult.testResults} />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConsolePanel
                result={executionResult}
                isExecuting={isExecuting}
              />
              <TestCasePanel
                results={executionResult?.testResults ?? []}
                isExecuting={isExecuting}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Evaluation Results */}
        {evaluation && (
          <div className="shrink-0 max-h-[45%] overflow-y-auto">
            <CollapsibleSection title="Solution Evaluation" defaultOpen={true}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-2xl font-bold ${
                        evaluation.overallScore >= 80
                          ? "text-green-600 dark:text-green-400"
                          : evaluation.overallScore >= 60
                            ? "text-yellow-600 dark:text-yellow-400"
                            : evaluation.overallScore >= 40
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {evaluation.overallScore}/100
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {evaluation.feedback}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 text-xs">
                  <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Time: <code className="font-mono">{evaluation.complexity.time}</code>
                  </span>
                  <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Space: <code className="font-mono">{evaluation.complexity.space}</code>
                  </span>
                </div>

                {evaluation.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      ✓ Strengths
                    </h4>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-green-500 shrink-0">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improvements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">
                      ↑ Improvements
                    </h4>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {evaluation.improvements.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-amber-500 shrink-0">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.edgeCases && evaluation.edgeCases.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">
                      Edge Cases
                    </h4>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {evaluation.edgeCases.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-blue-500 shrink-0">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.alternativeApproaches && evaluation.alternativeApproaches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-1">
                      Alternative Approaches
                    </h4>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {evaluation.alternativeApproaches.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-indigo-500 shrink-0">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* Save solution prompt — shown when score < 90 */}
        {pendingSolution && (
          <div className="px-4 pb-3 shrink-0">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💾</span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Save this solution? <span className="text-zinc-500 dark:text-zinc-400">(Score: {pendingSolution.score}/100)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onConfirmSaveSolution}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={onDismissPendingSolution}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hint panel */}
        {(isGettingHint || hint) && (
          <div className="px-4 pb-4 shrink-0">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>{isGettingHint ? "Interviewer is thinking..." : "Interviewer Hint"}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {isGettingHint && (
                    <button
                      onClick={handleCancelHint}
                      className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  {!isGettingHint && hint && (
                    <button
                      onClick={handleDismissHint}
                      className="px-2 py-1 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <MarkdownRenderer>{isGettingHint ? hintStreamContent : (hint || "")}</MarkdownRenderer>
              </div>
            </div>
          </div>
        )}

        {/* AI-generated note preview */}
        {isGenNote && noteGenContent && (
          <div className="px-4 pb-4 shrink-0">
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Generating note from your solution...
                </p>
                <button
                  onClick={handleCancelNote}
                  className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <MarkdownRenderer>{noteGenContent}</MarkdownRenderer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
