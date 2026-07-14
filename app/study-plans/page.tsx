import StudyPlansPanel from "./StudyPlansPanel";

export default function StudyPlansPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Study Plans
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          AI-generated study plans to fill gaps and track your progress toward interview readiness.
        </p>
      </header>
      <StudyPlansPanel />
    </div>
  );
}
