"use client";

import { useEffect, useState, useCallback } from "react";
import { usePromptConfigStore } from "@/src/stores/promptConfigStore";
import {
  EXPERIENCE_PRESETS,
  PROMPT_ACTION_KEYS,
  type ExperienceLevel,
  type PromptActionKey,
} from "@/types/PromptConfig";

const ACTION_LABELS: Record<PromptActionKey, string> = {
  identity: "AI Identity & Persona",
  teaching: "Teaching Style",
  interview: "Interview Calibration",
  dsa: "DSA Problems",
  systemDesign: "System Design",
  revision: "Revision & Recall",
  codingInterview: "Coding Interview Module",
};

const ACTION_DESCRIPTIONS: Record<PromptActionKey, string> = {
  identity:
    "Defines who the AI is, target preparation level, and company expectations.",
  teaching: "Controls how concepts are explained and the depth of teaching.",
  interview:
    "Calibrates interview evaluation criteria and follow-up question depth.",
  dsa: "Structures algorithm problem explanations and solution analysis.",
  systemDesign: "Frames system design discussions and depth expectations.",
  revision:
    "Optimizes content for long-term retention and interview recall.",
  codingInterview:
    "Calibrates the coding interview simulation difficulty and evaluation.",
};

export default function PromptConfigPanel() {
  const {
    config,
    loading,
    saving,
    error,
    loadConfig,
    saveConfig,
    setExperienceLevel,
    setTargetRole,
    setTargetCompanies,
    setOverride,
    clearOverride,
    resetToDefaults,
  } = usePromptConfigStore();

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PromptActionKey>("identity");
  const [editingOverride, setEditingOverride] = useState<PromptActionKey | null>(null);
  const [overrideText, setOverrideText] = useState("");
  const [overrideMode, setOverrideMode] = useState<"append" | "replace">("append");
  const [companiesInput, setCompaniesInput] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setCompaniesInput(config.targetCompanies.join(", "));
  }, [config.targetCompanies]);

  // Load prompt previews whenever config changes
  const loadPreviews = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/settings/prompt-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviews(data.prompts);
      }
    } catch {
      // Silent fail — preview is non-critical
    } finally {
      setPreviewLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const handleSave = async () => {
    await saveConfig(config);
    setHasUnsavedChanges(false);
  };

  const handleExperienceChange = (level: ExperienceLevel) => {
    const preset = EXPERIENCE_PRESETS.find((p) => p.level === level);
    setExperienceLevel(level);
    if (preset) {
      setTargetRole(preset.targetRole);
    }
    setHasUnsavedChanges(true);
  };

  const handleCompaniesBlur = () => {
    const companies = companiesInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (companies.length > 0) {
      setTargetCompanies(companies);
      setHasUnsavedChanges(true);
    }
  };

  const handleStartOverride = (key: PromptActionKey) => {
    const existing = config.overrides[key];
    setEditingOverride(key);
    if (existing?.replace) {
      setOverrideMode("replace");
      setOverrideText(existing.replace);
    } else if (existing?.append) {
      setOverrideMode("append");
      setOverrideText(existing.append);
    } else {
      setOverrideMode("append");
      setOverrideText("");
    }
  };

  const handleSaveOverride = () => {
    if (!editingOverride) return;
    if (!overrideText.trim()) {
      clearOverride(editingOverride);
    } else {
      setOverride(editingOverride, {
        [overrideMode]: overrideText.trim(),
      });
    }
    setEditingOverride(null);
    setOverrideText("");
    setHasUnsavedChanges(true);
  };

  const handleCancelOverride = () => {
    setEditingOverride(null);
    setOverrideText("");
  };

  const handleRemoveOverride = (key: PromptActionKey) => {
    clearOverride(key);
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    resetToDefaults();
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-500 dark:text-zinc-400">
          Loading configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Experience Level Selection */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Experience Level
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Select your experience level. This calibrates all AI prompts — teaching
          depth, interview bar, and evaluation criteria.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXPERIENCE_PRESETS.map((preset) => (
            <button
              key={preset.level}
              onClick={() => handleExperienceChange(preset.level)}
              className={`rounded-lg border p-5 text-left transition-all ${
                config.experienceLevel === preset.level
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {preset.label}
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {preset.description}
              </div>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                Target: {preset.targetRole}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Target Configuration */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Target Configuration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="targetRole"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Target Role
            </label>
            <input
              id="targetRole"
              type="text"
              value={config.targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="targetCompanies"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Target Companies (comma-separated)
            </label>
            <input
              id="targetCompanies"
              type="text"
              value={companiesInput}
              onChange={(e) => setCompaniesInput(e.target.value)}
              onBlur={handleCompaniesBlur}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Prompt Preview & Customization */}
      <section>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Prompt Preview & Customization
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          View the final prompt for each AI action. You can append additional instructions or completely replace a prompt.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-4">
          {PROMPT_ACTION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === key
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {ACTION_LABELS[key]}
              {config.overrides[key] && (
                <span className="ml-1 inline-block w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </div>

        {/* Active Tab Content */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {ACTION_LABELS[activeTab]}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {ACTION_DESCRIPTIONS[activeTab]}
                </p>
              </div>
              <div className="flex gap-2">
                {config.overrides[activeTab] && (
                  <button
                    onClick={() => handleRemoveOverride(activeTab)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Remove Override
                  </button>
                )}
                <button
                  onClick={() => handleStartOverride(activeTab)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {config.overrides[activeTab] ? "Edit Override" : "Customize"}
                </button>
              </div>
            </div>

            {/* Override indicator */}
            {config.overrides[activeTab] && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Custom override active (
                {config.overrides[activeTab]?.replace
                  ? "full replacement"
                  : "appended"}
                )
              </div>
            )}
          </div>

          {/* Override Editor */}
          {editingOverride === activeTab && (
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-center gap-4 mb-3">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Mode:
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="overrideMode"
                    value="append"
                    checked={overrideMode === "append"}
                    onChange={() => setOverrideMode("append")}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Append (add to generated prompt)
                  </span>
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="overrideMode"
                    value="replace"
                    checked={overrideMode === "replace"}
                    onChange={() => setOverrideMode("replace")}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Replace (use this instead)
                  </span>
                </label>
              </div>
              <textarea
                value={overrideText}
                onChange={(e) => setOverrideText(e.target.value)}
                placeholder={
                  overrideMode === "append"
                    ? "Add additional instructions here..."
                    : "Enter your custom prompt to replace the generated one..."
                }
                rows={6}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleCancelOverride}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverride}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Apply Override
                </button>
              </div>
            </div>
          )}

          {/* Prompt Preview */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Final Prompt Preview
              </h4>
              {previewLoading && (
                <span className="text-xs text-zinc-400">Updating...</span>
              )}
            </div>
            <pre className="max-h-96 overflow-auto rounded-md bg-zinc-100 dark:bg-zinc-800 p-4 text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
              {previews[activeTab] || "Loading preview..."}
            </pre>
          </div>
        </div>
      </section>

      {/* Actions Bar */}
      <div className="sticky bottom-0 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 -mx-6 md:-mx-10 px-6 md:px-10 py-4 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Reset to Defaults
        </button>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
