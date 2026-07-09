import Link from "next/link";
import DuplicatesClient from "./duplicates-client";

export default function DuplicatesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Duplicate Detection
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Find and merge duplicate topics and problems to keep your workspace clean
        </p>
      </header>

      <DuplicatesClient />
    </div>
  );
}
