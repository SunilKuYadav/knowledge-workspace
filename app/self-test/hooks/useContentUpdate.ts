"use client";

import { useCallback, useState } from "react";
import {
  loadTopicContentAction,
  updateTopicContentAction,
} from "../actions/content-actions";

/* ─── State Types ────────────────────────────────────────── */

export interface ContentUpdatePreview {
  originalContent: string;
  updatedContent: string;
  artifact: string;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useContentUpdate() {
  const [preview, setPreview] = useState<ContentUpdatePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request an AI-generated content update for a topic artifact.
   * Loads current content, sends to AI with feedback context, and sets preview.
   */
  const requestUpdate = useCallback(
    async (
      topicId: string,
      artifact: string,
      weaknesses: string[],
      gap: string
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setPreview(null);

      try {
        // Load current content
        const loadResult = await loadTopicContentAction(topicId, artifact);
        if (!loadResult.success || loadResult.content === undefined) {
          throw new Error(
            loadResult.error ?? "Failed to load current content"
          );
        }

        const originalContent = loadResult.content;

        // Call AI content-update API
        const response = await fetch("/api/ai/assessment/content-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: originalContent,
            artifact,
            weaknesses,
            gap,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Content update generation failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.updatedContent || typeof data.updatedContent !== "string") {
          throw new Error("AI did not return valid updated content");
        }

        setPreview({
          originalContent,
          updatedContent: data.updatedContent,
          artifact,
        });
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Content update generation failed";
        setError(message);
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Confirm and save the AI-generated content update.
   */
  const confirmUpdate = useCallback(
    async (topicId: string, artifact: string, content: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await updateTopicContentAction(topicId, artifact, content);
        if (!result.success) {
          throw new Error(result.error ?? "Failed to save content update");
        }

        setPreview(null);
        setIsLoading(false);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save content update";
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Discard the content update preview without saving.
   */
  const discardUpdate = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    isLoading,
    error,
    requestUpdate,
    confirmUpdate,
    discardUpdate,
  };
}
