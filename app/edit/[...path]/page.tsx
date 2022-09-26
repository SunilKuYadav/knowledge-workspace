import path from 'path';
import { getWorkspacePath } from '@/src/lib/constants';
import { readMarkdownFile } from '@/src/filesystem/workspace';
import MarkdownEditor from '@/src/components/MarkdownEditor';

interface EditPageProps {
  params: Promise<{ path: string[] }>;
}

export default async function EditPage({ params }: EditPageProps) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join('/');
  const workspacePath = getWorkspacePath();
  const fullPath = path.join(workspacePath, filePath);

  const content = await readMarkdownFile(fullPath);

  return (
    <div className="h-screen flex flex-col">
      <header className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3">
        <h1 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
          Editing: <span className="text-zinc-900 dark:text-zinc-100">{filePath}</span>
        </h1>
      </header>
      <div className="flex-1 min-h-0">
        <MarkdownEditor content={content} filePath={filePath} />
      </div>
    </div>
  );
}
