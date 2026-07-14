import Link from "next/link";
import PromptConfigPanel from "./PromptConfigPanel";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Prompt Configuration
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Configure your experience level and customize AI prompts across all
          actions.
        </p>
      </header>

      <PromptConfigPanel />
    </div>
  );
}
