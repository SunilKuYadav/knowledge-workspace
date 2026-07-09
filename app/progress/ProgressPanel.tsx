"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Topic } from "@/src/types/Topic";
import type { Problem } from "@/src/types/Problem";

interface CoverageStats {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  avgConfidence: number;
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  patternsCovered: string[];
  categoriesCovered: string[];
}

interface ProgressPanelProps {
  topics: Topic[];
  problems: Problem[];
  coverageStats: CoverageStats;
  topicsSummary: string;
  problemsSummary: string;
}

type ActionType = "assess-readiness" | "generate-plan" | "suggest-topics" | "suggest-problems";
type TabType = "overview" | "readiness" | "plan" | "suggestions";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "dsa", label: "DSA" },
  { value: "system-design", label: "System Design" },
  { value: "database", label: "Database" },
  { value: "networking", label: "Networking" },
  { value: "os", label: "Operating Systems" },
  { value: "oop", label: "OOP" },
];

export default function ProgressPanel({
  topics,
  problems,
  coverageStats,
  topicsSummary,
  problemsSummary,
}: ProgressPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [aiOutput, setAiOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const callAI = useCallback(
    async (action: ActionType, category?: string) => {
      setLoading(true);
      setError(null);
      setAiOutput("");

      try {
        const res = await fetch("/api/ai/learning-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            category: category || undefined,
            topicsSummary,
            problemsSummary,
            coverageStats,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Request failed" }));
          setError(data.error || "Request failed");
          setLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setAiOutput(accumulated);
        }
      } catch {
        setError("Failed to connect to AI service");
      } finally {
        setLoading(false);
      }
    },
    [topicsSummary, problemsSummary, coverageStats],
  );

  const handleAssessReadiness = () => {
    setActiveTab("readiness");
    callAI("assess-readiness");
  };

  const handleGeneratePlan = () => {
    setActiveTab("plan");
    callAI("generate-plan", selectedCategory);
  };

  const handleSuggestTopics = () => {
    setActiveTab("suggestions");
    callAI("suggest-topics", selectedCategory);
  };

  const handleSuggestProblems = () => {
    setActiveTab("suggestions");
    callAI("suggest-problems", selectedCategory);
  };

  // Coverage by category
  const categoryStats = CATEGORIES.filter((c) => c.value).map((cat) => {
    const catTopics = topics.filter((t) => t.category === cat.value);
    const catProblems = problems.filter((p) =>
      p.patterns.some((pat) => pat.toLowerCase().includes(cat.value.replace("-", " "))) ||
      cat.value === "dsa",
    );
    const completed = catTopics.filter((t) => t.status === "completed").length;
    const avgConf =
      catTopics.length > 0
        ? catTopics.reduce((s, t) => s + t.confidence, 0) / catTopics.length
        : 0;

    return {
      ...cat,
      topicCount: catTopics.length,
      completed,
      avgConfidence: avgConf,
      problemCount: cat.value === "dsa" ? problems.length : catProblems.length,
    };
  });

  return (
    <div className="space-y-8">
      {/* Coverage Overview Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Topics Covered"
            value={`${coverageStats.completedTopics + coverageStats.inProgressTopics}/${coverageStats.totalTopics}`}
            sub={`${coverageStats.completedTopics} completed, ${coverageStats.inProgressTopics} in progress`}
            color="blue"
          />
          <StatCard
            label="Avg Confidence"
            value={`${coverageStats.avgConfidence.toFixed(1)}/5`}
            sub={confidenceLabel(coverageStats.avgConfidence)}
            color={coverageStats.avgConfidence >= 3.5 ? "green" : coverageStats.avgConfidence >= 2 ? "yellow" : "red"}
          />
          <StatCard
            label="Problems Solved"
            value={`${coverageStats.solvedProblems}/${coverageStats.totalProblems}`}
            sub={`E:${coverageStats.easyCount} M:${coverageStats.mediumCount} H:${coverageStats.hardCount}`}
            color="purple"
          />
          <StatCard
            label="Patterns"
            value={`${coverageStats.patternsCovered.length}`}
            sub={coverageStats.patternsCovered.slice(0, 3).join(", ") || "None yet"}
            color="indigo"
          />
        </div>
      </section>

      {/* Category Breakdown */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Coverage by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.map((cat) => (
            <div
              key={cat.value}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {cat.label}
                </h3>
                <span className="text-xs text-zinc-500">
                  {cat.topicCount} topics
                </span>
              </div>
              <div className="space-y-2">
                <ProgressBar
                  label="Completion"
                  current={cat.completed}
                  total={cat.topicCount || 1}
                />
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Confidence: {cat.avgConfidence.toFixed(1)}/5</span>
                  <span>
                    {cat.completed}/{cat.topicCount} done
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          AI-Powered Analysis
        </h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              aria-label="Filter by category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ActionButton
              onClick={handleAssessReadiness}
              disabled={loading}
              icon="📊"
              label="Assess Readiness"
              description="Rate your preparation level and identify gaps"
            />
            <ActionButton
              onClick={handleGeneratePlan}
              disabled={loading}
              icon="📋"
              label="Generate Study Plan"
              description="Create a structured plan to fill gaps"
            />
            <ActionButton
              onClick={handleSuggestTopics}
              disabled={loading}
              icon="📚"
              label="Suggest Topics"
              description="Get subtopics to study next"
            />
            <ActionButton
              onClick={handleSuggestProblems}
              disabled={loading}
              icon="💻"
              label="Suggest Problems"
              description="Get problems to practice"
            />
          </div>
        </div>
      </section>

      {/* AI Output */}
      {(aiOutput || loading || error) && (
        <section>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {activeTab === "readiness" && "Readiness Assessment"}
                {activeTab === "plan" && "Study Plan"}
                {activeTab === "suggestions" && "Suggestions"}
              </h3>
              {loading && (
                <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                  Analyzing...
                </span>
              )}
            </div>

            <div className="p-6">
              {error && (
                <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              {aiOutput && (
                <div className="prose prose-zinc dark:prose-invert max-w-none prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiOutput}
                  </ReactMarkdown>
                </div>
              )}

              {loading && !aiOutput && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-zinc-500 dark:text-zinc-400">
                    Analyzing your knowledge base...
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Patterns Coverage */}
      {coverageStats.patternsCovered.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Patterns Covered
          </h2>
          <div className="flex flex-wrap gap-2">
            {coverageStats.patternsCovered.map((pattern) => (
              <span
                key={pattern}
                className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
              >
                {pattern}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "green" | "yellow" | "red" | "purple" | "indigo";
}) {
  const colorMap = {
    blue: "border-blue-200 dark:border-blue-800",
    green: "border-green-200 dark:border-green-800",
    yellow: "border-yellow-200 dark:border-yellow-800",
    red: "border-red-200 dark:border-red-800",
    purple: "border-purple-200 dark:border-purple-800",
    indigo: "border-indigo-200 dark:border-indigo-800",
  };

  return (
    <div
      className={`rounded-lg border ${colorMap[color]} bg-white dark:bg-zinc-900 p-5`}
    >
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
        {sub}
      </p>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const pct = Math.round((current / total) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  description,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        {description}
      </div>
    </button>
  );
}

function confidenceLabel(avg: number): string {
  if (avg >= 4.5) return "Excellent — interview ready";
  if (avg >= 3.5) return "Good — solid foundation";
  if (avg >= 2.5) return "Fair — needs more practice";
  if (avg >= 1.5) return "Developing — keep studying";
  return "Just starting — lots to cover";
}
