"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ProblemDescription } from "@/types";
import type { GeneratedTestSuite } from "@/types";
import { executeCode } from "@/app/coding-interview/services/executionService";
import { EXECUTION_TIMEOUT } from "@/app/coding-interview/lib/constants";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import { saveProblemDraft, saveProblemNotes, updateProblemStatus, overwriteProblemSolution, saveProblemEvaluation, addStructuredSolution, updateStructuredSolution, getStructuredSolutions, updateVariationStatus, addVariationPracticeEntry, deleteGeneratedTestSuite } from "../actions";
import type { SolutionEntry } from "@/src/filesystem/FileProblemRepository";
import { rateRevision } from "@/app/revision/actions";
import type { Tab, ProblemWorkspaceProps, SolutionEvaluation, PracticeTarget } from "./types";
import { v4 as uuid } from "uuid";

/**
 * Parse a test case value string into its JavaScript equivalent.
 * Handles: "true" → true, "[0,1]" → [0,1], "123" → 123, "\"hello\"" → "hello"
 * Falls back to the raw string if JSON.parse fails.
 */
function parseTestCaseValue(value: string | unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  // Try JSON parse — handles booleans, numbers, arrays, objects, quoted strings
  try {
    return JSON.parse(trimmed);
  } catch {
    // Return as-is (a plain string like "hello")
    return trimmed;
  }
}

/**
 * Parse a test case input string into arguments for the solution function.
 * Handles multiple formats:
 * - Named params: "s = \"()\", k = 3" → ["()", 3]
 * - Single JSON value: "\"()\"" → ["()"]
 * - JSON array (already multiple args): "[1,2,3]" → [[1,2,3]]
 */
function parseTestCaseInput(value: string | unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  // Check for named parameter format: "varName = value, varName2 = value2"
  // Pattern: identifier = value (possibly comma-separated)
  const namedParamPattern = /^[a-zA-Z_]\w*\s*=/;
  if (namedParamPattern.test(trimmed)) {
    // Split by top-level commas that separate params (not inside brackets/quotes)
    const args = splitNamedParams(trimmed);
    if (args.length > 0) return args;
  }

  // Try parsing as a single JSON value
  try {
    const parsed = JSON.parse(trimmed);
    // If it's an array, wrap it so it's passed as a single argument
    // (the worker will spread the outer array as args)
    return [parsed];
  } catch {
    // Return as a single string argument wrapped in array
    return [trimmed];
  }
}

/**
 * Split "varName = value, varName2 = value2" into parsed values array.
 */
function splitNamedParams(input: string): unknown[] {
  const results: unknown[] = [];
  // Match each "name = value" segment
  const regex = /[a-zA-Z_]\w*\s*=\s*/g;
  const matches: number[] = [];
  let match;
  while ((match = regex.exec(input)) !== null) {
    matches.push(match.index + match[0].length);
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i];
    const end = i + 1 < matches.length
      ? findParamEnd(input, matches[i], matches[i + 1])
      : input.length;
    const rawValue = input.slice(start, end).trim().replace(/,\s*$/, "");
    results.push(parseTestCaseValue(rawValue));
  }

  return results;
}

/**
 * Find where a parameter value ends (before the next "name =" segment).
 * Handles nested brackets and quoted strings.
 */
function findParamEnd(input: string, start: number, nextParamStart: number): number {
  // Work backwards from the next param start to find the separating comma
  let pos = nextParamStart - 1;
  // Skip back past the "varName = " prefix of the next param
  while (pos > start && input[pos] !== ",") {
    pos--;
  }
  return pos > start ? pos : nextParamStart;
}

export function useProblemWorkspace({
  problem,
  description: initialDescription,
  initialNotes,
  initialSolution,
  initialDraft,
}: ProblemWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [desc, setDesc] = useState<ProblemDescription | null>(
    initialDescription,
  );
  // Prefer draft over solution for the editor — draft is the "work in progress"
  const [code, setCode] = useState(
    initialDraft || initialSolution || initialDescription?.boilerplate || "",
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

  // ─── Practice target: which problem/variation is being practiced ───────────
  const [practiceTarget, setPracticeTarget] = useState<PracticeTarget>({
    type: "main",
    title: problem.title,
    difficulty: problem.difficulty,
  });

  // Hint state
  const [hint, setHint] = useState<string | null>(null);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hintStreamContent, setHintStreamContent] = useState("");
  const hintAbortRef = useRef<AbortController | null>(null);

  // Evaluation state
  const [evaluation, setEvaluation] = useState<SolutionEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  // Pending solution — waiting for user to confirm save (score < 90)
  const [pendingSolution, setPendingSolution] = useState<SolutionEntry | null>(null);

  // Streaming state
  const [descStreamContent, setDescStreamContent] = useState("");
  const [variationStreamContent, setVariationStreamContent] = useState("");
  const descAbortRef = useRef<AbortController | null>(null);
  const noteAbortRef = useRef<AbortController | null>(null);
  const variationAbortRef = useRef<AbortController | null>(null);

  // ─── Auto-save draft on code change (debounced 3s) ────────────────────────
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDraftRef = useRef(initialDraft || initialSolution || "");

  useEffect(() => {
    // Skip if code hasn't changed from what was last saved
    if (code === lastSavedDraftRef.current) return;
    // Skip empty/boilerplate-only code
    if (!code.trim()) return;

    // Clear previous timer
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    // Save after 3 seconds of inactivity
    draftTimerRef.current = setTimeout(async () => {
      const result = await saveProblemDraft(problem.id, code);
      if (result.success) {
        lastSavedDraftRef.current = code;
      }
    }, 3000);

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [code, problem.id]);

  // ─── Switch practice target (main problem or a variation) ─────────────────
  const handleSwitchPracticeTarget = useCallback(
    (target: PracticeTarget) => {
      setPracticeTarget(target);
      // Reset execution state when switching
      setExecutionResult(null);
      setEvaluation(null);
      setHint(null);
      setHintStreamContent("");

      // Load boilerplate for the selected target
      if (target.type === "main") {
        setCode(initialDraft || initialSolution || desc?.boilerplate || "");
      } else if (target.variationId && desc?.variations) {
        const variation = desc.variations.find((v) => v.id === target.variationId);
        setCode(variation?.boilerplate || "// Write your solution\n");
      }
    },
    [desc, initialDraft, initialSolution],
  );

  // Cancel description generation
  const handleCancelDescription = useCallback(() => {
    if (descAbortRef.current) {
      descAbortRef.current.abort();
      descAbortRef.current = null;
    }
    setGenerating(false);
    setDescStreamContent("");
  }, []);

  // Cancel note generation
  const handleCancelNote = useCallback(() => {
    if (noteAbortRef.current) {
      noteAbortRef.current.abort();
      noteAbortRef.current = null;
    }
    setIsGenNote(false);
    setNoteGenContent("");
  }, []);

  // Cancel variation generation
  const handleCancelVariation = useCallback(() => {
    if (variationAbortRef.current) {
      variationAbortRef.current.abort();
      variationAbortRef.current = null;
    }
    setVariationLoading(false);
    setVariationStreamContent("");
  }, []);

  // Generate description + test cases (streaming)
  const handleGenerateDescription = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    setDescStreamContent("");

    const controller = new AbortController();
    descAbortRef.current = controller;

    try {
      const res = await fetch("/api/ai/problem/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stream": "true",
        },
        body: JSON.stringify({
          problemId: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          patterns: problem.patterns,
          companies: problem.companies,
          url: problem.url,
          semanticDescription: problem.semanticDescription,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Generation failed",
        );
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === "token") {
              setDescStreamContent((prev) => prev + event.content);
            } else if (event.type === "done") {
              setDesc(event.description);
              if (event.description.boilerplate && !code.trim()) {
                setCode(event.description.boilerplate);
              }
              setDescStreamContent("");
            } else if (event.type === "error") {
              setGenError(event.error);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setGenError(
          err instanceof Error ? err.message : "Failed to generate",
        );
      }
    } finally {
      setGenerating(false);
      descAbortRef.current = null;
    }
  }, [problem, code]);

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

    const controller = new AbortController();
    noteAbortRef.current = controller;

    try {
      const res = await fetch("/api/ai/problem/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution: code,
          title: problem.title,
          patterns: problem.patterns,
          difficulty: problem.difficulty,
          semanticDescription: problem.semanticDescription,
        }),
        signal: controller.signal,
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
      // Append to general notes
      const newNotes = notes
        ? `${notes}\n\n---\n\n${accumulated}`
        : accumulated;
      setNotes(newNotes);
      await saveProblemNotes(problem.id, newNotes);

      // Also attach note to the most recent solution that matches the current code
      const solutions = await getStructuredSolutions(problem.id);
      const matchingSolution = solutions
        .slice()
        .reverse()
        .find((s) => s.code === code);
      if (matchingSolution) {
        await updateStructuredSolution(problem.id, matchingSolution.id, {
          note: accumulated,
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Silent fail — user can see the partial content
      }
    } finally {
      setIsGenNote(false);
      noteAbortRef.current = null;
    }
  }, [code, problem, notes]);

  // Regenerate general notes by combining all solution notes into a comprehensive note
  const [isRegeneratingNotes, setIsRegeneratingNotes] = useState(false);

  const handleRegenerateNotes = useCallback(async () => {
    setIsRegeneratingNotes(true);

    try {
      const solutions = await getStructuredSolutions(problem.id);
      const solutionNotesText = solutions
        .filter((s) => s.note)
        .map((s, idx) => `### Solution #${idx + 1} (Score: ${s.score ?? "N/A"}/100)\n${s.note}`)
        .join("\n\n---\n\n");

      if (!solutionNotesText.trim()) {
        setIsRegeneratingNotes(false);
        return;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "custom",
          itemId: problem.id,
          context: "problem",
          prompt: `You are helping an engineer consolidate their study notes for a coding problem.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Patterns: ${problem.patterns.join(", ")}

Here are the individual notes from each solution attempt:

${solutionNotesText}

${notes.trim() ? `Current general notes:\n${notes}\n\n` : ""}Create a single comprehensive, well-organized study note that:
1. Consolidates all key learnings from each attempt
2. Highlights the progression and improvement across attempts
3. Captures the most important patterns, techniques, and edge cases
4. Removes redundancy while keeping all unique insights
5. Organizes into clear sections (Approach, Key Insights, Patterns, Edge Cases, Complexity, Mistakes to Avoid)

Write in clean Markdown. Be concise but thorough.`,
          isGeneral: false,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Regeneration failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setNotes(accumulated);
      }

      await saveProblemNotes(problem.id, accumulated);
    } catch {
      // Silent fail — user can see partial content
    } finally {
      setIsRegeneratingNotes(false);
    }
  }, [problem, notes, setNotes]);

  // Generate variation (streaming)
  const handleGenerateVariation = useCallback(async (upgradeVariationId?: string) => {
    if (!desc) return;
    setVariationLoading(true);
    setVariationStreamContent("");

    const controller = new AbortController();
    variationAbortRef.current = controller;

    try {
      const res = await fetch("/api/ai/problem/generate-variation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stream": "true",
        },
        body: JSON.stringify({
          problemId: problem.id,
          title: problem.title,
          description: desc.description,
          difficulty: problem.difficulty,
          patterns: problem.patterns,
          semanticDescription: problem.semanticDescription,
          upgradeVariationId: upgradeVariationId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Variation generation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === "token") {
              setVariationStreamContent((prev) => prev + event.content);
            } else if (event.type === "done") {
              setDesc((prev) => {
                if (!prev) return prev;
                let updatedVariations;
                if (event.upgradedId) {
                  // Replace the upgraded variation
                  updatedVariations = (prev.variations || []).map((v) =>
                    v.id === event.upgradedId ? event.variation : v,
                  );
                } else {
                  updatedVariations = [...(prev.variations || []), event.variation];
                }
                return {
                  ...prev,
                  variations: updatedVariations,
                  updatedAt: new Date().toISOString(),
                };
              });
              setVariationStreamContent("");
            } else if (event.type === "error") {
              // User can retry
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // User can retry
      }
    } finally {
      setVariationLoading(false);
      variationAbortRef.current = null;
    }
  }, [desc, problem]);

  // Run code against test cases from description (or variation)
  const handleRunCode = useCallback(async () => {
    if (!desc || isExecuting) return;
    setIsExecuting(true);
    try {
      // Get test cases based on practice target
      let examples: { input: string; expectedOutput: string }[] = [];
      let hiddenTestCases: { input: string; expectedOutput: string }[] = [];

      if (practiceTarget.type === "variation" && practiceTarget.variationId) {
        const variation = desc.variations?.find((v) => v.id === practiceTarget.variationId);
        if (variation) {
          examples = variation.samples?.map((s) => ({ input: s.input, expectedOutput: s.output })) || [];
          hiddenTestCases = variation.testCases;
        }
      } else {
        examples = desc.examples;
        hiddenTestCases = desc.testCases;
      }

      const testCases = [
        ...examples.map((ex) => ({
          input: parseTestCaseInput(ex.input),
          expectedOutput: parseTestCaseValue(ex.expectedOutput),
        })),
        ...hiddenTestCases.map((tc) => ({
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

      // Mark as attempted
      if (practiceTarget.type === "variation" && practiceTarget.variationId) {
        await updateVariationStatus(problem.id, practiceTarget.variationId, "attempted");
        await addVariationPracticeEntry(problem.id, practiceTarget.variationId, {
          id: uuid(),
          attemptedAt: new Date().toISOString(),
          note: "Ran code against test cases",
        });
      } else if (problem.status === "not-started") {
        await updateProblemStatus(problem.id, "attempted");
      }
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
  }, [desc, code, isExecuting, problem.id, problem.status, practiceTarget]);

  // Run code against a single test case by index
  const handleRunSingleTestCase = useCallback(async (testCaseIndex: number) => {
    if (!desc || isExecuting) return;
    setIsExecuting(true);
    try {
      let examples: { input: string; expectedOutput: string }[] = [];
      let hiddenTestCases: { input: string; expectedOutput: string }[] = [];

      if (practiceTarget.type === "variation" && practiceTarget.variationId) {
        const variation = desc.variations?.find((v) => v.id === practiceTarget.variationId);
        if (variation) {
          examples = variation.samples?.map((s) => ({ input: s.input, expectedOutput: s.output })) || [];
          hiddenTestCases = variation.testCases;
        }
      } else {
        examples = desc.examples;
        hiddenTestCases = desc.testCases;
      }

      const allRawCases = [...examples, ...hiddenTestCases];
      if (testCaseIndex < 0 || testCaseIndex >= allRawCases.length) return;

      const targetCase = allRawCases[testCaseIndex];
      const testCases = [{
        input: parseTestCaseInput(targetCase.input),
        expectedOutput: parseTestCaseValue(targetCase.expectedOutput),
      }];

      const result = await executeCode({
        code,
        language: "typescript",
        testCases,
        timeout: EXECUTION_TIMEOUT,
      });

      // Merge single result into the full results array
      setExecutionResult((prev) => {
        const totalCases = allRawCases.length;
        // Build base array: either copy previous results or create empty slots
        const baseResults = prev && prev.testResults.length === totalCases
          ? [...prev.testResults]
          : Array.from({ length: totalCases }, (_, i) =>
              prev?.testResults?.[i] ?? undefined
            );

        // Place the new result at the target index
        baseResults[testCaseIndex] = result.testResults[0];

        return {
          consoleOutput: result.consoleOutput,
          testResults: baseResults.map((r) =>
            r ?? { input: null, expectedOutput: null, actualOutput: undefined, passed: false, executionTimeMs: 0 }
          ) as ExecutionResult["testResults"],
          executionTimeMs: result.executionTimeMs,
          memoryUsageMb: result.memoryUsageMb,
        };
      });
    } catch {
      // Don't overwrite all results on single test case failure
    } finally {
      setIsExecuting(false);
    }
  }, [desc, code, isExecuting, practiceTarget]);

  // ─── Validate Test Cases ──────────────────────────────────────────────────
  const [validationResults, setValidationResults] = useState<{
    index: number;
    input: string;
    expectedOutput: string;
    isValid: boolean;
    correctedOutput?: string;
    reason?: string;
  }[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateTestCases = useCallback(async () => {
    if (!desc || isValidating) return;
    setIsValidating(true);
    setValidationResults(null);

    try {
      let title: string;
      let description: string;
      let constraints: string[];
      let inputFormat: string | undefined;
      let outputFormat: string | undefined;
      let boilerplate: string | undefined;
      let testCases: { input: string; expectedOutput: string }[];
      let variationId: string | undefined;

      if (practiceTarget.type === "variation" && practiceTarget.variationId) {
        const variation = desc.variations?.find((v) => v.id === practiceTarget.variationId);
        if (!variation) { setIsValidating(false); return; }
        title = variation.title;
        description = variation.description;
        constraints = variation.constraints || [];
        inputFormat = variation.inputFormat;
        outputFormat = variation.outputFormat;
        boilerplate = variation.boilerplate;
        variationId = variation.id;
        const samples = (variation.samples || []).map((s) => ({ input: s.input, expectedOutput: s.output }));
        testCases = [...samples, ...variation.testCases];
      } else {
        title = problem.title;
        description = desc.description;
        constraints = desc.constraints;
        inputFormat = desc.inputFormat;
        outputFormat = desc.outputFormat;
        boilerplate = desc.boilerplate;
        testCases = [...desc.examples, ...desc.testCases];
      }

      const res = await fetch("/api/ai/problem/validate-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          variationId,
          title,
          description,
          constraints,
          inputFormat,
          outputFormat,
          boilerplate,
          testCases,
        }),
      });

      if (!res.ok) throw new Error("Validation request failed");
      const data = await res.json();
      setValidationResults(data.results);
    } catch {
      // Validation failed silently
    } finally {
      setIsValidating(false);
    }
  }, [desc, problem, practiceTarget, isValidating]);

  const handleApplyTestCaseCorrections = useCallback(async () => {
    if (!validationResults || !desc) return;

    const corrections = validationResults
      .filter((r) => !r.isValid && r.correctedOutput)
      .map((r) => ({ index: r.index, correctedOutput: r.correctedOutput! }));

    if (corrections.length === 0) return;

    try {
      const variationId = practiceTarget.type === "variation" ? practiceTarget.variationId : undefined;
      const res = await fetch("/api/ai/problem/validate-test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          variationId,
          corrections,
        }),
      });

      if (!res.ok) throw new Error("Apply corrections failed");
      const data = await res.json();

      if (data.success && data.description) {
        setDesc(data.description);
      }
      setValidationResults(null);
    } catch {
      // Silent failure
    }
  }, [validationResults, desc, problem.id, practiceTarget]);

  // Get hint/suggestion when stuck — acts like an interviewer giving hints

  const handleGetHint = useCallback(async () => {
    if (!desc || isGettingHint) return;
    setIsGettingHint(true);
    setHintStreamContent("");
    setHint(null);

    const controller = new AbortController();
    hintAbortRef.current = controller;

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "custom",
          itemId: problem.id,
          context: "problem",
          prompt: `You are acting as a friendly technical interviewer. The candidate is working on this problem and seems stuck. Give them a helpful hint without giving away the full solution.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Patterns: ${problem.patterns.join(", ")}

Problem Description:
${desc.description.slice(0, 1500)}

Their current code:
\`\`\`typescript
${code}
\`\`\`

${executionResult?.testResults?.length
  ? `Test results: ${executionResult.testResults.filter((t) => t.passed).length}/${executionResult.testResults.length} passing`
  : "They haven't run tests yet."}

Give a progressive hint:
1. Start with a gentle nudge about the right direction/approach
2. Mention a key insight or data structure that would help
3. If their code has a specific bug, hint at where it might be without fixing it directly

Keep it conversational and encouraging like a real interviewer would. Use 2-4 short paragraphs max.`,
          isGeneral: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Failed to get hint");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setHintStreamContent(accumulated);
      }
      setHint(accumulated);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setHint("Unable to generate hint. Please try again.");
      }
    } finally {
      setIsGettingHint(false);
      hintAbortRef.current = null;
    }
  }, [desc, code, problem, isGettingHint, executionResult]);

  const handleCancelHint = useCallback(() => {
    if (hintAbortRef.current) {
      hintAbortRef.current.abort();
      hintAbortRef.current = null;
    }
    setIsGettingHint(false);
    setHintStreamContent("");
  }, []);

  const handleDismissHint = useCallback(() => {
    setHint(null);
    setHintStreamContent("");
  }, []);

  // Evaluate solution via AI — provides feedback, improvements, and updates confidence

  const handleEvaluateSolution = useCallback(async () => {
    if (!desc || !code.trim() || isEvaluating) return;
    setIsEvaluating(true);
    setEvaluation(null);

    try {
      // Get test cases based on practice target
      let examples: { input: string; expectedOutput: string }[] = [];
      let hiddenTestCases: { input: string; expectedOutput: string }[] = [];
      let evalDescription = desc.description;
      let evalConstraints = desc.constraints;
      let evalTitle = problem.title;
      let evalDifficulty = problem.difficulty;

      if (practiceTarget.type === "variation" && practiceTarget.variationId) {
        const variation = desc.variations?.find((v) => v.id === practiceTarget.variationId);
        if (variation) {
          examples = variation.samples?.map((s) => ({ input: s.input, expectedOutput: s.output })) || [];
          hiddenTestCases = variation.testCases;
          evalDescription = variation.description;
          evalConstraints = variation.constraints || [];
          evalTitle = variation.title;
          evalDifficulty = variation.difficulty;
        }
      } else {
        examples = desc.examples;
        hiddenTestCases = desc.testCases;
      }

      // First run the code to get test results if we haven't already
      let testResults = executionResult?.testResults ?? [];
      if (testResults.length === 0) {
        const testCases = [
          ...examples.map((ex) => ({
            input: parseTestCaseInput(ex.input),
            expectedOutput: parseTestCaseValue(ex.expectedOutput),
          })),
          ...hiddenTestCases.map((tc) => ({
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

      // Call AI evaluation endpoint
      const res = await fetch("/api/ai/problem/evaluate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          problemId: problem.id,
          title: evalTitle,
          description: evalDescription,
          difficulty: evalDifficulty,
          patterns: problem.patterns,
          constraints: evalConstraints,
          testResults: testResults.map((r) => ({
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput,
            passed: r.passed,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error("Evaluation failed");
      }

      const data = (await res.json()) as { evaluation: SolutionEvaluation };
      setEvaluation(data.evaluation);

      // Update confidence and status based on practice target
      if (data.evaluation.overallScore !== undefined) {
        const score = data.evaluation.overallScore;

        if (practiceTarget.type === "variation" && practiceTarget.variationId) {
          // Update variation status
          const newStatus = score >= 90 ? "solved" : "attempted";
          await updateVariationStatus(problem.id, practiceTarget.variationId, newStatus);
          await addVariationPracticeEntry(problem.id, practiceTarget.variationId, {
            id: uuid(),
            attemptedAt: new Date().toISOString(),
            score,
            note: `Evaluated: ${data.evaluation.feedback?.slice(0, 100) || ""}`,
          });
          // Update local desc state to reflect variation status change
          setDesc((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              variations: (prev.variations || []).map((v) =>
                v.id === practiceTarget.variationId
                  ? { ...v, status: newStatus, lastPracticedAt: new Date().toISOString() }
                  : v,
              ),
            };
          });
        } else {
          // Main problem — update confidence and status
          let confidence: 1 | 2 | 3 | 4 | 5;
          if (score <= 20) confidence = 1;
          else if (score <= 40) confidence = 2;
          else if (score <= 60) confidence = 3;
          else if (score <= 80) confidence = 4;
          else confidence = 5;
          await rateRevision(problem.id, "problem", confidence);

          if (score >= 90) {
            await updateProblemStatus(problem.id, "solved");
          }
        }
      }

      // Save evaluation alongside code
      await saveProblemEvaluation(problem.id, data.evaluation, code);

      // Auto-save solution only if score >= 90, otherwise ask user
      const entry: SolutionEntry = {
        id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code,
        savedAt: new Date().toISOString(),
        score: data.evaluation.overallScore,
        feedback: data.evaluation.feedback,
        complexity: data.evaluation.complexity,
        strengths: data.evaluation.strengths,
        improvements: data.evaluation.improvements,
        edgeCases: data.evaluation.edgeCases,
        alternativeApproaches: data.evaluation.alternativeApproaches,
        variationId: practiceTarget.type === "variation" ? practiceTarget.variationId : undefined,
        variationTitle: practiceTarget.type === "variation" ? practiceTarget.title : undefined,
      };

      if (data.evaluation.overallScore >= 90) {
        await addStructuredSolution(problem.id, entry);
        setSolution(code);
      } else {
        // Hold for user confirmation
        setPendingSolution(entry);
      }
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
  }, [desc, code, isEvaluating, executionResult, problem, practiceTarget]);

  // Confirm saving a pending solution (user chose to save despite score < 90)
  const handleConfirmSaveSolution = useCallback(async () => {
    if (!pendingSolution) return;
    await addStructuredSolution(problem.id, pendingSolution);
    setSolution(pendingSolution.code);
    setPendingSolution(null);
  }, [pendingSolution, problem.id]);

  // Dismiss pending solution (user chose not to save)
  const handleDismissPendingSolution = useCallback(() => {
    setPendingSolution(null);
  }, []);

  // Overwrite the full solution.md (for editing)
  const handleOverwriteSolution = useCallback(async (content: string) => {
    setSaveStatus("saving");
    const result = await overwriteProblemSolution(problem.id, content);
    if (result.success) {
      setSolution(content);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
    }
  }, [problem.id]);

  // ─── Test Suite: Generate, Run, Delete ────────────────────────────────────
  const [testSuite, setTestSuite] = useState<GeneratedTestSuite | null>(() => {
    const targetId = "main";
    return initialDescription?.generatedTestSuites?.find((s) => s.targetId === targetId) ?? null;
  });
  const [testSuiteGenerating, setTestSuiteGenerating] = useState(false);
  const [testSuiteStreamContent, setTestSuiteStreamContent] = useState("");
  const [testSuiteRunResults, setTestSuiteRunResults] = useState<import("@/app/coding-interview/lib/types").TestCaseResult[] | null>(null);
  const [testSuiteRunning, setTestSuiteRunning] = useState(false);
  const testSuiteAbortRef = useRef<AbortController | null>(null);

  // Update test suite when practice target changes
  useEffect(() => {
    const targetId = practiceTarget.type === "main" ? "main" : (practiceTarget.variationId || "main");
    const suite = desc?.generatedTestSuites?.find((s) => s.targetId === targetId) ?? null;
    setTestSuite(suite);
    setTestSuiteRunResults(null);
  }, [practiceTarget, desc]);

  const handleGenerateTestSuite = useCallback(async () => {
    if (!desc || testSuiteGenerating) return;
    setTestSuiteGenerating(true);
    setTestSuiteStreamContent("");
    setTestSuiteRunResults(null);

    const controller = new AbortController();
    testSuiteAbortRef.current = controller;

    const targetId = practiceTarget.type === "main" ? "main" : (practiceTarget.variationId || "main");

    // Build request body based on practice target
    let reqBody: Record<string, unknown>;
    if (practiceTarget.type === "variation" && practiceTarget.variationId) {
      const variation = desc.variations?.find((v) => v.id === practiceTarget.variationId);
      if (!variation) {
        setTestSuiteGenerating(false);
        return;
      }
      reqBody = {
        problemId: problem.id,
        targetId,
        title: variation.title,
        description: variation.description,
        difficulty: variation.difficulty,
        patterns: variation.tags || problem.patterns,
        constraints: variation.constraints || [],
        inputFormat: variation.inputFormat,
        outputFormat: variation.outputFormat,
        boilerplate: variation.boilerplate,
        existingTestCases: variation.testCases,
        semanticDescription: problem.semanticDescription,
      };
    } else {
      reqBody = {
        problemId: problem.id,
        targetId,
        title: problem.title,
        description: desc.description,
        difficulty: problem.difficulty,
        patterns: problem.patterns,
        constraints: desc.constraints,
        inputFormat: desc.inputFormat,
        outputFormat: desc.outputFormat,
        boilerplate: desc.boilerplate,
        existingTestCases: [...desc.examples, ...desc.testCases],
        semanticDescription: problem.semanticDescription,
      };
    }

    try {
      const res = await fetch("/api/ai/problem/generate-test-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stream": "true",
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Generation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === "token") {
              setTestSuiteStreamContent((prev) => prev + event.content);
            } else if (event.type === "done") {
              setTestSuite(event.testSuite);
              // Update desc state to include the new test suite
              setDesc((prev) => {
                if (!prev) return prev;
                const suites = prev.generatedTestSuites || [];
                const idx = suites.findIndex((s) => s.targetId === targetId);
                const updatedSuites = idx >= 0
                  ? suites.map((s, i) => (i === idx ? event.testSuite : s))
                  : [...suites, event.testSuite];
                return { ...prev, generatedTestSuites: updatedSuites };
              });
              setTestSuiteStreamContent("");
            } else if (event.type === "error") {
              // User can retry
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // User can retry
      }
    } finally {
      setTestSuiteGenerating(false);
      testSuiteAbortRef.current = null;
    }
  }, [desc, problem, practiceTarget, testSuiteGenerating]);

  const handleCancelTestSuite = useCallback(() => {
    if (testSuiteAbortRef.current) {
      testSuiteAbortRef.current.abort();
      testSuiteAbortRef.current = null;
    }
    setTestSuiteGenerating(false);
    setTestSuiteStreamContent("");
  }, []);

  const handleDeleteTestSuite = useCallback(async () => {
    const targetId = practiceTarget.type === "main" ? "main" : (practiceTarget.variationId || "main");
    await deleteGeneratedTestSuite(problem.id, targetId);
    setTestSuite(null);
    setTestSuiteRunResults(null);
    // Update desc state
    setDesc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        generatedTestSuites: (prev.generatedTestSuites || []).filter(
          (s) => s.targetId !== targetId,
        ),
      };
    });
  }, [problem.id, practiceTarget]);

  const handleRunTestSuite = useCallback(async () => {
    if (!testSuite || testSuiteRunning || !code.trim()) return;
    setTestSuiteRunning(true);
    setTestSuiteRunResults(null);

    try {
      // Flatten all test cases across categories
      const allTestCases = testSuite.categories.flatMap((cat) =>
        cat.testCases.map((tc) => ({
          input: parseTestCaseInput(tc.input),
          expectedOutput: parseTestCaseValue(tc.expectedOutput),
        })),
      );

      const result = await executeCode({
        code,
        language: "typescript",
        testCases: allTestCases,
        timeout: EXECUTION_TIMEOUT,
      });

      setTestSuiteRunResults(result.testResults);
    } catch {
      setTestSuiteRunResults(null);
    } finally {
      setTestSuiteRunning(false);
    }
  }, [testSuite, testSuiteRunning, code]);

  return {
    activeTab,
    setActiveTab,
    desc,
    setDesc,
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
    handleSaveNotes,
    handleGenerateNote,
    handleRegenerateNotes,
    isRegeneratingNotes,
    handleGenerateVariation,
    handleRunCode,
    handleRunSingleTestCase,
    handleValidateTestCases,
    handleApplyTestCaseCorrections,
    validationResults,
    isValidating,
    evaluation,
    isEvaluating,
    handleEvaluateSolution,
    handleOverwriteSolution,
    hint,
    isGettingHint,
    hintStreamContent,
    handleGetHint,
    handleCancelHint,
    handleDismissHint,
    practiceTarget,
    handleSwitchPracticeTarget,
    pendingSolution,
    handleConfirmSaveSolution,
    handleDismissPendingSolution,
    // Test Suite
    testSuite,
    testSuiteGenerating,
    testSuiteStreamContent,
    testSuiteRunResults,
    testSuiteRunning,
    handleGenerateTestSuite,
    handleCancelTestSuite,
    handleDeleteTestSuite,
    handleRunTestSuite,
  };
}
