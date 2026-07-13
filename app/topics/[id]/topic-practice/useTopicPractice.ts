"use client";

import { useState, useCallback, useEffect } from "react";
import { executeCode } from "@/app/coding-interview/services/executionService";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import {
  loadPracticeSuggestions,
  saveSuggestions,
  createPracticeAsStandaloneProblem,
  unlinkPracticeProblem,
  savePracticeSolution,
} from "./actions";
import type {
  SuggestedProblem,
  LinkedPracticeProblem,
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
  /** Linked problems with description data, passed from the server component */
  linkedProblems: LinkedPracticeProblem[];
}

export function useTopicPractice({
  topicId,
  topicTitle,
  topicCategory,
  tags,
  difficulty,
  artifactContent,
  semanticDescription,
  linkedProblems: initialLinkedProblems,
}: UseTopicPracticeParams) {
  // ─── Linked Problems (from server) ──────────────────────────────────────────
  const [linkedProblems, setLinkedProblems] = useState<LinkedPracticeProblem[]>(initialLinkedProblems);

  // ─── Persisted Suggestions ──────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<SuggestedProblem[]>([]);
  const [isLoadingPersistedData, setIsLoadingPersistedData] = useState(true);

  // Load persisted suggestions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPracticeSuggestions(topicId);
        if (!cancelled && data && data.suggestions.length > 0) {
          // Mark suggestions that already have generated problems (by title match)
          const generatedTitles = new Set(linkedProblems.map((p) => p.title.toLowerCase()));
          const marked = (data.suggestions as SuggestedProblem[]).map((s) => ({
            ...s,
            generated: s.generated || generatedTitles.has(s.title.toLowerCase()),
          }));
          setSuggestions(marked);
        }
      } catch {
        // Ignore — will start fresh
      } finally {
        if (!cancelled) setIsLoadingPersistedData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topicId, linkedProblems]);

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
      const generatedTitles = new Set(linkedProblems.map((p) => p.title.toLowerCase()));
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
  }, [topicId, topicTitle, topicCategory, tags, difficulty, artifactContent, semanticDescription, isLoadingSuggestions, linkedProblems]);

  // ─── Problem Generation (creates standalone + links) ────────────────────────
  const [activeProblem, setActiveProblem] = useState<LinkedPracticeProblem | null>(null);
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

      const problemData = {
        title: data.problem.title as string,
        difficulty: data.problem.difficulty as "easy" | "medium" | "hard",
        description: data.problem.description as string,
        constraints: (data.problem.constraints || []) as string[],
        examples: (data.problem.examples || []) as { input: string; expectedOutput: string; explanation?: string }[],
        testCases: (data.problem.testCases || []) as { input: string; expectedOutput: string }[],
        boilerplate: (data.problem.boilerplate || "// Write your solution\n") as string,
        timeComplexity: data.problem.timeComplexity as string | undefined,
        spaceComplexity: data.problem.spaceComplexity as string | undefined,
        patterns: (data.problem.patterns || suggestion.patterns) as string[],
      };

      // Create as standalone problem and link to topic
      const result = await createPracticeAsStandaloneProblem(
        topicId,
        suggestion.id,
        problemData,
      );

      if (!result.success || !result.problemId) {
        throw new Error(result.error || "Failed to create problem");
      }

      // Build the linked practice problem for local state
      const newLinkedProblem: LinkedPracticeProblem = {
        id: result.problemId,
        title: problemData.title,
        difficulty: problemData.difficulty,
        patterns: problemData.patterns,
        status: "not-started",
        description: problemData.description,
        constraints: problemData.constraints,
        examples: problemData.examples,
        testCases: problemData.testCases,
        boilerplate: problemData.boilerplate,
        timeComplexity: problemData.timeComplexity,
        spaceComplexity: problemData.spaceComplexity,
      };

      // Update local state
      setLinkedProblems((prev) => [...prev, newLinkedProblem]);
      setActiveProblem(newLinkedProblem);
      setCode(problemData.boilerplate);
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

  // ─── Unlink Problem ─────────────────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUnlinkProblem = useCallback(async (problemId: string) => {
    setIsDeleting(true);
    try {
      // Find matching suggestion to un-mark
      const problem = linkedProblems.find((p) => p.id === problemId);
      const matchingSuggestion = problem
        ? suggestions.find((s) => s.title.toLowerCase() === problem.title.toLowerCase())
        : undefined;

      await unlinkPracticeProblem(topicId, problemId, matchingSuggestion?.id);

      // Update local state
      setLinkedProblems((prev) => prev.filter((p) => p.id !== problemId));
      if (matchingSuggestion) {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === matchingSuggestion.id ? { ...s, generated: false } : s)),
        );
      }

      // If we're unlinking the active problem, go back
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
  }, [topicId, activeProblem, linkedProblems, suggestions]);

  // ─── Open Linked Problem ────────────────────────────────────────────────────
  const openLinkedProblem = useCallback((problem: LinkedPracticeProblem) => {
    setActiveProblem(problem);
    setCode(problem.boilerplate);
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

      // Persist solution and update status on the standalone problem
      await savePracticeSolution(activeProblem.id, code, evalResult.overallScore);

      // Update local state with new status
      const newStatus = evalResult.overallScore >= 60 ? "solved" : "attempted";
      setLinkedProblems((prev) =>
        prev.map((p) =>
          p.id === activeProblem.id
            ? { ...p, status: newStatus as LinkedPracticeProblem["status"] }
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
  }, [activeProblem, code, isEvaluating, executionResult]);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleBackToSuggestions = useCallback(() => {
    setActiveProblem(null);
    setCode("");
    setEvaluation(null);
    setExecutionResult(null);
  }, []);

  return {
    // Linked problems
    linkedProblems,
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
    // Unlink
    isDeleting,
    handleUnlinkProblem,
    // Open linked
    openLinkedProblem,
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
