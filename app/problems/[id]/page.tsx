import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { ProblemService } from "@/src/services/ProblemService";
import RateConfidenceButton from "@/src/components/RateConfidenceButton";
import CodingInterviewButton from "@/src/components/CodingInterviewButton";
import AISidebar from "@/src/components/AISidebar";
import ProblemWorkspace from "./problem-workspace";

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspacePath = getWorkspacePath();
  const problemService = new ProblemService(
    new FileProblemRepository(workspacePath),
  );

  const problem = await problemService.getProblemById(id);
  if (!problem) notFound();

  const [notes, solution, revision, description] = await Promise.all([
    problemService.getNotes(id),
    problemService.getSolution(id),
    problemService.getRevision(id),
    problemService.getDescription(id),
  ]);

  const difficultyColor = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }[problem.difficulty];

  const platformLabel = {
    leetcode: "LeetCode",
    codeforces: "Codeforces",
    gfg: "GFG",
  }[problem.platform];

  const statusColor = {
    "not-started":
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    attempted:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    solved:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  }[problem.status];

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      {/* Compact header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/problems"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              ← Problems
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              {problem.favorite && (
                <span className="text-yellow-500 shrink-0">★</span>
              )}
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {problem.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                {platformLabel}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${difficultyColor}`}>
                {problem.difficulty}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
                {problem.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <RateConfidenceButton
              itemId={id}
              itemType="problem"
              currentConfidence={revision.confidence}
            />
            <CodingInterviewButton
              source="problem"
              id={id}
              title={problem.title}
              category={problem.patterns[0] || ""}
              tags={problem.patterns}
              difficulty={problem.difficulty}
            />
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open ↗
              </a>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {problem.patterns.map((p) => (
            <span
              key={p}
              className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            >
              {p}
            </span>
          ))}
          {problem.companies.map((c) => (
            <span
              key={c}
              className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {c}
            </span>
          ))}
        </div>
      </header>

      {/* Workspace + AI Sidebar (fills remaining space) */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0">
          <ProblemWorkspace
            problem={problem}
            description={description}
            initialNotes={notes}
            initialSolution={solution}
            revision={revision}
          />
        </div>

        {/* AI Sidebar — right panel */}
        <AISidebar context="problem" itemId={id} itemTitle={problem.title} />
      </div>
    </div>
  );
}
