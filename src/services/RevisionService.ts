import type { RevisionData, RevisionEntry } from "@/types";
import type { RevisionRepository } from "@/repository";

/**
 * Application service for Revision scheduling operations.
 * Delegates to a RevisionRepository instance, providing a decoupling
 * layer between UI and data access implementation.
 */
export class RevisionService {
  constructor(private readonly repository: RevisionRepository) {}

  /**
   * Returns all revision items across the workspace.
   */
  async getAllItems(): Promise<RevisionData[]> {
    return this.repository.getAllItems();
  }

  /**
   * Returns items due for review. Defaults currentDate to today's ISO date string.
   */
  async getDueItems(currentDate?: string): Promise<RevisionData[]> {
    const date = currentDate ?? new Date().toISOString().split("T")[0];
    return this.repository.getDueItems(date);
  }

  async updateRevision(
    itemId: string,
    itemType: "topic" | "problem",
    entry: RevisionEntry,
  ): Promise<RevisionData> {
    return this.repository.updateRevision(itemId, itemType, entry);
  }

  async getHistory(itemId: string): Promise<RevisionEntry[]> {
    return this.repository.getHistory(itemId);
  }

  /**
   * Returns the count of items currently due for review.
   */
  async getDueCount(): Promise<number> {
    const dueItems = await this.getDueItems();
    return dueItems.length;
  }
}
