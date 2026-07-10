"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ARTIFACT_ORDER } from "@/types";
import type { ArtifactType, SemanticDescription } from "@/types";
import type { GenerationState, BatchProgress } from "./types";

export function useGenerateArtifactButton(
  existingArtifacts: string[],
  topicId: string,
  topicTitle: string,
  topicCategory: string,
  onGenerated: (artifact: string, content: string) => void,
  semanticDescription?: SemanticDescription,
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
  const streamRef = useRef<AbortController | null>(null);
  const batchCancelledRef = useRef(false);

  // Missing artifacts = full ordered list minus what already exists
  const missing = ARTIFACT_ORDER.filter(
    (a) => !existingArtifacts.includes(a),
  );

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

  /**
   * Generate a single artifact, streaming content to the panel.
   * Returns the accumulated content on success, or null on error/abort.
   */
  const generateOne = useCallback(
    async (artifact: ArtifactType): Promise<string | null> => {
      setGeneration({ status: "generating", artifact, content: "" });

      const controller = new AbortController();
      streamRef.current = controller;

      try {
        const response = await fetch("/api/ai/generate-artifact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            artifact,
            topic: topicTitle,
            category: topicCategory,
            semanticDescription,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          setGeneration({
            status: "error",
            artifact,
            message: (err as { error?: string }).error ?? "Generation failed",
          });
          return null;
        }

        if (!response.body) {
          setGeneration({
            status: "error",
            artifact,
            message: "No response stream",
          });
          return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setGeneration({
            status: "generating",
            artifact,
            content: accumulated,
          });

          // Auto-scroll the panel
          panelRef.current?.scrollTo({
            top: panelRef.current.scrollHeight,
            behavior: "smooth",
          });
        }

        setGeneration({ status: "done", artifact, content: accumulated });
        onGenerated(artifact, accumulated);
        return accumulated;
      } catch (err) {
        if ((err as Error).name === "AbortError") return null;
        setGeneration({
          status: "error",
          artifact,
          message: err instanceof Error ? err.message : "Unknown error",
        });
        return null;
      } finally {
        streamRef.current = null;
      }
    },
    [topicId, topicTitle, topicCategory, semanticDescription, onGenerated],
  );

  /** Generate a single artifact (dropdown item click). */
  const generate = useCallback(
    async (artifact: ArtifactType) => {
      setOpen(false);
      setBatchProgress(null);
      await generateOne(artifact);
    },
    [generateOne],
  );

  /** Generate all missing artifacts sequentially. */
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

      setBatchProgress((prev) =>
        prev ? { ...prev, current: i } : prev,
      );

      const result = await generateOne(toGenerate[i]);

      if (batchCancelledRef.current) break;

      if (result === null) {
        // Error or abort on this artifact — stop the batch
        setBatchProgress((prev) =>
          prev ? { ...prev, active: false } : prev,
        );
        return;
      }

      setBatchProgress((prev) =>
        prev
          ? { ...prev, completed: [...prev.completed, toGenerate[i]] }
          : prev,
      );
    }

    // All done
    setBatchProgress((prev) =>
      prev ? { ...prev, active: false } : prev,
    );
  }, [missing, generateOne]);

  const cancel = useCallback(() => {
    batchCancelledRef.current = true;
    streamRef.current?.abort();
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
