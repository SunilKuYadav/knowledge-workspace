"use client";

import { useState, useCallback } from "react";
import { ARTIFACT_LABELS } from "@/types";
import type { ArtifactType } from "@/types";

export function useTopicTabs(initialArtifacts: Record<string, string>) {
  // Local state so newly generated artifacts appear without a page reload
  const [artifacts, setArtifacts] =
    useState<Record<string, string>>(initialArtifacts);
  const [activeTab, setActiveTab] = useState<string>(
    () => Object.keys(initialArtifacts)[0] ?? "",
  );

  /** Called by GenerateArtifactButton when generation completes. */
  const handleGenerated = useCallback((artifact: string, content: string) => {
    setArtifacts((prev) => ({ ...prev, [artifact]: content }));
    setActiveTab(artifact);
  }, []);

  /**
   * Resolve a human-readable label for an artifact.
   * Falls back to title-casing the key for unknown artifact names.
   */
  function getLabel(key: string): string {
    if (key in ARTIFACT_LABELS) {
      return ARTIFACT_LABELS[key as ArtifactType];
    }
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ");
  }

  return {
    artifacts,
    activeTab,
    setActiveTab,
    handleGenerated,
    getLabel,
    artifactKeys: Object.keys(artifacts),
  };
}
