"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveAIContent } from "../ai-actions";
import { useAIStatus } from "@/src/providers/AIProvider";
import { useProblemEvaluation } from "@/src/providers/ProblemEvaluationProvider";
import { logInput, logOutput, logError } from "@/src/ai/logger";

import type { ActionConfig } from "./types";
import {
  TOPIC_ACTIONS,
  PROBLEM_ACTIONS,
  EVALUATION_ACTIONS,
  TOPIC_PROMPT_HELPERS,
  PROBLEM_PROMPT_HELPERS,
  EVALUATION_PROMPT_HELPERS,
} from "./constants";
import { detectGeneralQuestion } from "./utils";
import { useAIChatStore } from "./chatStore";

interface UseAISidebarParams {
  context: "topic" | "problem";
  itemId: string;
  itemTitle?: string;
  available?: boolean;
}

export function useAISidebar({
  context,
  itemId,
  itemTitle,
  available: availableProp,
}: UseAISidebarParams) {
  const { available: contextAvailable } = useAIStatus();
  const available = availableProp ?? contextAvailable;

  // Problem evaluation context (only available for problems)
  const evaluationCtx = useProblemEvaluation();
  const hasEvaluation = context === "problem" && evaluationCtx.evaluation !== null;

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showHelpers, setShowHelpers] = useState(false);

  // Chat store
  const {
    getOrCreateSession,
    addMessage,
    updateLastAssistantMessage,
    clearSession,
    getSessionSummary,
    sessions,
    activeSessionIds,
  } = useAIChatStore();

  // Get or create session for this item
  const sessionKey = `${context}:${itemId}`;
  const sessionId = activeSessionIds[sessionKey];
  const session = sessionId ? sessions[sessionId] : null;
  const messages = session?.messages ?? [];

  // Initialize session on mount
  useEffect(() => {
    getOrCreateSession(context, itemId, itemTitle || itemId);
  }, [context, itemId, itemTitle, getOrCreateSession]);

  const actions = context === "topic" ? TOPIC_ACTIONS : PROBLEM_ACTIONS;
  const evaluationActions = hasEvaluation ? EVALUATION_ACTIONS : [];
  const promptHelpers =
    context === "topic"
      ? TOPIC_PROMPT_HELPERS
      : hasEvaluation
        ? [...EVALUATION_PROMPT_HELPERS, ...PROBLEM_PROMPT_HELPERS]
        : PROBLEM_PROMPT_HELPERS;

  const router = useRouter();

  // Resize state
  const [width, setWidth] = useState(380);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(380);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = startX.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidth.current + diff, 280), 700);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  /** Build a context-aware prompt that includes conversation summary */
  const buildContextualPrompt = useCallback(
    (userPrompt: string, isGeneral: boolean): string => {
      if (!sessionId) return userPrompt;
      const summary = getSessionSummary(sessionId);
      if (!summary) return userPrompt;

      return [
        "Below is a summary of the conversation so far for context:",
        "---",
        summary,
        "---",
        "",
        "Now answer the following follow-up question based on the above context:",
        userPrompt,
      ].join("\n");
    },
    [sessionId, getSessionSummary],
  );

  const handleAction = useCallback(
    async (actionConfig: ActionConfig) => {
      setLoading(true);
      setActiveAction(actionConfig);
      setSaveStatus("idle");

      // Add user message to chat
      const currentSession = getOrCreateSession(
        context,
        itemId,
        itemTitle || itemId,
      );
      addMessage(currentSession.id, "user", `[Action] ${actionConfig.label}`);
      addMessage(currentSession.id, "assistant", "");

      try {
        // Build request — evaluation actions include evaluation context
        const isEvalAction = EVALUATION_ACTIONS.some((a) => a.id === actionConfig.id);
        const requestBody = isEvalAction && evaluationCtx.evaluation
          ? {
              action: actionConfig.action,
              itemId,
              context,
              evaluationContext: {
                evaluation: evaluationCtx.evaluation,
                code: evaluationCtx.evaluatedCode,
                problemTitle: evaluationCtx.problemTitle,
                patterns: evaluationCtx.problemPatterns,
                difficulty: evaluationCtx.problemDifficulty,
              },
            }
          : { action: actionConfig.action, itemId, context };

        logInput(JSON.stringify(requestBody), actionConfig.action);

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          logError(JSON.stringify(requestBody), `HTTP ${response.status}`);
          const errorMsg =
            "Error: Failed to generate content. Please try again.";
          updateLastAssistantMessage(currentSession.id, errorMsg);
          setLoading(false);
          return;
        }

        if (actionConfig.streaming && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            updateLastAssistantMessage(currentSession.id, accumulated);
          }
          logOutput(JSON.stringify(requestBody), accumulated);
        } else {
          const data = await response.json();
          const formatted = JSON.stringify(data, null, 2);
          updateLastAssistantMessage(currentSession.id, formatted);
          logOutput(JSON.stringify(requestBody), formatted);
        }
      } catch {
        updateLastAssistantMessage(
          currentSession.id,
          "Error: Connection failed. Please check your network.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      itemId,
      context,
      itemTitle,
      evaluationCtx,
      getOrCreateSession,
      addMessage,
      updateLastAssistantMessage,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!activeAction || messages.length === 0) return;
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    setSaveStatus("saving");

    // If this is an evaluation action with a save target, save back to workspace
    if (activeAction.saveTarget && evaluationCtx) {
      if (activeAction.saveTarget === "notes" && evaluationCtx.onSaveNotes) {
        evaluationCtx.onSaveNotes(lastAssistant.content);
        setSaveStatus("saved");
        return;
      }
      if (activeAction.saveTarget === "solution" && evaluationCtx.onSaveSolution) {
        evaluationCtx.onSaveSolution(lastAssistant.content);
        setSaveStatus("saved");
        return;
      }
    }

    // Default: save to file
    const result = await saveAIContent(
      itemId,
      context,
      lastAssistant.content,
      activeAction.filename,
    );

    if (result.success) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  }, [activeAction, messages, itemId, context, evaluationCtx]);

  const handleOpenInEditor = useCallback(async () => {
    if (!activeAction) return;
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const result = await saveAIContent(
      itemId,
      context,
      lastAssistant.content,
      activeAction.filename,
    );
    if (result.success && result.path) {
      router.push(`/edit/${result.path}`);
    }
  }, [activeAction, messages, itemId, context, router]);

  const handleCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim() || loading) return;

    const userText = customPrompt.trim();
    const isGeneral = detectGeneralQuestion(userText);

    setLoading(true);
    setActiveAction({
      id: "custom",
      label: "Custom",
      action: "custom",
      streaming: true,
      filename: "ai-response.md",
      isGeneral,
    });
    setSaveStatus("idle");

    // Add user message to chat
    const currentSession = getOrCreateSession(
      context,
      itemId,
      itemTitle || itemId,
    );
    addMessage(currentSession.id, "user", userText);
    addMessage(currentSession.id, "assistant", "");
    setCustomPrompt("");

    try {
      // Build prompt with conversation context
      const contextualPrompt = buildContextualPrompt(userText, isGeneral);

      const requestBody = {
        action: "custom",
        itemId,
        context,
        prompt: contextualPrompt,
        isGeneral,
      };
      logInput(userText, "custom");

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        logError(userText, `HTTP ${response.status}`);
        updateLastAssistantMessage(
          currentSession.id,
          "Error: Failed to generate content. Please try again.",
        );
        setLoading(false);
        return;
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          updateLastAssistantMessage(currentSession.id, accumulated);
        }
        logOutput(userText, accumulated);
      } else {
        const data = await response.json();
        const formatted =
          typeof data === "string" ? data : JSON.stringify(data, null, 2);
        updateLastAssistantMessage(currentSession.id, formatted);
        logOutput(userText, formatted);
      }
    } catch {
      updateLastAssistantMessage(
        currentSession.id,
        "Error: Connection failed. Please check your network.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    customPrompt,
    loading,
    itemId,
    context,
    itemTitle,
    getOrCreateSession,
    addMessage,
    updateLastAssistantMessage,
    buildContextualPrompt,
  ]);

  const handleClearChat = useCallback(() => {
    if (sessionId) {
      clearSession(sessionId);
    }
  }, [sessionId, clearSession]);

  return {
    // State
    available,
    collapsed,
    loading,
    activeAction,
    saveStatus,
    customPrompt,
    showHelpers,
    width,
    actions,
    evaluationActions,
    hasEvaluation,
    promptHelpers,
    messages,

    // Actions
    setCollapsed,
    setCustomPrompt,
    setShowHelpers,
    handleResizeStart,
    handleAction,
    handleSave,
    handleOpenInEditor,
    handleCustomPrompt,
    handleClearChat,
  };
}
