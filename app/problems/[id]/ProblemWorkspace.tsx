"use client";

import { useState, useCallback } from "react";
import type { Problem, ProblemDescription, RevisionData } from "@/types";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import {
  CodeEditor,
  ConsolePanel,
  TestCasePanel,
} from "@/app/coding-interview/components";
import { executeCode } from "@/app/coding-interview/services/executionService";
import { EXECUTION_TIMEOUT } from "@/app/coding-interview/lib/constants";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import { saveProblemSolution, saveProblemNotes } from "./actions";

type Tab = "overview" | "description" | "practice" | "solution" | "notes" | "variations";

interface ProblemWorkspaceProps {
  problem: Problem;
  description: ProblemDescription | null;
  initialNotes: string;
  initialSolution: string;
  revision: RevisionData;
}

export default function ProblemWorkspace({
  problem,
  description: initialDescription,
  initialNotes,
  initialSolution,
  revision,
}: ProblemWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [desc, setDesc] = useState<ProblemDescription | null>(
    initialDescription,
  );
  const [code, setCode] = useState(
    initialSolution || initialDescription?.boilerplate || "",
  );
  const [notes, setNotes] = useState(initialNotes);
  const [solution, setSolution] = useState(initialSolution);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [noteGenContent, setNoteGenContent] = useState("");
  const [isGenNote, setIsGenNote] = useState(false);
  const [variationLoading, setVariationLoading] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Generate description + test cases
  const handleGenerateDescription = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/problem/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          patterns: problem.patterns,
          companies: problem.companies,
          url: problem.url,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Generation failed",
        );
      }
      const { description } = await res.json();
      setDesc(description);
      if (description.boilerplate && !code.trim()) {
        setCode(description.boilerplate);
      }
      setActiveTab("description");
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : "Failed to generate",
      );
    } finally {
      setGenerating(false);
    }
  }, [problem, code]);

  // Save solution
  const handleSaveSolution = useCallback(async () => {
    setSaveStatus("saving");
    const result = await saveProblemSolution(problem.id, code);
    if (result.success) {
      setSolution(code);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
    }
  }, [problem.id, code]);

  // Save notes
  const handleSaveNotes = useCallback(async () => {
    setSaveStatus("saving");
    const result = await saveProblemNotes(problem.id, notes);
    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
    }
  }, [problem.id, notes]);

  // Generate note from solution
  const handleGenerateNote = useCallback(async () => {
    if (!code.trim()) return;
    setIsGenNote(true);
    setNoteGenContent("");
    try {
      const res = await fetch("/api/ai/problem/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution: code,
          title: problem.title,
          patterns: problem.patterns,
          difficulty: problem.difficulty,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Generation failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setNoteGenContent(accumulated);
      }
      // Append to notes
      const newNotes = notes
        ? `${notes}\n\n---\n\n${accumulated}`
        : accumulated;
      setNotes(newNotes);
      await saveProblemNotes(problem.id, newNotes);
    } catch {
      // Silent fail — user can see the partial content
    } finally {
      setIsGenNote(false);
    }
  }, [code, problem, notes]);

  // Generate variation
  const handleGenerateVariation = useCallback(async () => {
    if (!desc) return;
    setVariationLoading(true);
    try {
      const res = await fetch("/api/ai/problem/generate-variation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          title: problem.title,
          description: desc.description,
          difficulty: problem.difficulty,
          patterns: problem.patterns,
        }),
      });
      if (!res.ok) throw new Error("Variation generation failed");
      const { variation } = await res.json();
      setDesc((prev) =>
        prev
          ? {
              ...prev,
              variations: [...(prev.variations || []), variation],
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch {
      // User can retry
    } finally {
      setVariationLoading(false);
    }
  }, [desc, problem]);

  // Run code against test cases from description
  const handleRunCode = useCallback(async () => {
    if (!desc || isExecuting) return;
    setIsExecuting(true);
    try {
      // Combine examples + hidden test cases
      const testCases = [
        ...desc.examples.map((ex) => ({
          input: ex.input,
          expectedOutput: ex.expectedOutput,
        })),
        ...desc.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      ];
      const result = await executeCode({
        code,
        language: "typescript",
        testCases,
        timeout: EXECUTION_TIMEOUT,
      });
      setExecutionResult(result);
    } catch (err) {
      setExecutionResult({
        consoleOutput: "",
        testResults: [],
        executionTimeMs: 0,
        memoryUsageMb: 0,
        error: {
          type: "runtime",
          message:
            err instanceof Error ? err.message : "Execution failed",
        },
      });
    } finally {
      setIsExecuting(false);
    }
  }, [desc, code, isExecuting]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "description", label: "Description" },
    { key: "practice", label: "Practice" },
    { key: "solution", label: "Solution" },
    { key: "notes", label: "Notes" },
    { key: "variations", label: "Variations" },
  ];

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
            onClick={() => setActiveTab(tab.key)}
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
            {!desc ? (
              <div className="text-center py-12">
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                  No description generated yet.
                </p>
                <button
                  onClick={handleGenerateDescription}
                  disabled={generating}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating
                    ? "Generating..."
                    : "Generate Description & Test Cases"}
                </button>
                {genError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {genError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <MarkdownRenderer>{desc.description}</MarkdownRenderer>
                </div>

                {/* Constraints */}
                {desc.constraints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Constraints
                    </h3>
                    <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      {desc.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Examples */}
                {desc.examples.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Examples
                    </h3>
                    <div className="space-y-4">
                      {desc.examples.map((ex, i) => (
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
                {(desc.timeComplexity || desc.spaceComplexity) && (
                  <div className="flex gap-4 text-sm">
                    {desc.timeComplexity && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Time:{" "}
                        <code className="font-mono">
                          {desc.timeComplexity}
                        </code>
                      </span>
                    )}
                    {desc.spaceComplexity && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Space:{" "}
                        <code className="font-mono">
                          {desc.spaceComplexity}
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
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                      Generating note from your solution...
                    </p>
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
                <button
                  onClick={handleGenerateNote}
                  disabled={isGenNote || !code.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isGenNote ? "Generating..." : "✨ Generate Note from Code"}
                </button>
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
              <button
                onClick={handleGenerateVariation}
                disabled={variationLoading || !desc}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {variationLoading ? "Generating..." : "🔀 New Variation"}
              </button>
            </div>

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

/* ─── Overview Tab Component ─────────────────────────────── */

interface OverviewTabProps {
  problem: Problem;
  description: ProblemDescription | null;
  revision: RevisionData;
  hasSolution: boolean;
  hasNotes: boolean;
  variationCount: number;
}

function OverviewTab({
  problem,
  description,
  revision,
  hasSolution,
  hasNotes,
  variationCount,
}: OverviewTabProps) {
  const statusLabel = {
    "not-started": "Not Started",
    attempted: "Attempted",
    solved: "Solved",
  }[problem.status];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Progress summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Status"
          value={statusLabel}
          color={
            problem.status === "solved"
              ? "text-green-600 dark:text-green-400"
              : problem.status === "attempted"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500"
          }
        />
        <StatCard
          label="Confidence"
          value={`${revision.confidence}/5`}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Attempts"
          value={String(problem.attempts ?? 0)}
          color="text-zinc-700 dark:text-zinc-300"
        />
        <StatCard
          label="Last Solved"
          value={
            problem.lastSolved
              ? new Date(problem.lastSolved).toLocaleDateString()
              : "Never"
          }
          color="text-zinc-700 dark:text-zinc-300"
        />
      </div>

      {/* Problem metadata */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Problem Info
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Platform" value={problem.platform.toUpperCase()} />
          <InfoRow label="Difficulty" value={problem.difficulty} />
          <InfoRow
            label="Frequency"
            value={problem.frequency?.replace("-", " ") || "—"}
          />
          {(problem.timeComplexity || description?.timeComplexity) && (
            <InfoRow
              label="Time Complexity"
              value={problem.timeComplexity || description?.timeComplexity || "—"}
              mono
            />
          )}
          {(problem.spaceComplexity || description?.spaceComplexity) && (
            <InfoRow
              label="Space Complexity"
              value={problem.spaceComplexity || description?.spaceComplexity || "—"}
              mono
            />
          )}
          <InfoRow
            label="Revision Count"
            value={String(problem.revisionCount ?? 0)}
          />
        </div>

        {/* Patterns */}
        {problem.patterns.length > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Patterns
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {problem.patterns.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Companies */}
        {problem.companies.length > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Companies
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {problem.companies.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* URL */}
        {problem.url && (
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Link
            </span>
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-0.5 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              {problem.url}
            </a>
          </div>
        )}
      </section>

      {/* Content availability */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Content
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ContentBadge label="Description" ready={!!description} />
          <ContentBadge label="Solution" ready={hasSolution} />
          <ContentBadge label="Notes" ready={hasNotes} />
          <ContentBadge
            label="Variations"
            ready={variationCount > 0}
            count={variationCount}
          />
        </div>
      </section>

      {/* Revision history */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Revision History
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Last Reviewed
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {revision.lastReviewed
                ? new Date(revision.lastReviewed).toLocaleDateString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Next Review
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {new Date(revision.nextReview).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Confidence
            </p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {revision.confidence}/5
            </p>
          </div>
        </div>

        {/* Confidence trend */}
        {revision.history.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Confidence Trend
            </p>
            <div className="flex items-end gap-1 h-16 mb-4">
              {revision.history.map((entry) => {
                const height = (entry.confidence / 5) * 100;
                const barColor = {
                  1: "bg-red-400",
                  2: "bg-orange-400",
                  3: "bg-yellow-400",
                  4: "bg-lime-400",
                  5: "bg-green-400",
                }[entry.confidence];
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col items-center gap-0.5"
                    title={`${new Date(entry.date).toLocaleDateString()} — ${entry.confidence}/5`}
                  >
                    <div
                      className={`w-6 rounded-sm ${barColor}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-zinc-400">
                      {entry.confidence}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* History entries */}
            <ul className="space-y-2">
              {revision.history
                .slice()
                .reverse()
                .slice(0, 5)
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between text-sm border-l-2 border-zinc-200 dark:border-zinc-700 pl-3"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {new Date(entry.date).toLocaleDateString()}
                      {entry.notes && (
                        <span className="text-zinc-400 ml-2 text-xs">
                          — {entry.notes}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {entry.confidence}/5
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {revision.history.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
            No revision history yet. Complete a self-test to start tracking.
          </p>
        )}
      </section>

      {/* Timestamps */}
      <div className="flex gap-6 text-xs text-zinc-400 dark:text-zinc-500">
        <span>Created: {new Date(problem.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ─── Overview sub-components ────────────────────────────── */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <p
        className={`text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ContentBadge({
  label,
  ready,
  count,
}: {
  label: string;
  ready: boolean;
  count?: number;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        ready
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <span>{ready ? "✓" : "○"}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs font-medium">{count}</span>
      )}
    </div>
  );
}
