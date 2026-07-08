"use client";

import { useState, useTransition } from "react";
import { rateRevision } from "@/app/revision/actions";

export function useRateConfidenceButton(currentConfidence: number) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rated, setRated] = useState(false);
  const [newConfidence, setNewConfidence] = useState(currentConfidence);

  const handleRate = (confidence: 1 | 2 | 3 | 4 | 5, itemId: string, itemType: "topic" | "problem") => {
    startTransition(async () => {
      const result = await rateRevision(itemId, itemType, confidence);
      setNewConfidence(result.confidence);
      setRated(true);
      setTimeout(() => {
        setIsOpen(false);
        setRated(false);
      }, 1500);
    });
  };

  return {
    isOpen,
    setIsOpen,
    isPending,
    rated,
    newConfidence,
    handleRate,
  };
}
