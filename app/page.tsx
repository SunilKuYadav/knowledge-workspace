import Link from "next/link";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { FileRevisionRepository } from "@/src/filesystem/FileRevisionRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import { RevisionService } from "@/src/services/RevisionService";
import { sortByPriority } from "@/src/revision/spaced";
import type { RevisionData } from "@/src/types/Revision";
import CodingInterviewButton from "@/src/components/CodingInterviewButton";

export default async function Dashboard() {
  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));
  const problemService = new ProblemService(
    new FileProblemRepository(workspacePath),
  );
  const revisionService = new RevisionService(
    new FileRevisionRepository(workspacePath),
  );

  const [topics, problems, dueItems] = await Promise.all([
    topicService.getAllTopics(),
    problemService.getAllProblems(),
    revisionService.getDueItems(),
  ]);

  const currentDate = new Date().toISOString().split("T")[0];
  const sortedDueItems = sortByPriority(dueItems, currentDate);

  // Statistics: problems by difficulty
  const problemsByDifficulty = {
    easy: problems.filter((p) => p.difficulty === "easy").length,
    medium: problems.filter((p) => p.difficulty === "medium").length,
    hard: problems.filter((p) => p.difficulty === "hard").length,
  };

  // Statistics: topics by confidence
  const topicsByConfidence: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const topic of topics) {
    topicsByConfidence[topic.confidence] =
      (topicsByConfidence[topic.confidence] || 0) + 1;
  }

  // Study streak: count of items reviewed today (simplified)
  const today = new Date().toISOString().split("T")[0];
  const reviewedToday = dueItems.filter(
    (item) => item.lastReviewed && item.lastReviewed.split("T")[0] === today,
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Knowledge Workspace
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Your learning dashboard
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Create
        </Link>
      </header>

      {/* Summary Stats */}
      <section aria-label="Summary statistics" className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Topics" value={topics.length} href="/topics" />
          <StatCard
            label="Total Problems"
            value={problems.length}
            href="/problems"
          />
          <StatCard
            label="Due for Review"
            value={dueItems.length}
            href="/revision"
          />
          <StatCard label="Reviewed Today" value={reviewedToday} />
        </div>
      </section>

      {/* Items Due for Review */}
      <section aria-label="Items due for review" className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Due for Review
        </h2>
        {sortedDueItems.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            No items due for review today. Great job!
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedDueItems.map((item) => (
              <RevisionItem
                key={`${item.itemType}-${item.itemId}`}
                item={item}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Statistics */}
      <section aria-label="Statistics" className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Problems by Difficulty */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Problems by Difficulty
            </h3>
            <div className="space-y-2">
              <DifficultyRow
                label="Easy"
                count={problemsByDifficulty.easy}
                color="text-green-600"
              />
              <DifficultyRow
                label="Medium"
                count={problemsByDifficulty.medium}
                color="text-yellow-600"
              />
              <DifficultyRow
                label="Hard"
                count={problemsByDifficulty.hard}
                color="text-red-600"
              />
            </div>
          </div>

          {/* Topics by Confidence */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Topics by Confidence
            </h3>
            <div className="space-y-2">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <div key={level} className="flex justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Level {level}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {topicsByConfidence[level]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Study Streak */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Study Streak
            </h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {reviewedToday}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              items reviewed today
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section aria-label="Quick links" className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Browse
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Coding Interview */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Coding Interview
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Practice with AI-generated coding problems in a realistic
              interview setting.
            </p>
            <div className="space-y-2">
              <CodingInterviewButton source="practice" variant="button" />
            </div>
          </div>

          {/* Recent Topics */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Recent Topics
            </h3>
            {topics.length === 0 ? (
              <p className="text-sm text-zinc-400">No topics yet.</p>
            ) : (
              <ul className="space-y-2">
                {topics.slice(0, 5).map((topic) => (
                  <li key={topic.id}>
                    <Link
                      href={`/topics/${topic.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {topic.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Problems */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Recent Problems
            </h3>
            {problems.length === 0 ? (
              <p className="text-sm text-zinc-400">No problems yet.</p>
            ) : (
              <ul className="space-y-2">
                {problems.slice(0, 5).map((problem) => (
                  <li key={problem.id}>
                    <Link
                      href={`/problems/${problem.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {problem.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      {content}
    </div>
  );
}

function DifficultyRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className={color}>{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {count}
      </span>
    </div>
  );
}

function RevisionItem({ item }: { item: RevisionData }) {
  const href =
    item.itemType === "topic"
      ? `/topics/${item.itemId}`
      : `/problems/${item.itemId}`;

  const isOverdue =
    item.nextReview.split("T")[0] < new Date().toISOString().split("T")[0];

  return (
    <li className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between">
      <div>
        <Link
          href={href}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {item.itemId}
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {item.itemType} · confidence {item.confidence}/5
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isOverdue && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
            Overdue
          </span>
        )}
        <span className="text-xs text-zinc-400">
          Due: {item.nextReview.split("T")[0]}
        </span>
      </div>
    </li>
  );
}
