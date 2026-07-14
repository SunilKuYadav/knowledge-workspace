import path from "path";
import type { AssessmentRepository } from "@/repository";
import type {
  AssessmentHistory,
  AssessmentRecord,
} from "@/app/self-test/lib/types";
import { AssessmentHistorySchema } from "@/app/self-test/lib/types";
import { MAX_HISTORY_RECORDS } from "@/app/self-test/lib/constants";
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from "./workspace";

/**
 * Applies FIFO eviction to an assessments array.
 * If the array exceeds MAX_HISTORY_RECORDS, removes the oldest records
 * (sorted by startedAt ascending) until the limit is met.
 * Exported for direct testing of the eviction logic.
 */
export function applyFifoEviction(
  assessments: AssessmentRecord[],
): AssessmentRecord[] {
  if (assessments.length <= MAX_HISTORY_RECORDS) {
    return assessments;
  }

  // Sort by startedAt ascending (oldest first)
  const sorted = [...assessments].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  // Keep only the most recent MAX_HISTORY_RECORDS
  return sorted.slice(sorted.length - MAX_HISTORY_RECORDS);
}

/**
 * FileAssessmentRepository implements AssessmentRepository using the local filesystem.
 * Assessment history is stored at notes/{category}/{slug}/assessment-history.json.
 */
export class FileAssessmentRepository implements AssessmentRepository {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, "notes");
  }

  private getFilePath(category: string, slug: string): string {
    return path.join(this.basePath, category, slug, "assessment-history.json");
  }

  /**
   * Reads and validates assessment history from disk.
   * Returns null for missing files or invalid schemas.
   */
  async getHistory(
    topicId: string,
    category: string,
    slug: string,
  ): Promise<AssessmentHistory | null> {
    const filePath = this.getFilePath(category, slug);
    const data = await readJsonFile<unknown>(filePath);

    if (data === null) {
      return null;
    }

    // Validate against schema
    const result = AssessmentHistorySchema.safeParse(data);
    if (!result.success) {
      return null;
    }

    return result.data;
  }

  /**
   * Appends a new record to the history, applying FIFO eviction if > 50 records.
   */
  async saveRecord(
    topicId: string,
    category: string,
    slug: string,
    record: AssessmentRecord,
  ): Promise<void> {
    const filePath = this.getFilePath(category, slug);
    await ensureDirectoryExists(path.dirname(filePath));

    const existing = await this.getHistory(topicId, category, slug);
    const history: AssessmentHistory = existing ?? {
      topicId,
      assessments: [],
    };

    history.assessments.push(record);
    history.assessments = applyFifoEviction(history.assessments);

    await writeJsonFile(filePath, history);
  }

  /**
   * Updates an existing record in-place by matching on record ID.
   */
  async updateRecord(
    topicId: string,
    category: string,
    slug: string,
    record: AssessmentRecord,
  ): Promise<void> {
    const filePath = this.getFilePath(category, slug);
    const existing = await this.getHistory(topicId, category, slug);

    if (!existing) {
      // No history file — treat as a save
      await this.saveRecord(topicId, category, slug, record);
      return;
    }

    const index = existing.assessments.findIndex((r) => r.id === record.id);
    if (index === -1) {
      // Record not found — append it
      existing.assessments.push(record);
      existing.assessments = applyFifoEviction(existing.assessments);
    } else {
      existing.assessments[index] = record;
    }

    await writeJsonFile(filePath, existing);
  }

  /**
   * Removes a record by ID from the history.
   */
  async deleteRecord(
    topicId: string,
    category: string,
    slug: string,
    recordId: string,
  ): Promise<void> {
    const filePath = this.getFilePath(category, slug);
    const existing = await this.getHistory(topicId, category, slug);

    if (!existing) {
      return;
    }

    existing.assessments = existing.assessments.filter(
      (r) => r.id !== recordId,
    );

    await writeJsonFile(filePath, existing);
  }

  /**
   * Returns the first in-progress record for a given topic, or null.
   */
  async getInProgressRecord(
    topicId: string,
    category: string,
    slug: string,
  ): Promise<AssessmentRecord | null> {
    const history = await this.getHistory(topicId, category, slug);

    if (!history) {
      return null;
    }

    return (
      history.assessments.find((r) => r.status === "in-progress") ?? null
    );
  }
}
