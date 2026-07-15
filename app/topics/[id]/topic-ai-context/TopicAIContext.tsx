"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SemanticDescription } from "@/types";
import RegenerateContextButton from "../regenerate-context-button/RegenerateContextButton";

interface TopicAIContextProps {
  topicId: string;
  initialSemanticDescription?: SemanticDescription;
}

export default function TopicAIContext({
  topicId,
  initialSemanticDescription,
}: TopicAIContextProps) {
  const [semanticDescription, setSemanticDescription] = useState<
    SemanticDescription | undefined
  >(initialSemanticDescription);
  const router = useRouter();

  const handleRegenerated = useCallback(
    (newDescription: SemanticDescription) => {
      setSemanticDescription(newDescription);
      router.refresh();
    },
    [router],
  );

  const hasContext = !!(
    semanticDescription &&
    (semanticDescription.intent ||
      semanticDescription.targetLevel ||
      semanticDescription.focus?.length)
  );

  return (
    <div className="mt-4 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🎯</span>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            AI Context
          </span>
        </div>
        <RegenerateContextButton
          topicId={topicId}
          hasExistingContext={hasContext}
          onRegenerated={handleRegenerated}
        />
      </div>
      {hasContext ? (
        <>
          {semanticDescription!.intent && (
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              {semanticDescription!.intent}
            </p>
          )}
          {semanticDescription!.context && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {semanticDescription!.context}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {semanticDescription!.targetLevel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {semanticDescription!.targetLevel}
              </span>
            )}
            {semanticDescription!.focus?.map((f) => (
              <span
                key={f}
                className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {f}
              </span>
            ))}
          </div>
          {semanticDescription!.knownConcepts &&
            semanticDescription!.knownConcepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {semanticDescription!.knownConcepts.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
        </>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          No AI context yet. Click Generate to create one based on topic content.
        </p>
      )}
    </div>
  );
}
