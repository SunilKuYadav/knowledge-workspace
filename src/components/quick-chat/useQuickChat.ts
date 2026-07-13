"use client";

import { useCallback, useRef, useEffect } from "react";
import { useQuickChatStore } from "./quickChatStore";

/**
 * Hook that manages quick chat interactions:
 * - Sending messages (streaming)
 * - Generating summaries after each exchange
 * - Persisting per-tab to repository (quick-chat/{tabId}.json)
 * - Lazy-loading tab messages on tab switch
 */
export function useQuickChat() {
  const {
    tabs,
    activeTabId,
    isOpen,
    toggle,
    open,
    close,
    createTab,
    setActiveTab,
    renameTab,
    deleteTab,
    addMessage,
    updateLastAssistantMessage,
    updateSummary,
    setTabMessages,
    getActiveTab,
    getVisibleTabs,
  } = useQuickChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  const persistTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const loadingTabsRef = useRef<Set<string>>(new Set());

  // Persist a single tab to repository (debounced per tab)
  const persistTab = useCallback((tabId: string) => {
    if (persistTimeoutRef.current[tabId]) {
      clearTimeout(persistTimeoutRef.current[tabId]);
    }
    persistTimeoutRef.current[tabId] = setTimeout(async () => {
      const state = useQuickChatStore.getState();
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      try {
        await fetch("/api/chat-persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tab,
            activeTabId: state.activeTabId,
          }),
        });
      } catch {
        // Silent fail — non-blocking
      }
    }, 2000);
  }, []);

  // Load a single tab's messages from the repository
  const loadTabMessages = useCallback(async (tabId: string) => {
    // Prevent duplicate concurrent loads
    if (loadingTabsRef.current.has(tabId)) return;
    loadingTabsRef.current.add(tabId);

    try {
      const res = await fetch(`/api/chat-persist/${encodeURIComponent(tabId)}`);
      if (!res.ok) {
        // Tab file doesn't exist yet — mark as loaded with empty messages
        setTabMessages(tabId, []);
        return;
      }
      const tabData = await res.json();
      if (tabData && tabData.messages) {
        setTabMessages(tabId, tabData.messages);
      } else {
        setTabMessages(tabId, []);
      }
    } catch {
      // Silent fail — mark as loaded with whatever is in store
      setTabMessages(tabId, []);
    } finally {
      loadingTabsRef.current.delete(tabId);
    }
  }, [setTabMessages]);

  // Soft-delete a tab in the repository
  const persistDelete = useCallback(async (tabId: string) => {
    try {
      await fetch(`/api/chat-persist?id=${encodeURIComponent(tabId)}`, {
        method: "DELETE",
      });
    } catch {
      // Silent fail
    }
  }, []);

  // Load index from repository on mount (metadata only, no messages)
  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch("/api/chat-persist");
        if (!res.ok) return;
        const data = await res.json();
        if (data.tabs && data.tabs.length > 0) {
          const store = useQuickChatStore.getState();
          // Only load if store is empty (localStorage might already have data)
          if (store.tabs.length === 0) {
            // Build tabs from index metadata — messages not loaded yet
            const indexTabs = data.tabs.map((t: { id: string; title: string; summary: string; createdAt: number; updatedAt: number; deleted: boolean }) => ({
              id: t.id,
              title: t.title,
              messages: [],
              summary: t.summary,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              deleted: t.deleted,
              messagesLoaded: false,
            }));
            useQuickChatStore.setState({
              tabs: indexTabs,
              activeTabId: data.activeTabId,
            });
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadIndex();
  }, []);

  // When active tab changes, load its messages if not already loaded
  useEffect(() => {
    if (!activeTabId) return;
    const tab = useQuickChatStore.getState().tabs.find((t) => t.id === activeTabId);
    if (tab && !tab.messagesLoaded) {
      loadTabMessages(activeTabId);
    }
  }, [activeTabId, loadTabMessages]);

  // Generate summary after an exchange
  const generateSummary = useCallback(
    async (tabId: string) => {
      const tab = useQuickChatStore
        .getState()
        .tabs.find((t) => t.id === tabId);
      if (!tab || tab.messages.length < 2) return;

      try {
        const res = await fetch("/api/ai/quick-chat/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: tab.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (res.ok) {
          const { summary } = await res.json();
          if (summary) {
            updateSummary(tabId, summary);
            persistTab(tabId);
          }
        }
      } catch {
        // Silent fail — summary is non-critical
      }
    },
    [updateSummary, persistTab],
  );

  // Send a message
  const sendMessage = useCallback(
    async (prompt: string) => {
      const activeTab = getActiveTab();
      if (!activeTab || !prompt.trim()) return;

      const tabId = activeTab.id;

      // Add user message
      addMessage(tabId, "user", prompt.trim());
      // Add empty assistant message placeholder
      addMessage(tabId, "assistant", "");

      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const currentTab = useQuickChatStore
          .getState()
          .tabs.find((t) => t.id === tabId);

        const response = await fetch("/api/ai/quick-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            summary: currentTab?.summary || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          updateLastAssistantMessage(
            tabId,
            "Error: Failed to get a response. Please try again.",
          );
          return;
        }

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            updateLastAssistantMessage(tabId, accumulated);
          }

          // If the stream completed but yielded nothing (model failed to generate),
          // show an error so the UI doesn't get stuck in streaming state.
          if (!accumulated.trim()) {
            updateLastAssistantMessage(
              tabId,
              "Error: No response received. The model may still be loading — try again in a moment.",
            );
          }
        } else {
          updateLastAssistantMessage(
            tabId,
            "Error: No response body. Please try again.",
          );
        }

        // After successful exchange, generate summary and persist tab
        generateSummary(tabId);
        persistTab(tabId);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        updateLastAssistantMessage(
          tabId,
          "Error: Request failed. Please try again.",
        );
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      getActiveTab,
      addMessage,
      updateLastAssistantMessage,
      generateSummary,
      persistTab,
    ],
  );

  // Stop current generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Wrapped deleteTab that also persists the soft-delete
  const handleDeleteTab = useCallback(
    (tabId: string) => {
      deleteTab(tabId);
      persistDelete(tabId);
    },
    [deleteTab, persistDelete],
  );

  // Wrapped createTab that persists the new tab
  const handleCreateTab = useCallback(
    (title?: string) => {
      const tab = createTab(title);
      persistTab(tab.id);
      return tab;
    },
    [createTab, persistTab],
  );

  // Wrapped setActiveTab that triggers lazy-load
  const handleSetActiveTab = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      // The useEffect above will trigger loadTabMessages if needed
    },
    [setActiveTab],
  );

  return {
    // State
    tabs,
    activeTabId,
    isOpen,
    activeTab: getActiveTab(),
    visibleTabs: getVisibleTabs(),

    // Panel actions
    toggle,
    open,
    close,

    // Tab actions
    createTab: handleCreateTab,
    setActiveTab: handleSetActiveTab,
    renameTab,
    deleteTab: handleDeleteTab,

    // Chat actions
    sendMessage,
    stopGeneration,

    // Persistence
    persistTab,
  };
}
