import Link from 'next/link';
import { getWorkspacePath } from '@/src/lib/constants';
import { FileProblemRepository } from '@/src/filesystem/FileProblemRepository';
import { ProblemService } from '@/src/services/ProblemService';
import ProblemsListClient from './ProblemsListClient';
import CodingInterviewButton from '@/src/components/CodingInterviewButton';

export default async function ProblemsPage() {
  const workspacePath = getWorkspacePath();
  const problemService = new ProblemService(new FileProblemRepository(workspacePath));
  const problems = await problemService.getAllProblems();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            All Problems
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {problems.length} problem{problems.length !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CodingInterviewButton source="practice" />
          <Link
            href="/create"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Create
          </Link>
        </div>
      </header>

      <ProblemsListClient problems={problems} />
    </div>
  );
}
