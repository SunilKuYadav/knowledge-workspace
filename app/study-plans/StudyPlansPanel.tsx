"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface StudyPlanItem {
  id: string;
  type: "topic" | "problem";
  title: string;
  completed: boolean;
  reason?: string;
  estimatedMinutes?: number;
  priority?: "high" | "medium" | "low";
}

interface StudyPlan {
  id: string;
  title: string;
  description?: string;
  category?: string | null;
  timelineWeeks?: number;
  items: StudyPlanItem[];
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "", label: "All Categories (Comprehensive)" },
  { value: "dsa", label: "DSA" },
  { value: "system-design", label: "System Design" },
  { value: "database", label: "Database" },
  { value: "networking", label: "Networking" },
  { value: "os", label: "Operating Systems" },
  { value: "oop", label: "OOP" },
];

export default function StudyPlansPanel() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genCategory, setGenCategory] = useState("");
  const [genWeeks, setGenWeeks] = useState("4");

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/study-plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch {
      // Silently fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: genCategory || undefined,
          timelineWeeks: parseInt(genWeeks, 10) || 4,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setError(data.error || "Failed to generate plan");
        return;
      }

      const data = await res.json();
      setPlans((prev) => [data.plan, ...prev]);
      setSelectedPlan(data.plan);
      setShowGenerator(false);
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleItem = async (planId: string, itemId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/ai/study-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: planId,
          itemUpdates: [{ itemId, completed }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
        if (selectedPlan?.id === planId) {
          setSelectedPlan(data.plan);
        }
      }
    } catch {
      // Silently fail
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/ai/study-plans?id=${planId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
        }
      }
    } catch {
      // Silently fail
    }
  };

  const handleToggleActive = async (planId: string, active: boolean) => {
    try {
      const res = await fetch("/api/ai/study-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planId, active }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlans((prev) => prev.map((p) => (p.id === planId ? data.plan : p)));
        if (selectedPlan?.id === planId) {
          setSelectedPlan(data.plan);
        }
      }
    } catch {
      // Silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">Loading study plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">|</span>
          <Link
            href="/progress"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Progress
          </Link>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showGenerator ? "Cancel" : "Generate New Plan"}
        </button>
      </div>

      {/* Generator Panel */}
      {showGenerator && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            Generate a Study Plan
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            AI will analyze your current knowledge base and create a structured plan
            targeting your gaps for interview preparation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="gen-category"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Focus Area
              </label>
              <select
                id="gen-category"
                value={genCategory}
                onChange={(e) => setGenCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="gen-weeks"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Timeline (weeks)
              </label>
              <input
                id="gen-weeks"
                type="number"
                min={1}
                max={24}
                value={genWeeks}
                onChange={(e) => setGenWeeks(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {generating ? "Generating plan…" : "Generate Plan"}
          </button>

          {generating && (
            <div className="mt-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Analyzing your knowledge base and generating a personalized study plan. This may take 30–60 seconds…
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Your Plans ({plans.length})
          </h2>

          {plans.length === 0 && !showGenerator && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                No study plans yet. Generate one to get started.
              </p>
              <button
                onClick={() => setShowGenerator(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Generate your first plan →
              </button>
            </div>
          )}

          {plans.map((plan) => {
            const completedCount = plan.items.filter((i) => i.completed).length;
            const totalCount = plan.items.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${
                  selectedPlan?.id === plan.id
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {plan.title}
                    </h3>
                    {plan.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  {plan.active && (
                    <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                      Active
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span>{completedCount}/{totalCount} items</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {plan.category && (
                    <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">
                      {plan.category}
                    </span>
                  )}
                  {plan.timelineWeeks && <span>{plan.timelineWeeks}w</span>}
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Plan Detail */}
        <div className="lg:col-span-2">
          {selectedPlan ? (
            <PlanDetail
              plan={selectedPlan}
              onToggleItem={handleToggleItem}
              onDelete={handleDeletePlan}
              onToggleActive={handleToggleActive}
            />
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                Select a plan from the list to view details and track progress.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan Detail Component ───────────────────────────────────────────────────

function PlanDetail({
  plan,
  onToggleItem,
  onDelete,
  onToggleActive,
}: {
  plan: StudyPlan;
  onToggleItem: (planId: string, itemId: string, completed: boolean) => void;
  onDelete: (planId: string) => void;
  onToggleActive: (planId: string, active: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"items" | "full-plan">("items");
  const [addedItems, setAddedItems] = useState<Record<string, "adding" | "added" | "exists" | "error">>({});

  const handleAddToWorkspace = async (item: StudyPlanItem) => {
    setAddedItems((prev) => ({ ...prev, [item.id]: "adding" }));

    try {
      const res = await fetch("/api/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          title: item.title,
          category: plan.category || "dsa",
          planContext: {
            title: plan.title,
            description: plan.description,
            category: plan.category,
            reason: item.reason,
            content: plan.content?.slice(0, 2000),
          },
        }),
      });

      if (!res.ok) {
        setAddedItems((prev) => ({ ...prev, [item.id]: "error" }));
        return;
      }

      const data = await res.json();
      if (data.existing) {
        setAddedItems((prev) => ({ ...prev, [item.id]: "exists" }));
      } else {
        setAddedItems((prev) => ({ ...prev, [item.id]: "added" }));
      }
    } catch {
      setAddedItems((prev) => ({ ...prev, [item.id]: "error" }));
    }
  };

  const handleAddAllToWorkspace = async () => {
    const uncreated = plan.items.filter((i) => !addedItems[i.id]);
    for (const item of uncreated) {
      await handleAddToWorkspace(item);
    }
  };

  const highPriority = plan.items.filter((i) => i.priority === "high");
  const mediumPriority = plan.items.filter((i) => i.priority === "medium");
  const lowPriority = plan.items.filter((i) => i.priority === "low");
  const noPriority = plan.items.filter((i) => !i.priority);

  const addedCount = Object.values(addedItems).filter((s) => s === "added" || s === "exists").length;
  const hasUnadded = plan.items.some((i) => !addedItems[i.id]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {plan.title}
            </h2>
            {plan.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {plan.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleActive(plan.id, !plan.active)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                plan.active
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {plan.active ? "Active" : "Inactive"}
            </button>
            <button
              onClick={() => onDelete(plan.id)}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-3 py-1.5 text-sm rounded-md ${
              activeTab === "items"
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            Checklist ({plan.items.filter((i) => i.completed).length}/{plan.items.length})
          </button>
          <button
            onClick={() => setActiveTab("full-plan")}
            className={`px-3 py-1.5 text-sm rounded-md ${
              activeTab === "full-plan"
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            Full Plan
          </button>

          {/* Add all to workspace button */}
          {activeTab === "items" && hasUnadded && (
            <button
              onClick={handleAddAllToWorkspace}
              className="ml-auto rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add All to Workspace
            </button>
          )}
          {activeTab === "items" && addedCount > 0 && (
            <span className="ml-auto text-xs text-green-600 dark:text-green-400">
              {addedCount} added to workspace
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {activeTab === "items" ? (
          <div className="space-y-4">
            {highPriority.length > 0 && (
              <PrioritySection
                label="🔴 High Priority"
                items={highPriority}
                planId={plan.id}
                planCategory={plan.category}
                onToggle={onToggleItem}
                onAddToWorkspace={handleAddToWorkspace}
                addedItems={addedItems}
              />
            )}
            {mediumPriority.length > 0 && (
              <PrioritySection
                label="🟡 Medium Priority"
                items={mediumPriority}
                planId={plan.id}
                planCategory={plan.category}
                onToggle={onToggleItem}
                onAddToWorkspace={handleAddToWorkspace}
                addedItems={addedItems}
              />
            )}
            {lowPriority.length > 0 && (
              <PrioritySection
                label="🟢 Low Priority"
                items={lowPriority}
                planId={plan.id}
                planCategory={plan.category}
                onToggle={onToggleItem}
                onAddToWorkspace={handleAddToWorkspace}
                addedItems={addedItems}
              />
            )}
            {noPriority.length > 0 && (
              <PrioritySection
                label="Other"
                items={noPriority}
                planId={plan.id}
                planCategory={plan.category}
                onToggle={onToggleItem}
                onAddToWorkspace={handleAddToWorkspace}
                addedItems={addedItems}
              />
            )}
          </div>
        ) : (
          <div className="prose prose-zinc dark:prose-invert max-w-none prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {plan.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Priority Section ────────────────────────────────────────────────────────

function PrioritySection({
  label,
  items,
  planId,
  planCategory,
  onToggle,
  onAddToWorkspace,
  addedItems,
}: {
  label: string;
  items: StudyPlanItem[];
  planId: string;
  planCategory?: string | null;
  onToggle: (planId: string, itemId: string, completed: boolean) => void;
  onAddToWorkspace: (item: StudyPlanItem) => void;
  addedItems: Record<string, "adding" | "added" | "exists" | "error">;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        {label}
      </h4>
      <div className="space-y-1">
        {items.map((item) => {
          const status = addedItems[item.id];
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-md p-2 ${
                item.completed
                  ? "bg-zinc-50 dark:bg-zinc-800/50 opacity-60"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(planId, item.id, !item.completed)}
                className="mt-0.5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                aria-label={`Mark "${item.title}" as ${item.completed ? "incomplete" : "complete"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      item.type === "topic"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {item.reason}
                  </p>
                )}
              </div>

              {/* Add to workspace button */}
              <div className="flex items-center gap-2 shrink-0">
                {item.estimatedMinutes && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                    {item.estimatedMinutes}m
                  </span>
                )}
                {status === "adding" && (
                  <svg className="animate-spin h-3.5 w-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {status === "added" && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Added
                  </span>
                )}
                {status === "exists" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Exists
                  </span>
                )}
                {status === "error" && (
                  <button
                    onClick={() => onAddToWorkspace(item)}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300"
                    title="Retry"
                  >
                    ⚠ Retry
                  </button>
                )}
                {!status && (
                  <button
                    onClick={() => onAddToWorkspace(item)}
                    className="rounded px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                    title={`Add "${item.title}" to your ${item.type === "topic" ? "topics" : "problems"}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
