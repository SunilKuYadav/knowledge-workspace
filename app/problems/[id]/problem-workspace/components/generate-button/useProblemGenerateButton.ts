"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Problem, ProblemDescription } from "@/types";
import { saveProblemNotes } from "@/app/problems/[id]/actions";
import type {
  ProblemSection,
  GenerationState,
  BatchProgress,
} from "./types";
import { PROBLEM_SECTION_ORDER } from "./types";

export function useProblemGenerateButton(
  problem: Problem,
  hasDescription: boolean,
  hasNotes: boolean,
  hasSolution: boolean,
  onDescriptionGenerated: (desc: ProblemDescription) => void,
  onNotesGenerated: (notes: string) => void,
  solutionCode?: string,
) {
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
  });
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null,
  );

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const batchCancelledRef = useRef(false);

  // Missing sections
  const missing: ProblemSection[] = PROBLEM_SECTION_ORDER.filter((s) => {
    if (s === "description") return !hasDescription;
    if (s === "notes") return !hasNotes;
    return false;
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Generate description via streaming SSE endpoint. */
  const generateDescription = useCallback(async (): Promise<string | null> => {
    setGeneration({ status: "generating", section: "description", content: "" });

    const controller = new AbortController();
    abortRef.current = controller;

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
        setGeneration({
          status: "error",
          section: "description",
          message: (err as { error?: string }).error ?? "Generation failed",
        });
        return null;
      }

      if (!res.body) {
        setGeneration({
          status: "error",
          section: "description",
          message: "No response stream",
        });
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
              accumulated += event.content;
              setGeneration({
                status: "generating",
                section: "description",
                content: accumulated,
              });
              panelRef.current?.scrollTo({
                top: panelRef.current.scrollHeight,
                behavior: "smooth",
              });
            } else if (event.type === "done") {
              setGeneration({
                status: "done",
                section: "description",
                content: accumulated,
              });
              onDescriptionGenerated(event.description);
              return accumulated;
            } else if (event.type === "error") {
              setGeneration({
                status: "error",
                section: "description",
                message: event.error,
              });
              return null;
            }
          } catch {
            // Skip malformed events
          }
        }
      }

      // If we got here without a "done" event, something went wrong
      if (accumulated) {
        setGeneration({
          status: "done",
          section: "description",
          content: accumulated,
        });
        return accumulated;
      }

      setGeneration({
        status: "error",
        section: "description",
        message: "Stream ended without completion",
      });
      return null;
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      setGeneration({
        status: "error",
        section: "description",
        message: err instanceof Error ? err.message : "Unknown error",
      });
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [problem, onDescriptionGenerated]);

  /** Generate notes via streaming text endpoint. */
  const generateNotes = useCallback(async (): Promise<string | null> => {
    setGeneration({ status: "generating", section: "notes", content: "" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const solutionPayload = solutionCode && solutionCode.trim()
        ? solutionCode
        : `// Problem: ${problem.title}\n// Difficulty: ${problem.difficulty}\n// Patterns: ${problem.patterns.join(", ")}`;

      const res = await fetch("/api/ai/problem/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution: solutionPayload,
          title: problem.title,
          patterns: problem.patterns,
          difficulty: problem.difficulty,
          semanticDescription: problem.semanticDescription,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGeneration({
          status: "error",
          section: "notes",
          message: (err as { error?: string }).error ?? "Generation failed",
        });
        return null;
      }

      if (!res.body) {
        setGeneration({
          status: "error",
          section: "notes",
          message: "No response stream",
        });
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setGeneration({
          status: "generating",
          section: "notes",
          content: accumulated,
        });
        panelRef.current?.scrollTo({
          top: panelRef.current.scrollHeight,
          behavior: "smooth",
        });
      }

      setGeneration({ status: "done", section: "notes", content: accumulated });
      onNotesGenerated(accumulated);
      // Persist notes to disk
      await saveProblemNotes(problem.id, accumulated);
      return accumulated;
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      setGeneration({
        status: "error",
        section: "notes",
        message: err instanceof Error ? err.message : "Unknown error",
      });
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [problem, solutionCode, onNotesGenerated]);

  /** Generate a single section. Returns content on success, null on failure. */
  const generateOne = useCallback(
    async (section: ProblemSection): Promise<string | null> => {
      if (section === "description") return generateDescription();
      if (section === "notes") return generateNotes();
      return null;
    },
    [generateDescription, generateNotes],
  );

  /** Generate a specific section (dropdown item click). */
  const generate = useCallback(
    async (section: ProblemSection) => {
      setOpen(false);
      setBatchProgress(null);
      await generateOne(section);
    },
    [generateOne],
  );

  /** Generate all missing sections sequentially. */
  const generateAll = useCallback(async () => {
    setOpen(false);
    batchCancelledRef.current = false;

    const toGenerate = [...missing];
    setBatchProgress({
      total: toGenerate.length,
      current: 0,
      completed: [],
      active: true,
    });

    for (let i = 0; i < toGenerate.length; i++) {
      if (batchCancelledRef.current) break;

      setBatchProgress((prev) => (prev ? { ...prev, current: i } : prev));

      const result = await generateOne(toGenerate[i]);

      if (batchCancelledRef.current) break;

      if (result === null) {
        setBatchProgress((prev) => (prev ? { ...prev, active: false } : prev));
        return;
      }

      setBatchProgress((prev) =>
        prev
          ? { ...prev, completed: [...prev.completed, toGenerate[i]] }
          : prev,
      );
    }

    setBatchProgress((prev) => (prev ? { ...prev, active: false } : prev));
  }, [missing, generateOne]);

  const cancel = useCallback(() => {
    batchCancelledRef.current = true;
    abortRef.current?.abort();
    setGeneration({ status: "idle" });
    setBatchProgress(null);
  }, []);

  const dismiss = useCallback(() => {
    setGeneration({ status: "idle" });
    setBatchProgress(null);
  }, []);

  return {
    open,
    setOpen,
    generation,
    batchProgress,
    menuRef,
    panelRef,
    missing,
    generate,
    generateAll,
    cancel,
    dismiss,
  };
}
