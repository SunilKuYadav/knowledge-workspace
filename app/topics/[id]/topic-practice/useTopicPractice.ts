"use client";

import { useState, useCallback, useEffect } from "react";
import { executeCode } from "@/app/coding-interview/services/executionService";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import {
  loadPracticeProblems,
  saveSuggestions,
  savePracticeProblem,
  deletePracticeProblem,
  savePracticeSolution,
} from "./actions";
import type {
  SuggestedProblem,
  GeneratedPracticeProblem,
  PracticeEvaluation,
} from "./types";

interface UseTopicPracticeParams {
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  tags: string[];
  difficulty: string;
  artifactContent: string;
  semanticDescription?: Record<string, unknown>;
}

export function useTopicPractice({
  topicId,
  topicTitle,
  topicCategory,
  tags,
  difficulty,
  artifactContent,
  semanticDescription,
}: UseTopicPracticeParams) {
  // ─── Persisted Data ─────────────────────────────────────────────────────────
  const [savedProblems, setSavedProblems] = useState<GeneratedPracticeProblem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedProblem[]>([]);
  const [isLoadingPersistedData, setIsLoadingPersistedData] = useState(true);

  // Load persisted data (suggestions + problems) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPracticeProblems(topicId);
        if (!cancelled && data) {
          setSavedProblems(data.problems as GeneratedPracticeProblem[]);
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions as SuggestedProblem[]);
          }
        }
      } catch {
        // Ignore — will start fresh
      } finally {
        if (!cancelled) setIsLoadingPersistedData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topicId]);

  // ─── Suggestions (generate + persist) ───────────────────────────────────────
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const loadSuggestionsFromAI = useCallback(async () => {
    if (isLoadingSuggestions) return;
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const res = await fetch("/api/ai/topic/suggest-problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          topicTitle,
          category: topicCategory,
          tags,
          difficulty,
          artifactContent,
          semanticDescription,
        }),
      });

      if (!res.ok) throw new Error("Failed to load suggestions");

      const data = await res.json();
      const newSuggestions = (data.suggestions || []) as SuggestedProblem[];

      // Mark suggestions that already have generated problems
      const generatedTitles = new Set(savedProblems.map((p) => p.title.toLowerCase()));
      const marked = newSuggestions.map((s) => ({
        ...s,
        generated: generatedTitles.has(s.title.toLowerCase()),
      }));

      setSuggestions(marked);

      // Persist suggestions to disk
      await saveSuggestions(topicId, marked);
    } catch {
      setSuggestionsError("Failed to generate problem suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [topicId, topicTitle, topicCategory, tags, difficulty, artifactContent, semanticDescription, isLoadingSuggestions, savedProblems]);

  // ─── Problem Generation + Persistence ───────────────────────────────────────
  const [activeProblem, setActiveProblem] = useState<GeneratedPracticeProblem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateProblem = useCallback(async (suggestion: SuggestedProblem) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setSuggestionsError(null);

    try {
      const res = await fetch("/api/ai/topic/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          difficulty: suggestion.difficulty,
          description: suggestion.description,
          patterns: suggestion.patterns,
          topicTitle,
          topicCategory,
          artifactContent: artifactContent.slice(0, 4000),
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      const problemId = `tp-${topicId}-${Date.now()}`;
      const problem: GeneratedPracticeProblem = {
        id: problemId,
        suggestionId: suggestion.id,
        title: data.problem.title,
        difficulty: data.problem.difficulty,
        description: data.problem.description,
        constraints: data.problem.constraints || [],
        examples: data.problem.examples || [],
        testCases: data.problem.testCases || [],
        boilerplate: data.problem.boilerplate || "// Write your solution\n",
        timeComplexity: data.problem.timeComplexity,
        spaceComplexity: data.problem.spaceComplexity,
        patterns: data.problem.patterns || suggestion.patterns,
        createdAt: new Date().toISOString(),
      };

      // Persist to filesystem (also marks suggestion as generated)
      await savePracticeProblem(topicId, problem);

      // Update local state
      setSavedProblems((prev) => [...prev, problem]);
      setActiveProblem(problem);
      setCode(problem.boilerplate);
      setEvaluation(null);
      setExecutionResult(null);

      // Mark suggestion as generated locally
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, generated: true } : s)),
      );
    } catch {
      setSuggestionsError("Failed to generate problem. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, topicId, topicTitle, topicCategory, artifactContent]);

  // ─── Delete Problem ─────────────────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProblem = useCallback(async (problemId: string) => {
    setIsDeleting(true);
    try {
      await deletePracticeProblem(topicId, problemId);

      // Find which suggestion it came from and un-mark locally
      const removed = savedProblems.find((p) => p.id === problemId);
      setSavedProblems((prev) => prev.filter((p) => p.id !== problemId));
      if (removed) {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === removed.suggestionId ? { ...s, generated: false } : s)),
        );
      }

      // If we're deleting the active problem, go back
      if (activeProblem?.id === problemId) {
        setActiveProblem(null);
        setCode("");
        setEvaluation(null);
        setExecutionResult(null);
      }
    } catch {
      // Silent failure — user can retry
    } finally {
      setIsDeleting(false);
    }
  }, [topicId, activeProblem, savedProblems]);

  // ─── Open Saved Problem ─────────────────────────────────────────────────────
  const openSavedProblem = useCallback((problem: GeneratedPracticeProblem) => {
    setActiveProblem(problem);
    setCode(problem.savedSolution || problem.boilerplate);
    setEvaluation(null);
    setExecutionResult(null);
  }, []);

  // ─── Code + Execution ───────────────────────────────────────────────────────
  const [code, setCode] = useState("");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const EXECUTION_TIMEOUT = 10000;

  const parseTestCaseInput = (input: string): unknown[] => {
    try {
      const parsed = JSON.parse(`[${input}]`);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      try {
        const parsed = JSON.parse(input);
        return [parsed];
      } catch {
        return [input];
      }
    }
  };

  const parseTestCaseValue = (value: string): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const handleRunCode = useCallback(async () => {
    if (!activeProblem || !code.trim() || isExecuting) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const testCases = [
        ...activeProblem.examples.map((ex) => ({
          input: parseTestCaseInput(ex.input),
          expectedOutput: parseTestCaseValue(ex.expectedOutput),
        })),
        ...activeProblem.testCases.map((tc) => ({
          input: parseTestCaseInput(tc.input),
          expectedOutput: parseTestCaseValue(tc.expectedOutput),
        })),
      ];

      const result = await executeCode({
        code,
        language: "typescript",
        testCases,
        timeout: EXECUTION_TIMEOUT,
      });

      setExecutionResult(result);
    } catch {
      setExecutionResult(null);
    } finally {
      setIsExecuting(false);
    }
  }, [activeProblem, code, isExecuting]);

  // ─── Evaluation + Save ──────────────────────────────────────────────────────
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = useCallback(async () => {
    if (!activeProblem || !code.trim() || isEvaluating) return;
    setIsEvaluating(true);
    setEvaluation(null);

    try {
      // Run code first if no execution result
      let testResults = executionResult?.testResults ?? [];
      if (testResults.length === 0) {
        const testCases = [
          ...activeProblem.examples.map((ex) => ({
            input: parseTestCaseInput(ex.input),
            expectedOutput: parseTestCaseValue(ex.expectedOutput),
          })),
          ...activeProblem.testCases.map((tc) => ({
            input: parseTestCaseInput(tc.input),
            expectedOutput: parseTestCaseValue(tc.expectedOutput),
          })),
        ];

        const execResult = await executeCode({
          code,
          language: "typescript",
          testCases,
          timeout: EXECUTION_TIMEOUT,
        });
        setExecutionResult(execResult);
        testResults = execResult.testResults;
      }

      const res = await fetch("/api/ai/problem/evaluate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          problemId: activeProblem.id,
          title: activeProblem.title,
          description: activeProblem.description,
          difficulty: activeProblem.difficulty,
          patterns: activeProblem.patterns,
          constraints: activeProblem.constraints,
          testResults: testResults.map((r) => ({
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput,
            passed: r.passed,
          })),
        }),
      });

      if (!res.ok) throw new Error("Evaluation failed");

      const data = await res.json();
      const evalResult = data.evaluation as PracticeEvaluation;
      setEvaluation(evalResult);

      // Persist solution and score
      await savePracticeSolution(topicId, activeProblem.id, code, evalResult.overallScore);

      // Update local state with saved solution
      setSavedProblems((prev) =>
        prev.map((p) =>
          p.id === activeProblem.id
            ? { ...p, savedSolution: code, lastScore: evalResult.overallScore }
            : p,
        ),
      );
    } catch {
      setEvaluation({
        overallScore: 0,
        feedback: "Evaluation failed. Please try again.",
        strengths: [],
        improvements: ["Unable to evaluate at this time."],
        complexity: { time: "Unknown", space: "Unknown" },
      });
    } finally {
      setIsEvaluating(false);
    }
  }, [activeProblem, code, isEvaluating, executionResult, topicId]);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleBackToSuggestions = useCallback(() => {
    setActiveProblem(null);
    setCode("");
    setEvaluation(null);
    setExecutionResult(null);
  }, []);

  return {
    // Persisted data
    savedProblems,
    isLoadingPersistedData,
    // Suggestions
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    loadSuggestions: loadSuggestionsFromAI,
    // Problem generation
    activeProblem,
    isGenerating,
    generateProblem,
    // Delete
    isDeleting,
    handleDeleteProblem,
    // Open saved
    openSavedProblem,
    // Code + execution
    code,
    setCode,
    executionResult,
    isExecuting,
    handleRunCode,
    // Evaluation
    evaluation,
    isEvaluating,
    handleEvaluate,
    // Navigation
    handleBackToSuggestions,
  };
}
