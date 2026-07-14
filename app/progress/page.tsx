import Link from "next/link";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import ProgressPanel from "./ProgressPanel";

export default async function ProgressPage() {
  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));
  const problemService = new ProblemService(
    new FileProblemRepository(workspacePath),
  );

  const [topics, problems] = await Promise.all([
    topicService.getAllTopics(),
    problemService.getAllProblems(),
  ]);

  // Build coverage stats
  const completedTopics = topics.filter((t) => t.status === "completed").length;
  const inProgressTopics = topics.filter((t) => t.status === "in-progress").length;
  const avgConfidence =
    topics.length > 0
      ? topics.reduce((sum, t) => sum + t.confidence, 0) / topics.length
      : 0;
  const categoriesCovered = [...new Set(topics.map((t) => t.category))];
  const patternsCovered = [...new Set(problems.flatMap((p) => p.patterns))];

  const coverageStats = {
    totalTopics: topics.length,
    completedTopics,
    inProgressTopics,
    avgConfidence,
    totalProblems: problems.length,
    solvedProblems: problems.filter((p) => p.status === "solved").length,
    attemptedProblems: problems.filter((p) => p.status === "attempted").length,
    easyCount: problems.filter((p) => p.difficulty === "easy").length,
    mediumCount: problems.filter((p) => p.difficulty === "medium").length,
    hardCount: problems.filter((p) => p.difficulty === "hard").length,
    patternsCovered,
    categoriesCovered,
  };

  // Build summaries for AI context
  const topicsSummary = topics
    .map(
      (t) =>
        `- ${t.title} [${t.category}] — ${t.status}, confidence ${t.confidence}/5${t.difficulty ? `, ${t.difficulty}` : ""}`,
    )
    .join("\n");

  const problemsSummary = problems
    .map(
      (p) =>
        `- ${p.title} — ${p.status}, ${p.difficulty}, patterns: ${p.patterns.join(", ") || "none"}`,
    )
    .join("\n");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Learning Progress
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Track coverage, assess readiness, and plan your study path
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Dashboard
        </Link>
      </header>

      <ProgressPanel
        topics={topics}
        problems={problems}
        coverageStats={coverageStats}
        topicsSummary={topicsSummary}
        problemsSummary={problemsSummary}
      />
    </div>
  );
}
