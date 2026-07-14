import type { Problem, RevisionData, ProblemDescription } from "@/types";
import type { Repository } from "./Repository";

/**
 * Repository interface for Problem entities.
 * Extends the generic Repository with problem-specific content,
 * description/test-case storage, and revision operations.
 */
export interface ProblemRepository extends Repository<Problem> {
  getNotes(id: string): Promise<string>;
  saveNotes(id: string, content: string): Promise<void>;
  getSolution(id: string): Promise<string>;
  saveSolution(id: string, content: string): Promise<void>;
  overwriteSolution(id: string, content: string): Promise<void>;
  getDraft(id: string): Promise<string>;
  saveDraft(id: string, content: string): Promise<void>;
  getRevision(id: string): Promise<RevisionData>;
  /** Reads description.json — returns null if not yet generated. */
  getDescription(id: string): Promise<ProblemDescription | null>;
  /** Writes description.json. */
  saveDescription(id: string, description: ProblemDescription): Promise<void>;
}
