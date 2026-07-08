"use client";

import { useState, useCallback } from "react";

export function useAIGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (
      prompt: string,
      context: string,
      onChunk: (chunk: string) => void,
    ) => {
      setIsGenerating(true);
      try {
        const response = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, context }),
        });

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || "Failed to generate text",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          onChunk(text);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating };
}
