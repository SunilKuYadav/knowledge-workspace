"use client";

import Link from "next/link";
import type { RevisionClientProps } from "./types";
import {
  TabButton,
  InteractiveReviewSession,
  ScheduleView,
  HistoryView,
} from "../components";
import { useRevisionClient } from "./useRevisionClient";

export default function RevisionClient({
  categorizedItems,
  dueItems,
}: RevisionClientProps) {
  const { activeTab, setActiveTab } = useRevisionClient();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Revision
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            AI-powered interactive review sessions
          </p>
        </div>
        <Link
          href="/coding-interview?source=revision"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          💻 Coding Interview
        </Link>
      </header>

      <nav className="flex gap-1 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton
          active={activeTab === "session"}
          onClick={() => setActiveTab("session")}
        >
          Review Session
        </TabButton>
        <TabButton
          active={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule
        </TabButton>
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
        >
          History
        </TabButton>
      </nav>

      {activeTab === "session" && (
        <InteractiveReviewSession dueItems={dueItems} />
      )}
      {activeTab === "schedule" && (
        <ScheduleView categorizedItems={categorizedItems} />
      )}
      {activeTab === "history" && (
        <HistoryView categorizedItems={categorizedItems} />
      )}
    </div>
  );
}
