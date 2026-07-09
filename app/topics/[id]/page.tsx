import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import TopicTabs from "./topic-tabs";
import AISidebar from "@/src/components/AISidebar";
import RateConfidenceButton from "@/src/components/RateConfidenceButton";
import SelfTestButton from "@/src/components/SelfTestButton";
import CodingInterviewButton from "@/src/components/CodingInterviewButton";
import LinkProblemButton from "@/src/components/LinkProblemButton";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));
  const problemService = new ProblemService(
    new FileProblemRepository(workspacePath),
  );

  const topic = await topicService.getTopicById(id);
  if (!topic) {
    notFound();
  }

  const [artifacts, flashcards, revision, allProblems] = await Promise.all([
    topicService.getArtifacts(id),
    topicService.getFlashcards(id),
    topicService.getRevision(id),
    problemService.getAllProblems(),
  ]);

  const linkedProblemIds = topic.relatedProblemIds ?? [];
  const problemSummaries = allProblems.map((p) => ({
    id: p.id,
    title: p.title,
    platform: p.platform,
    difficulty: p.difficulty,
  }));

  const difficultyColor: Record<string, string> = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusColor: Record<string, string> = {
    "not-started":
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    "in-progress":
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Topic header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {topic.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded ${difficultyColor[topic.difficulty]}`}
                >
                  {topic.difficulty}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded ${statusColor[topic.status]}`}
                >
                  {topic.status}
                </span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  Confidence: {topic.confidence}/5
                </span>
              </div>
              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Related Problems */}
              <div className="mt-4">
                <LinkProblemButton
                  topicId={id}
                  linkedProblemIds={linkedProblemIds}
                  allProblems={problemSummaries}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <CodingInterviewButton
                source="topic"
                id={id}
                title={topic.title}
                concepts={topic.tags}
                difficulty={topic.difficulty as "easy" | "medium" | "hard"}
              />
              <SelfTestButton
                itemId={id}
                itemType="topic"
                confidence={topic.confidence}
              />
            </div>
          </div>
        </header>

        {/* Tabbed content */}
        <section className="mb-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <TopicTabs
            artifacts={artifacts}
            editBasePath={`/edit/notes/${topic.category}/${topic.id}`}
            topicId={topic.id}
            topicTitle={topic.title}
            topicCategory={topic.category}
          />
        </section>

        {/* Flashcards */}
        <section className="mb-10" aria-label="Flashcards">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Flashcards
          </h2>
          {flashcards.cards.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              No flashcards yet for this topic.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                >
                  <div className="mb-3">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Front
                    </p>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100">
                      {card.front}
                    </p>
                  </div>
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Back
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {card.back}
                    </p>
                  </div>
                  {card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Revision History */}
        <section className="mb-10" aria-label="Revision history">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Revision History
            </h2>
            <RateConfidenceButton
              itemId={id}
              itemType="topic"
              currentConfidence={revision.confidence}
            />
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Last Reviewed
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {revision.lastReviewed
                    ? new Date(revision.lastReviewed).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Next Review
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {new Date(revision.nextReview).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Confidence
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {revision.confidence}/5
                </p>
              </div>
            </div>

            {revision.history.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No review history yet.
              </p>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  History
                </h3>
                <ul className="space-y-2">
                  {revision.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0"
                    >
                      <div>
                        <span className="text-zinc-900 dark:text-zinc-100">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        {entry.notes && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Confidence: {entry.confidence}/5
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* AI Sidebar */}
      <AISidebar context="topic" itemId={id} itemTitle={topic.title} />
    </div>
  );
}
