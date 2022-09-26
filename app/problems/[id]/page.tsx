import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import { getWorkspacePath } from '@/src/lib/constants';
import { FileProblemRepository } from '@/src/filesystem/FileProblemRepository';
import { ProblemService } from '@/src/services/ProblemService';
import AISidebar from '@/src/components/AISidebar';
import RateConfidenceButton from '@/src/components/RateConfidenceButton';
import SelfTestButton from '@/src/components/SelfTestButton';
import CodingInterviewButton from '@/src/components/CodingInterviewButton';

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspacePath = getWorkspacePath();
  const problemService = new ProblemService(new FileProblemRepository(workspacePath));

  const problem = await problemService.getProblemById(id);
  if (!problem) {
    notFound();
  }

  const [notes, solution, revision] = await Promise.all([
    problemService.getNotes(id),
    problemService.getSolution(id),
    problemService.getRevision(id),
  ]);

  const difficultyColor = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }[problem.difficulty];

  const platformLabel = {
    leetcode: 'LeetCode',
    codeforces: 'Codeforces',
    gfg: 'GFG',
  }[problem.platform];

  const statusLabel = {
    'not-started': 'Not Started',
    attempted: 'Attempted',
    solved: 'Solved',
  }[problem.status];

  const statusColor = {
    'not-started': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    attempted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    solved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }[problem.status];

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {problem.favorite && (
                <span className="text-yellow-500 text-xl" aria-label="Favorite">★</span>
              )}
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {problem.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                {platformLabel}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${difficultyColor}`}>
                {problem.difficulty}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <CodingInterviewButton
              source="problem"
              id={id}
              title={problem.title}
              category={problem.patterns[0] || ''}
              tags={problem.patterns}
              difficulty={problem.difficulty}
            />
            <SelfTestButton
              itemId={id}
              itemType="problem"
              confidence={revision.confidence}
            />
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open Problem ↗
              </a>
            )}
          </div>
        </div>

        {/* Companies */}
        {problem.companies.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-2">Companies:</span>
            <div className="inline-flex flex-wrap gap-1.5">
              {problem.companies.map((company) => (
                <span
                  key={company}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {problem.patterns.length > 0 && (
          <div className="mt-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-2">Patterns:</span>
            <div className="inline-flex flex-wrap gap-1.5">
              {problem.patterns.map((pattern) => (
                <span
                  key={pattern}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  {pattern}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Notes Section */}
      <section aria-label="Notes" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
          <Link
            href={`/edit/problems/${problem.platform}/${id}/notes.md`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          {notes ? (
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <MarkdownRenderer>{notes}</MarkdownRenderer>
            </div>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-500 italic">No notes yet. Click Edit to add notes.</p>
          )}
        </div>
      </section>

      {/* Solution Section */}
      <section aria-label="Solution" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Solution</h2>
          <Link
            href={`/edit/problems/${problem.platform}/${id}/solution.md`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          {solution ? (
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <MarkdownRenderer>{solution}</MarkdownRenderer>
            </div>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-500 italic">No solution yet. Click Edit to add a solution.</p>
          )}
        </div>
      </section>

      {/* Revision Section */}
      <section aria-label="Revision" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Revision</h2>
          <RateConfidenceButton
            itemId={id}
            itemType="problem"
            currentConfidence={revision.confidence}
          />
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          {/* Revision Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Last Reviewed</p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                {revision.lastReviewed
                  ? new Date(revision.lastReviewed).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Next Review</p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                {new Date(revision.nextReview).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Confidence</p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                {revision.confidence}/5
              </p>
            </div>
          </div>

          {/* Confidence Trend */}
          {revision.history.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Confidence Trend
              </h3>
              <div className="flex items-end gap-1 h-16">
                {revision.history.map((entry) => {
                  const height = (entry.confidence / 5) * 100;
                  const barColor = {
                    1: 'bg-red-400',
                    2: 'bg-orange-400',
                    3: 'bg-yellow-400',
                    4: 'bg-lime-400',
                    5: 'bg-green-400',
                  }[entry.confidence];
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col items-center gap-0.5"
                      title={`${new Date(entry.date).toLocaleDateString()} — Confidence: ${entry.confidence}/5`}
                    >
                      <div
                        className={`w-6 rounded-sm ${barColor}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-zinc-400">
                        {entry.confidence}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revision History */}
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              History
            </h3>
            {revision.history.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                No revision history yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {revision.history
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 text-sm border-l-2 border-zinc-200 dark:border-zinc-700 pl-3"
                    >
                      <div className="flex-1">
                        <p className="text-zinc-900 dark:text-zinc-100">
                          Confidence: {entry.confidence}/5
                        </p>
                        {entry.notes && (
                          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="mt-6">
        <Link
          href="/"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
      </div>

      {/* AI Sidebar */}
      <AISidebar context="problem" itemId={id} itemTitle={problem.title} />
    </div>
  );
}
