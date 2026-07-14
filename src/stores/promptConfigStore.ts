"use client";

/**
 * Zustand store for prompt configuration.
 *
 * Manages the user's experience level and prompt customization settings.
 * Persists to the server via the /api/settings/prompt-config endpoint.
 */

import { create } from "zustand";
import type { PromptConfig, ExperienceLevel, PromptActionKey, PromptOverride } from "@/types/PromptConfig";
import { DEFAULT_PROMPT_CONFIG } from "@/types/PromptConfig";

interface PromptConfigState {
  config: PromptConfig;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: PromptConfig) => Promise<void>;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setTargetRole: (role: string) => void;
  setTargetCompanies: (companies: string[]) => void;
  setOverride: (key: PromptActionKey, override: PromptOverride) => void;
  clearOverride: (key: PromptActionKey) => void;
  resetToDefaults: () => void;
}

export const usePromptConfigStore = create<PromptConfigState>((set, get) => ({
  config: DEFAULT_PROMPT_CONFIG,
  loading: false,
  saving: false,
  error: null,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/settings/prompt-config");
      if (res.ok) {
        const data = await res.json();
        set({ config: data, loading: false });
      } else {
        set({ loading: false, error: "Failed to load configuration" });
      }
    } catch {
      set({ loading: false, error: "Failed to load configuration" });
    }
  },

  saveConfig: async (config: PromptConfig) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/settings/prompt-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        set({ config: data, saving: false });
      } else {
        set({ saving: false, error: "Failed to save configuration" });
      }
    } catch {
      set({ saving: false, error: "Failed to save configuration" });
    }
  },

  setExperienceLevel: (level: ExperienceLevel) => {
    const current = get().config;
    set({ config: { ...current, experienceLevel: level } });
  },

  setTargetRole: (role: string) => {
    const current = get().config;
    set({ config: { ...current, targetRole: role } });
  },

  setTargetCompanies: (companies: string[]) => {
    const current = get().config;
    set({ config: { ...current, targetCompanies: companies } });
  },

  setOverride: (key: PromptActionKey, override: PromptOverride) => {
    const current = get().config;
    set({
      config: {
        ...current,
        overrides: { ...current.overrides, [key]: override },
      },
    });
  },

  clearOverride: (key: PromptActionKey) => {
    const current = get().config;
    const overrides = { ...current.overrides };
    delete overrides[key];
    set({ config: { ...current, overrides } });
  },

  resetToDefaults: () => {
    set({ config: DEFAULT_PROMPT_CONFIG });
  },
}));
