"use client";

import Link from "next/link";
import { useCreateForm } from "./useCreateForm";
import { TopicForm } from "./components/TopicForm";
import { ProblemForm } from "./components/ProblemForm";

export default function CreateForm() {
  const { activeTab, setActiveTab } = useCreateForm();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Create New
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Add a new topic or problem to your workspace
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6" role="tablist" aria-label="Create type">
        <div className="flex gap-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 p-1 w-fit">
          <button
            role="tab"
            aria-selected={activeTab === "topic"}
            onClick={() => setActiveTab("topic")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "topic"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Topic
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "problem"}
            onClick={() => setActiveTab("problem")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "problem"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Problem
          </button>
        </div>
      </div>

      {/* Form */}
      {activeTab === "topic" ? <TopicForm /> : <ProblemForm />}
    </div>
  );
}
