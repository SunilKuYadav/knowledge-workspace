"use server";

import { v4 as uuidv4 } from "uuid";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileRevisionRepository } from "@/src/filesystem/FileRevisionRepository";
import type { RevisionData, RevisionEntry } from "@/src/types/Revision";

/**
 * Server action to rate a revision item.
 * Creates a RevisionEntry and persists it via the FileRevisionRepository,
 * which computes the next review date using spaced repetition.
 */
export async function rateRevision(
  itemId: string,
  itemType: "topic" | "problem",
  confidence: 1 | 2 | 3 | 4 | 5,
): Promise<RevisionData> {
  const workspacePath = getWorkspacePath();
  const repository = new FileRevisionRepository(workspacePath);

  const entry: RevisionEntry = {
    id: uuidv4(),
    date: new Date().toISOString(),
    confidence,
  };

  const updatedData = await repository.updateRevision(itemId, itemType, entry);

  return updatedData;
}
