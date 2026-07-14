/**
 * POST /api/duplicates/merge
 *
 * Executes a merge operation: updates the primary item with merged data,
 * then deletes the duplicate items.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import type { Topic } from "@/types";
import type { Problem } from "@/types";

interface MergeExecuteBody {
  type: "topic" | "problem";
  /** The ID to keep as the primary (merged result goes here) */
  primaryId: string;
  /** IDs of duplicates to delete after merge */
  duplicateIds: string[];
  /** The merged data to write to the primary item */
  mergedData: Partial<Topic> | Partial<Problem>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MergeExecuteBody;

    if (!body.type || !body.primaryId || !body.duplicateIds?.length || !body.mergedData) {
      return NextResponse.json(
        { error: "Missing required fields: type, primaryId, duplicateIds, mergedData" },
        { status: 400 },
      );
    }

    const workspacePath = getWorkspacePath();

    if (body.type === "topic") {
      const topicService = new TopicService(new FileTopicRepository(workspacePath));

      // Verify primary exists
      const primary = await topicService.getTopicById(body.primaryId);
      if (!primary) {
        return NextResponse.json(
          { error: `Primary topic not found: ${body.primaryId}` },
          { status: 404 },
        );
      }

      // Update primary with merged data (exclude id and createdAt from update)
      const updateData = { ...body.mergedData } as Record<string, unknown>;
      delete updateData.id;
      delete updateData.createdAt;
      await topicService.updateTopic(body.primaryId, {
        ...(updateData as Partial<Topic>),
        updatedAt: new Date().toISOString(),
      });

      // Delete duplicates
      for (const dupId of body.duplicateIds) {
        try {
          await topicService.deleteTopic(dupId);
        } catch {
          // Skip if already deleted
        }
      }

      return NextResponse.json({
        success: true,
        message: `Merged ${body.duplicateIds.length + 1} topics into "${primary.title}"`,
        primaryId: body.primaryId,
      });
    } else {
      const problemService = new ProblemService(new FileProblemRepository(workspacePath));

      // Verify primary exists
      const primary = await problemService.getProblemById(body.primaryId);
      if (!primary) {
        return NextResponse.json(
          { error: `Primary problem not found: ${body.primaryId}` },
          { status: 404 },
        );
      }

      // Update primary with merged data (exclude id and createdAt from update)
      const updateData = { ...body.mergedData } as Record<string, unknown>;
      delete updateData.id;
      delete updateData.createdAt;
      await problemService.updateProblem(body.primaryId, {
        ...(updateData as Partial<Problem>),
        updatedAt: new Date().toISOString(),
      });

      // Delete duplicates
      for (const dupId of body.duplicateIds) {
        try {
          await problemService.deleteProblem(dupId);
        } catch {
          // Skip if already deleted
        }
      }

      return NextResponse.json({
        success: true,
        message: `Merged ${body.duplicateIds.length + 1} problems into "${primary.title}"`,
        primaryId: body.primaryId,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
