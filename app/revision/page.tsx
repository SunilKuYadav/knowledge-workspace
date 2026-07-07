import { getWorkspacePath } from "@/src/lib/constants";
import { FileRevisionRepository } from "@/src/filesystem/FileRevisionRepository";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { categorizeRevisionItem, sortByPriority } from "@/src/revision/spaced";
import type { RevisionCategory } from "@/src/revision/spaced";
import type { RevisionData } from "@/src/types/Revision";
import RevisionClient from "./RevisionClient";

/**
 * Server component that fetches all revision data and passes it
 * to the RevisionClient for interactive review sessions and views.
 */
export default async function RevisionPage() {
  const workspacePath = getWorkspacePath();
  const revisionRepo = new FileRevisionRepository(workspacePath);
  const topicRepo = new FileTopicRepository(workspacePath);
  const problemRepo = new FileProblemRepository(workspacePath);

  // Get current date for categorization
  const currentDate = new Date().toISOString().split("T")[0];

  // Fetch all revision data (due items gives us overdue + due-today)
  // We need all items for schedule and history views, so collect them all
  const [topics, problems] = await Promise.all([
    topicRepo.getAll(),
    problemRepo.getAll(),
  ]);

  // Collect all revision data from topics and problems
  const allRevisionData: RevisionData[] = [];

  for (const topic of topics) {
    try {
      const revision = await topicRepo.getRevision(topic.id);
      if (revision) {
        allRevisionData.push(revision);
      }
    } catch {
      // Skip items without revision data
    }
  }

  for (const problem of problems) {
    try {
      const revision = await problemRepo.getRevision(problem.id);
      if (revision) {
        allRevisionData.push(revision);
      }
    } catch {
      // Skip items without revision data
    }
  }

  // Also get due items from the revision repository (catches items not in topic/problem lists)
  const dueFromRepo = await revisionRepo.getDueItems(currentDate);
  for (const item of dueFromRepo) {
    if (
      !allRevisionData.find(
        (r) => r.itemId === item.itemId && r.itemType === item.itemType,
      )
    ) {
      allRevisionData.push(item);
    }
  }

  // Sort all items by priority
  const sortedItems = sortByPriority(allRevisionData, currentDate);

  // Categorize each item
  const categorizedItems = sortedItems.map((item) => ({
    item,
    category: categorizeRevisionItem(
      item.nextReview,
      currentDate,
    ) as RevisionCategory,
  }));

  // Due items for the review session (overdue + due-today)
  const dueItems = categorizedItems.filter(
    (ci) => ci.category === "overdue" || ci.category === "due-today",
  );

  return (
    <RevisionClient categorizedItems={categorizedItems} dueItems={dueItems} />
  );
}
