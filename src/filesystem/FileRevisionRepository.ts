import path from "path";
import type { RevisionData, RevisionEntry } from "@/types";
import type { RevisionRepository } from "@/repository";
import { WORKSPACE_STRUCTURE } from "../lib/constants";
import { addRevisionEntry } from "../revision/history";
import { getDueItems as getDueItemsFromList } from "../revision/spaced";
import { readJsonFile, writeJsonFile, listDirectories } from "./workspace";

/**
 * File-system-backed implementation of RevisionRepository.
 * Scans revision.json files across notes/ and problems/ directories
 * to provide revision scheduling operations.
 */
export class FileRevisionRepository implements RevisionRepository {
  private notesPath: string;
  private problemsPath: string;

  constructor(workspacePath: string) {
    this.notesPath = path.join(workspacePath, "notes");
    this.problemsPath = path.join(workspacePath, "problems");
  }

  /**
   * Scans all revision.json files across notes and problems directories,
   * then filters to items that are overdue or due today.
   *
   * @param currentDate - ISO date string for the current date
   * @returns Items due for review (overdue + due today)
   */
  async getDueItems(currentDate: string): Promise<RevisionData[]> {
    const allItems = await this.collectAllRevisionData();
    return getDueItemsFromList(allItems, currentDate);
  }

  /**
   * Updates the revision data for a given item by adding a new entry.
   * Computes the next review date using the spaced repetition scheduler.
   * Creates a default RevisionData if none exists.
   *
   * @param itemId - The slug ID of the topic or problem
   * @param itemType - Whether this is a 'topic' or 'problem'
   * @param entry - The new revision entry to add
   * @returns The updated RevisionData
   */
  async updateRevision(
    itemId: string,
    itemType: "topic" | "problem",
    entry: RevisionEntry,
  ): Promise<RevisionData> {
    const revisionPath = await this.findRevisionPath(itemId, itemType);
    if (!revisionPath) {
      throw new Error(`Item not found: ${itemId} (type: ${itemType})`);
    }

    let currentData = await readJsonFile<RevisionData>(revisionPath);
    if (!currentData) {
      currentData = this.defaultRevisionData(itemId, itemType);
    }

    const updatedData = addRevisionEntry(currentData, entry);
    await writeJsonFile(revisionPath, updatedData);

    return updatedData;
  }

  /**
   * Returns the revision history for a given item.
   * Searches across both topics and problems.
   *
   * @param itemId - The slug ID of the topic or problem
   * @returns Array of revision entries, or empty array if not found
   */
  async getHistory(itemId: string): Promise<RevisionEntry[]> {
    // Search topics first
    const topicPath = await this.findRevisionPath(itemId, "topic");
    if (topicPath) {
      const data = await readJsonFile<RevisionData>(topicPath);
      return data?.history ?? [];
    }

    // Then search problems
    const problemPath = await this.findRevisionPath(itemId, "problem");
    if (problemPath) {
      const data = await readJsonFile<RevisionData>(problemPath);
      return data?.history ?? [];
    }

    return [];
  }

  /**
   * Collects all RevisionData from revision.json files across the workspace.
   */
  private async collectAllRevisionData(): Promise<RevisionData[]> {
    const items: RevisionData[] = [];

    // Scan notes/{category}/{slug}/revision.json
    for (const category of WORKSPACE_STRUCTURE.notes) {
      const categoryPath = path.join(this.notesPath, category);
      const slugDirs = await listDirectories(categoryPath);

      for (const slug of slugDirs) {
        const revisionPath = path.join(categoryPath, slug, "revision.json");
        const data = await readJsonFile<RevisionData>(revisionPath);
        if (data) {
          items.push(data);
        }
      }
    }

    // Scan problems/{slug}/revision.json
    const slugDirs = await listDirectories(this.problemsPath);

    for (const slug of slugDirs) {
      const revisionPath = path.join(this.problemsPath, slug, "revision.json");
      const data = await readJsonFile<RevisionData>(revisionPath);
      if (data) {
        items.push(data);
      }
    }

    return items;
  }

  /**
   * Locates the revision.json path for a given item.
   * For topics, searches notes/{category}/{itemId}/revision.json.
   * For problems, searches problems/{itemId}/revision.json.
   *
   * Returns the full path to the revision.json (which may not yet exist),
   * or null if the item folder itself does not exist.
   */
  private async findRevisionPath(
    itemId: string,
    itemType: "topic" | "problem",
  ): Promise<string | null> {
    if (itemType === "topic") {
      for (const category of WORKSPACE_STRUCTURE.notes) {
        const itemPath = path.join(this.notesPath, category, itemId);
        // Check if the topic folder exists by looking for topic.json
        const topicJson = await readJsonFile(path.join(itemPath, "topic.json"));
        if (topicJson) {
          return path.join(itemPath, "revision.json");
        }
      }
    } else {
      const itemPath = path.join(this.problemsPath, itemId);
      // Check if the problem folder exists by looking for problem.json
      const problemJson = await readJsonFile(
        path.join(itemPath, "problem.json"),
      );
      if (problemJson) {
        return path.join(itemPath, "revision.json");
      }
    }

    return null;
  }

  /**
   * Returns default RevisionData for an item that has no revision.json yet.
   */
  private defaultRevisionData(
    itemId: string,
    itemType: "topic" | "problem",
  ): RevisionData {
    return {
      itemId,
      itemType,
      lastReviewed: null,
      nextReview: new Date().toISOString().split("T")[0],
      confidence: 1,
      history: [],
    };
  }
}
