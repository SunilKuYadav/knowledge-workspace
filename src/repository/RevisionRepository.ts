import type { RevisionData, RevisionEntry } from "@/types";

/**
 * Repository interface for revision scheduling operations.
 * Unlike Topic and Problem repositories, this does not extend
 * the generic Repository as it operates across item types.
 */
export interface RevisionRepository {
  getDueItems(currentDate: string): Promise<RevisionData[]>;
  getAllItems(): Promise<RevisionData[]>;
  updateRevision(
    itemId: string,
    itemType: "topic" | "problem",
    entry: RevisionEntry,
  ): Promise<RevisionData>;
  getHistory(itemId: string): Promise<RevisionEntry[]>;
}
