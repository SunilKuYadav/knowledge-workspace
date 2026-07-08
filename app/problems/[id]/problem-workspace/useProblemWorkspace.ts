"use client";

import { useState, useCallback, useRef } from "react";
import type { ProblemDescription } from "@/types";
import { executeCode } from "@/app/coding-interview/services/executionService";
import { EXECUTION_TIMEOUT } from "@/app/coding-interview/lib/constants";
import type { ExecutionResult } from "@/app/coding-interview/lib/types";
import { saveProblemSolution, saveProblemNotes } from "../actions";
import type { Tab, ProblemWorkspaceProps } from "./types";

export function useProblemWorkspace({
  problem,
  description: initialDescription,
  initialNotes,
  initialSolution,
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

  // Streaming state
  const [descStreamContent, setDescStreamContent] = useState("");
  const [variationStreamContent, setVariationStreamContent] = useState("");
  const descAbortRef = useRef<AbortController | null>(null);
  const noteAbortRef = useRef<AbortController | null>(null);
  const variationAbortRef = useRef<AbortController | null>(null);

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
      // Append to notes
      const newNotes = notes
        ? `${notes}\n\n---\n\n${accumulated}`
        : accumulated;
      setNotes(newNotes);
      await saveProblemNotes(problem.id, newNotes);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Silent fail — user can see the partial content
      }
    } finally {
      setIsGenNote(false);
      noteAbortRef.current = null;
    }
  }, [code, problem, notes]);

  // Generate variation (streaming)
  const handleGenerateVariation = useCallback(async () => {
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
              setDesc((prev) =>
                prev
                  ? {
                      ...prev,
                      variations: [...(prev.variations || []), event.variation],
                      updatedAt: new Date().toISOString(),
                    }
                  : prev,
              );
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

  return {
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
  };
}
