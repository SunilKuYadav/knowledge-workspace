"use client";

import { useState } from "react";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import { CodeEditor, ConsolePanel } from "@/app/coding-interview/components";
import { useTopicPractice } from "./useTopicPractice";
import type { SuggestedProblem, GeneratedPracticeProblem, PracticeEvaluation } from "./types";
import type { SemanticDescription } from "@/types";

interface TopicPracticeProps {
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  tags: string[];
  difficulty: string;
  artifactContent: string;
  semanticDescription?: SemanticDescription;
}

export default function TopicPractice(props: TopicPracticeProps) {
  const {
    savedProblems,
    isLoadingPersistedData,
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    loadSuggestions,
    activeProblem,
    isGenerating,
    generateProblem,
    isDeleting,
    handleDeleteProblem,
    openSavedProblem,
    code,
    setCode,
    executionResult,
    isExecuting,
    handleRunCode,
    evaluation,
    isEvaluating,
    handleEvaluate,
    handleBackToSuggestions,
  } = useTopicPractice(props);

  // If practicing an active problem, show the practice view
  if (activeProblem) {
    return (
      <PracticeView
        problem={activeProblem}
        code={code}
        setCode={setCode}
        executionResult={executionResult}
        isExecuting={isExecuting}
        handleRunCode={handleRunCode}
        evaluation={evaluation}
        isEvaluating={isEvaluating}
        handleEvaluate={handleEvaluate}
        handleBack={handleBackToSuggestions}
        onDelete={() => handleDeleteProblem(activeProblem.id)}
        isDeleting={isDeleting}
      />
    );
  }

  // Loading state
  if (isLoadingPersistedData) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="w-6 h-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Main list view: saved problems + suggestions
  return (
    <div className="p-6 space-y-8">
      {/* Saved Problems Section */}
      {savedProblems.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Your Practice Problems
          </h3>
          <div className="grid gap-3">
            {savedProblems.map((problem) => (
              <SavedProblemCard
                key={problem.id}
                problem={problem}
                onOpen={openSavedProblem}
                onDelete={handleDeleteProblem}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        </section>
      )}

      {/* Suggestions Section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Suggested Problems
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              AI-suggested coding problems covering key concepts of{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{props.topicTitle}</span>.
              Select one to generate a full problem and start practicing.
            </p>
          </div>
          <button
            onClick={loadSuggestions}
            disabled={isLoadingSuggestions}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0"
          >
            {isLoadingSuggestions ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : suggestions.length > 0 ? "↻ Refresh" : "Generate Suggestions"}
          </button>
        </div>

        {suggestionsError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
            {suggestionsError}
          </div>
        )}

        {isLoadingSuggestions && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-8 h-8 animate-spin text-indigo-500 mb-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Analyzing topic content and generating practice suggestions...
            </p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="grid gap-3 mt-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onGenerate={generateProblem}
                isGenerating={isGenerating}
              />
            ))}
          </div>
        )}

        {!isLoadingSuggestions && suggestions.length === 0 && savedProblems.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              Click &quot;Generate Suggestions&quot; to get AI-recommended practice problems for this topic.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SavedProblemCard({
  problem,
  onOpen,
  onDelete,
  isDeleting,
}: {
  problem: GeneratedPracticeProblem;
  onOpen: (p: GeneratedPracticeProblem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const difficultyColor = {
    easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }[problem.difficulty];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {problem.title}
            </h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${difficultyColor}`}>
              {problem.difficulty}
            </span>
            {problem.lastScore !== undefined && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                problem.lastScore >= 80
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : problem.lastScore >= 60
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                Score: {problem.lastScore}/100
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {problem.patterns.map((p) => (
              <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpen(problem)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Practice →
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(problem.id); setConfirmDelete(false); }}
                disabled={isDeleting}
                className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete problem"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onGenerate,
  isGenerating,
}: {
  suggestion: SuggestedProblem;
  onGenerate: (s: SuggestedProblem) => void;
  isGenerating: boolean;
}) {
  const difficultyColor = {
    easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }[suggestion.difficulty];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {suggestion.title}
            </h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${difficultyColor}`}>
              {suggestion.difficulty}
            </span>
            {suggestion.generated && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                ✓ Generated
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
            {suggestion.description}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 italic mb-2">
            💡 {suggestion.rationale}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.patterns.map((p) => (
              <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {p}
              </span>
            ))}
            {suggestion.companies.map((c) => (
              <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {c}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onGenerate(suggestion)}
          disabled={isGenerating || suggestion.generated}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isGenerating ? "Generating..." : suggestion.generated ? "✓ Done" : "Generate →"}
        </button>
      </div>
    </div>
  );
}

function PracticeView({
  problem,
  code,
  setCode,
  executionResult,
  isExecuting,
  handleRunCode,
  evaluation,
  isEvaluating,
  handleEvaluate,
  handleBack,
  onDelete,
  isDeleting,
}: {
  problem: GeneratedPracticeProblem;
  code: string;
  setCode: (code: string) => void;
  executionResult: import("@/app/coding-interview/lib/types").ExecutionResult | null;
  isExecuting: boolean;
  handleRunCode: () => void;
  evaluation: PracticeEvaluation | null;
  isEvaluating: boolean;
  handleEvaluate: () => void;
  handleBack: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allTestsPassed =
    executionResult !== null &&
    !executionResult.error &&
    executionResult.testResults.length > 0 &&
    executionResult.testResults.every((t) => t.passed);

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Back
          </button>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {problem.title}
          </h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            problem.difficulty === "easy"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : problem.difficulty === "medium"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {problem.timeComplexity && (
            <span className="text-xs text-zinc-500">Time: <code className="font-mono">{problem.timeComplexity}</code></span>
          )}
          {problem.spaceComplexity && (
            <span className="text-xs text-zinc-500">Space: <code className="font-mono">{problem.spaceComplexity}</code></span>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} disabled={isDeleting}
                className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete problem"
              className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main content: description + code editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Problem description */}
        <div className="w-[380px] shrink-0 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto p-4 space-y-4">
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
            <MarkdownRenderer>{problem.description}</MarkdownRenderer>
          </div>

          {problem.constraints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-2">Constraints</h4>
              <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {problem.examples.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase mb-2">Examples</h4>
              <div className="space-y-3">
                {problem.examples.map((ex, i) => (
                  <div key={i} className="rounded border border-zinc-200 dark:border-zinc-700 p-3 space-y-1">
                    <div className="text-xs">
                      <span className="text-zinc-500">Input: </span>
                      <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">{ex.input}</code>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-500">Output: </span>
                      <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">{ex.expectedOutput}</code>
                    </div>
                    {ex.explanation && <p className="text-xs text-zinc-400 mt-1">{ex.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Code editor + results */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            <CodeEditor value={code} onChange={setCode} language="typescript" boilerplate={problem.boilerplate} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
            <button onClick={handleRunCode} disabled={isExecuting || !code.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isExecuting ? "Running..." : "▶ Run"}
            </button>
            {allTestsPassed && (
              <button onClick={handleEvaluate} disabled={isEvaluating || !code.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isEvaluating ? "Evaluating..." : "🧠 Evaluate & Save"}
              </button>
            )}
            {executionResult && !executionResult.error && executionResult.testResults.length > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {executionResult.testResults.filter((t) => t.passed).length}/{executionResult.testResults.length} tests passed
              </span>
            )}
          </div>

          {/* Console + Test Results */}
          {executionResult && (
            <div className="shrink-0 max-h-[35%] overflow-y-auto border-t border-zinc-200 dark:border-zinc-700 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <ConsolePanel result={executionResult} isExecuting={isExecuting} />
                </div>
                <div className="min-w-0 space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Test Results</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {executionResult.testResults.map((r, i) => (
                      <div key={i} className={`text-xs px-2 py-1.5 rounded border ${
                        r.passed
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                      }`}>
                        <span className={r.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                          {r.passed ? "✓" : "✗"} Test {i + 1}
                        </span>
                        {!r.passed && (
                          <div className="mt-1 text-zinc-500">
                            Expected: <code>{JSON.stringify(r.expectedOutput)}</code>
                            {" → Got: "}<code>{JSON.stringify(r.actualOutput)}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluation */}
          {evaluation && <EvaluationDisplay evaluation={evaluation} />}
        </div>
      </div>
    </div>
  );
}

function EvaluationDisplay({ evaluation }: { evaluation: PracticeEvaluation }) {
  return (
    <div className="shrink-0 max-h-[40%] overflow-y-auto border-t border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold ${
          evaluation.overallScore >= 80 ? "text-green-600 dark:text-green-400"
            : evaluation.overallScore >= 60 ? "text-yellow-600 dark:text-yellow-400"
              : evaluation.overallScore >= 40 ? "text-orange-600 dark:text-orange-400"
                : "text-red-600 dark:text-red-400"
        }`}>
          {evaluation.overallScore}/100
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{evaluation.feedback}</p>
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
          <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">✓ Strengths</h4>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-green-500 shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.improvements.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">↑ Improvements</h4>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            {evaluation.improvements.map((s, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-amber-500 shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.edgeCases && evaluation.edgeCases.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">Edge Cases</h4>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            {evaluation.edgeCases.map((s, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-blue-500 shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.alternativeApproaches && evaluation.alternativeApproaches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-1">Alternative Approaches</h4>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            {evaluation.alternativeApproaches.map((s, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-indigo-500 shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
