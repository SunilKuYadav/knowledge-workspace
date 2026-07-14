import type {
  AssessmentHistory,
  AssessmentRecord,
} from "@/app/self-test/lib/types";

/**
 * Repository interface for Assessment persistence.
 * Manages assessment history stored at notes/{category}/{slug}/assessment-history.json.
 */
export interface AssessmentRepository {
  getHistory(
    topicId: string,
    category: string,
    slug: string,
  ): Promise<AssessmentHistory | null>;

  saveRecord(
    topicId: string,
    category: string,
    slug: string,
    record: AssessmentRecord,
  ): Promise<void>;

  updateRecord(
    topicId: string,
    category: string,
    slug: string,
    record: AssessmentRecord,
  ): Promise<void>;

  deleteRecord(
    topicId: string,
    category: string,
    slug: string,
    recordId: string,
  ): Promise<void>;

  getInProgressRecord(
    topicId: string,
    category: string,
    slug: string,
  ): Promise<AssessmentRecord | null>;
}
