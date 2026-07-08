"use client";

import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import {
  CodeEditor,
  ConsolePanel,
  TestCasePanel,
} from "@/app/coding-interview/components";
import { useProblemWorkspace } from "./useProblemWorkspace";
import { OverviewTab } from "./components/OverviewTab";
import { TABS } from "./constants";
import type { ProblemWorkspaceProps } from "./types";

export default function ProblemWorkspace(props: ProblemWorkspaceProps) {
  const { problem, revision } = props;

  const {
    activeTab,
    setActiveTab,
    desc,
    code,
    setCode,
    notes,
    setNotes,
    solution,
    generating,
    genError,
    saveStatus,
    noteGenContent,
    isGenNote,
    variationLoading,
    executionResult,
    isExecuting,
    descStreamContent,
    variationStreamContent,
    handleCancelDescription,
    handleCancelNote,
    handleCancelVariation,
    handleGenerateDescription,
    handleSaveSolution,
    handleSaveNotes,
    handleGenerateNote,
    handleGenerateVariation,
    handleRunCode,
  } = useProblemWorkspace(props);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex items-center border-b border-zinc-200 dark:border-zinc-700 px-4 shrink-0"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.key === "variations" &&
              desc?.variations &&
              desc.variations.length > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                  {desc.variations.length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <OverviewTab
            problem={problem}
            description={desc}
            revision={revision}
            hasSolution={!!solution}
            hasNotes={!!notes}
            variationCount={desc?.variations?.length || 0}
          />
        )}

        {/* Description Tab */}
        {activeTab === "description" && (
          <div className="p-6">
            {!desc && !generating ? (
              <div className="text-center py-12">
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                  No description generated yet.
                </p>
                <button
                  onClick={handleGenerateDescription}
                  disabled={generating}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate Description & Test Cases
                </button>
                {genError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {genError}
                  </p>
                )}
              </div>
            ) : generating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Generating description...
                    </span>
                  </div>
                  <button
                    onClick={handleCancelDescription}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {descStreamContent && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                      {descStreamContent}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <MarkdownRenderer>{desc!.description}</MarkdownRenderer>
                </div>

                {/* Constraints */}
                {desc!.constraints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Constraints
                    </h3>
                    <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      {desc!.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Examples */}
                {desc!.examples.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Examples
                    </h3>
                    <div className="space-y-4">
                      {desc!.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-2"
                        >
                          <div className="text-xs font-medium text-zinc-500">
                            Example {i + 1}
                          </div>
                          <div className="text-sm">
                            <span className="text-zinc-500">Input: </span>
                            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                              {ex.input}
                            </code>
                          </div>
                          <div className="text-sm">
                            <span className="text-zinc-500">Output: </span>
                            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                              {ex.expectedOutput}
                            </code>
                          </div>
                          {ex.explanation && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {ex.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complexity */}
                {(desc!.timeComplexity || desc!.spaceComplexity) && (
                  <div className="flex gap-4 text-sm">
                    {desc!.timeComplexity && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Time:{" "}
                        <code className="font-mono">
                          {desc!.timeComplexity}
                        </code>
                      </span>
                    )}
                    {desc!.spaceComplexity && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Space:{" "}
                        <code className="font-mono">
                          {desc!.spaceComplexity}
                        </code>
                      </span>
                    )}
                  </div>
                )}

                {/* Regenerate button */}
                <button
                  onClick={handleGenerateDescription}
                  disabled={generating}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                >
                  {generating ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Practice Tab — split view: problem on left, editor on right */}
        {activeTab === "practice" && (
          <div className="flex h-full min-h-0">
            {/* Left: Problem description / variation context */}
            <div className="w-[400px] shrink-0 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto">
              {desc ? (
                <div className="p-4 space-y-4">
                  {/* Title + difficulty */}
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {problem.title}
                    </h3>
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded ${
                        problem.difficulty === "easy"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : problem.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                  </div>

                  {/* Problem statement */}
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                    <MarkdownRenderer>{desc.description}</MarkdownRenderer>
                  </div>

                  {/* Constraints */}
                  {desc.constraints.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                        Constraints
                      </h4>
                      <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                        {desc.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Examples */}
                  {desc.examples.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                        Examples
                      </h4>
                      <div className="space-y-3">
                        {desc.examples.map((ex, i) => (
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
                    </div>
                  )}

                  {/* Expected complexity */}
                  {(desc.timeComplexity || desc.spaceComplexity) && (
                    <div className="flex gap-3 text-xs text-zinc-500">
                      {desc.timeComplexity && (
                        <span>
                          Time: <code className="font-mono">{desc.timeComplexity}</code>
                        </span>
                      )}
                      {desc.spaceComplexity && (
                        <span>
                          Space: <code className="font-mono">{desc.spaceComplexity}</code>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Variations quick-switch */}
                  {desc.variations && desc.variations.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
                      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                        Variations Available
                      </h4>
                      <div className="space-y-2">
                        {desc.variations.map((v) => (
                          <div
                            key={v.id}
                            className="rounded border border-zinc-200 dark:border-zinc-700 p-2"
                          >
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {v.title}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                              {v.description.slice(0, 120)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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

            {/* Right: Code editor + run + results */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 min-h-[200px] p-4">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language="typescript"
                  boilerplate={desc?.boilerplate || "// Write your solution\n"}
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

                <button
                  onClick={handleSaveSolution}
                  disabled={saveStatus === "saving"}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                      ? "✓ Saved"
                      : "Save as Solution"}
                </button>

                <button
                  onClick={handleGenerateNote}
                  disabled={isGenNote || !code.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50 transition-colors"
                >
                  {isGenNote ? "Generating..." : "✨ Note"}
                </button>

                <button
                  onClick={handleGenerateVariation}
                  disabled={variationLoading || !desc}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {variationLoading ? "Creating..." : "🔀 Variation"}
                </button>
              </div>

              {/* Console + Test Results */}
              <div className="shrink-0 max-h-[35%] overflow-y-auto border-t border-zinc-200 dark:border-zinc-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                  <ConsolePanel
                    result={executionResult}
                    isExecuting={isExecuting}
                  />
                  <TestCasePanel
                    results={executionResult?.testResults ?? []}
                    isExecuting={isExecuting}
                  />
                </div>
              </div>

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
        )}

        {/* Solution Tab */}
        {activeTab === "solution" && (
          <div className="p-6">
            {solution ? (
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <MarkdownRenderer>{solution}</MarkdownRenderer>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                  No solution saved yet.
                </p>
                <p className="text-sm text-zinc-400">
                  Go to the Practice tab, write your solution, then click
                  &quot;Save as Solution&quot;.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="p-6 space-y-4">
            {notes ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Your Notes
                  </h3>
                  <button
                    onClick={handleSaveNotes}
                    disabled={saveStatus === "saving"}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    {saveStatus === "saved" ? "✓ Saved" : "Save"}
                  </button>
                </div>
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <MarkdownRenderer>{notes}</MarkdownRenderer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                  No notes yet.
                </p>
                <p className="text-sm text-zinc-400 mb-4">
                  Solve the problem first, then generate a note from your
                  solution.
                </p>
                {isGenNote ? (
                  <button
                    onClick={handleCancelNote}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Cancel Generation
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateNote}
                    disabled={isGenNote || !code.trim()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    ✨ Generate Note from Code
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Variations Tab */}
        {activeTab === "variations" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Problem Variations
              </h3>
              {variationLoading ? (
                <button
                  onClick={handleCancelVariation}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={handleGenerateVariation}
                  disabled={variationLoading || !desc}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  🔀 New Variation
                </button>
              )}
            </div>

            {/* Streaming preview while generating */}
            {variationLoading && (
              <div className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    Generating variation...
                  </span>
                </div>
                {variationStreamContent && (
                  <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                      {variationStreamContent}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!desc && (
              <p className="text-sm text-zinc-400">
                Generate a description first to enable variations.
              </p>
            )}

            {desc?.variations && desc.variations.length > 0 ? (
              <div className="space-y-4">
                {desc.variations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {v.title}
                      </h4>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          v.difficulty === "easy"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : v.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {v.difficulty}
                      </span>
                    </div>

                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      <MarkdownRenderer>{v.description}</MarkdownRenderer>
                    </div>

                    {v.hint && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium">
                          Show Hint
                        </summary>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400 pl-4">
                          {v.hint}
                        </p>
                      </details>
                    )}

                    {v.testCases.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400 font-medium">
                          Test Cases ({v.testCases.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {v.testCases.map((tc, i) => (
                            <div key={i} className="font-mono text-xs">
                              <span className="text-zinc-500">
                                Input:
                              </span>{" "}
                              {tc.input} →{" "}
                              <span className="text-green-600 dark:text-green-400">
                                {tc.expectedOutput}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              desc && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                  No variations yet. Click &quot;New Variation&quot; to generate
                  one.
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
