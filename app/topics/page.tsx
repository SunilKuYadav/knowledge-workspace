import Link from "next/link";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { TopicService } from "@/src/services/TopicService";
import TopicsListClient from "./topics-list-client";

export default async function TopicsPage() {
  const workspacePath = getWorkspacePath();
  const topicService = new TopicService(new FileTopicRepository(workspacePath));
  const topics = await topicService.getAllTopics();

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
            All Topics
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {topics.length} topic{topics.length !== 1 ? "s" : ""} in your
            workspace
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Create
        </Link>
      </header>

      <TopicsListClient topics={topics} />
    </div>
  );
}
