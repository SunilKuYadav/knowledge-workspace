"use server";

import { v4 } from "uuid";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileAssessmentRepository } from "@/src/filesystem/FileAssessmentRepository";
import { FileRevisionRepository } from "@/src/filesystem/FileRevisionRepository";
import type {
  AssessmentRecord,
  AssessmentHistory,
  DifficultyLevel,
} from "@/app/self-test/lib/types";
import type { RevisionEntry } from "@/src/types/Revision";

/**
 * Creates a new in-progress assessment record and persists it.
 * Called when a user starts a new assessment session.
 */
export async function startAssessmentAction(
  topicId: string,
  category: string,
  slug: string,
  experienceLevel: 5 | 10 | 15,
  initialDifficulty: DifficultyLevel,
): Promise<{ success: boolean; record?: AssessmentRecord; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const repository = new FileAssessmentRepository(workspacePath);

    const record: AssessmentRecord = {
      id: v4(),
      topicId,
      status: "in-progress",
      startedAt: new Date().toISOString(),
      experienceLevel,
      phases: [],
      initialDifficulty,
    };

    await repository.saveRecord(topicId, category, slug, record);

    return { success: true, record };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start assessment",
    };
  }
}

/**
 * Updates an existing in-progress record with the latest phase data.
 * Called after each phase completion to checkpoint progress.
 */
export async function checkpointPhaseAction(
  topicId: string,
  category: string,
  slug: string,
  record: AssessmentRecord,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const repository = new FileAssessmentRepository(workspacePath);

    await repository.updateRecord(topicId, category, slug, record);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to checkpoint phase",
    };
  }
}

/**
 * Marks an assessment as completed and creates a RevisionEntry.
 * Called when the final evaluation phase is reached and feedback is generated.
 */
export async function completeAssessmentAction(
  topicId: string,
  category: string,
  slug: string,
  record: AssessmentRecord,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const assessmentRepo = new FileAssessmentRepository(workspacePath);
    const revisionRepo = new FileRevisionRepository(workspacePath);

    // Update record status to completed
    const completedRecord: AssessmentRecord = {
      ...record,
      status: "completed",
      completedAt: new Date().toISOString(),
    };

    await assessmentRepo.updateRecord(
      topicId,
      category,
      slug,
      completedRecord,
    );

    // Create RevisionEntry with confidence rounded to nearest integer (1-5)
    if (completedRecord.confidenceScore != null) {
      const roundedConfidence = Math.round(
        completedRecord.confidenceScore,
      ) as 1 | 2 | 3 | 4 | 5;
      // Clamp to 1-5
      const clampedConfidence = Math.max(1, Math.min(5, roundedConfidence)) as
        | 1
        | 2
        | 3
        | 4
        | 5;

      const entry: RevisionEntry = {
        id: v4(),
        date: new Date().toISOString(),
        confidence: clampedConfidence,
        notes: "assessment-session",
      };

      await revisionRepo.updateRevision(topicId, "topic", entry);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to complete assessment",
    };
  }
}

/**
 * Deletes a specific assessment record.
 */
export async function deleteRecordAction(
  topicId: string,
  category: string,
  slug: string,
  recordId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const repository = new FileAssessmentRepository(workspacePath);

    await repository.deleteRecord(topicId, category, slug, recordId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to delete record",
    };
  }
}

/**
 * Loads the full assessment history for a topic.
 */
export async function loadAssessmentHistoryAction(
  topicId: string,
  category: string,
  slug: string,
): Promise<{ success: boolean; history?: AssessmentHistory | null; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const repository = new FileAssessmentRepository(workspacePath);

    const history = await repository.getHistory(topicId, category, slug);

    return { success: true, history };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load assessment history",
    };
  }
}

/**
 * Returns the in-progress assessment record for a topic, or null if none exists.
 */
export async function getInProgressAction(
  topicId: string,
  category: string,
  slug: string,
): Promise<{ success: boolean; record?: AssessmentRecord | null; error?: string }> {
  try {
    const workspacePath = getWorkspacePath();
    const repository = new FileAssessmentRepository(workspacePath);

    const record = await repository.getInProgressRecord(
      topicId,
      category,
      slug,
    );

    return { success: true, record };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to get in-progress record",
    };
  }
}
