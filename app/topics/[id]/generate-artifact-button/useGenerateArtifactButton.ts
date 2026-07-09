"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ARTIFACT_ORDER } from "@/types";
import type { ArtifactType, SemanticDescription } from "@/types";
import type { GenerationState } from "./types";

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

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<AbortController | null>(null);

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

  const generate = useCallback(
    async (artifact: ArtifactType) => {
      setOpen(false);
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
          return;
        }

        if (!response.body) {
          setGeneration({
            status: "error",
            artifact,
            message: "No response stream",
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setGeneration({ status: "generating", artifact, content: accumulated });

          // Auto-scroll the panel
          panelRef.current?.scrollTo({
            top: panelRef.current.scrollHeight,
            behavior: "smooth",
          });
        }

        setGeneration({ status: "done", artifact, content: accumulated });
        onGenerated(artifact, accumulated);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setGeneration({
          status: "error",
          artifact,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        streamRef.current = null;
      }
    },
    [topicId, topicTitle, topicCategory, semanticDescription, onGenerated],
  );

  const cancel = useCallback(() => {
    streamRef.current?.abort();
    setGeneration({ status: "idle" });
  }, []);

  const dismiss = useCallback(() => {
    setGeneration({ status: "idle" });
  }, []);

  return {
    open,
    setOpen,
    generation,
    menuRef,
    panelRef,
    missing,
    generate,
    cancel,
    dismiss,
  };
}
