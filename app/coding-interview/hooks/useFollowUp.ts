"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useInterviewStore } from "../store/interviewStore";
import { requestFollowUp, requestScore } from "../lib/api";

interface UseFollowUpReturn {
  isLoading: boolean;
  sendResponse: (text: string) => Promise<void>;
  endDiscussion: () => Promise<void>;
}

/**
 * Hook for managing the follow-up interview conversation.
 * Requests opening question on mount, manages conversation flow,
 * handles completion signal, and triggers scoring.
 */
export function useFollowUp(): UseFollowUpReturn {
  const [isLoading, setIsLoading] = useState(false);
  const initRef = useRef(false);

  const phase = useInterviewStore((s) => s.phase);
  const problem = useInterviewStore((s) => s.problem);
  const code = useInterviewStore((s) => s.submittedCode ?? s.code);
  const evaluation = useInterviewStore((s) => s.evaluation);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);
  const addConversationMessage = useInterviewStore(
    (s) => s.addConversationMessage,
  );
  const setScore = useInterviewStore((s) => s.setScore);
  const setSummary = useInterviewStore((s) => s.setSummary);

  /**
   * Requests the final score and transitions to summary phase.
   */
  const performScoring = useCallback(async () => {
    if (!problem || !evaluation) return;

    setPhase("scoring");
    setIsLoading(true);

    try {
      const currentState = useInterviewStore.getState();
      const { scoringReport, sessionSummary } = await requestScore({
        problem,
        code,
        evaluation,
        conversationHistory: currentState.conversationHistory,
        hintsUsed: currentState.hintsUsed,
        executionCount: currentState.executionCount,
        elapsedSeconds: currentState.elapsedSeconds,
        duration: currentState.duration,
      });

      setScore(scoringReport);
      setSummary(sessionSummary);
      setPhase("summary");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scoring failed";
      setError(message);
      setPhase("error");
    } finally {
      setIsLoading(false);
    }
  }, [problem, evaluation, code, setPhase, setScore, setSummary, setError]);

  /**
   * Request the opening follow-up question when entering the follow-up phase.
   */
  useEffect(() => {
    if (phase !== "follow-up" || initRef.current) return;
    if (!problem || !evaluation) return;

    initRef.current = true;

    const fetchOpening = async () => {
      setIsLoading(true);
      try {
        const result = await requestFollowUp({
          problem,
          code,
          evaluation,
          conversationHistory: [],
        });

        if (result.complete) {
          // AI signaled no follow-up needed — proceed to scoring
          await performScoring();
        } else if (result.question) {
          addConversationMessage({
            role: "interviewer",
            content: result.question,
            timestamp: Date.now(),
          });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to start follow-up discussion";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpening();
  }, [
    phase,
    problem,
    evaluation,
    code,
    addConversationMessage,
    setError,
    performScoring,
  ]);

  /**
   * Send user's response in the follow-up conversation.
   * If AI signals completion, transitions to scoring.
   */
  const sendResponse = useCallback(
    async (text: string) => {
      if (!problem || !evaluation || isLoading) return;

      // Add candidate message to store
      addConversationMessage({
        role: "candidate",
        content: text,
        timestamp: Date.now(),
      });

      setIsLoading(true);

      try {
        const currentHistory = useInterviewStore.getState().conversationHistory;

        const result = await requestFollowUp({
          problem,
          code,
          evaluation,
          conversationHistory: currentHistory,
          userResponse: text,
        });

        if (result.complete) {
          // Interview concluded — proceed to scoring
          await performScoring();
        } else if (result.question) {
          addConversationMessage({
            role: "interviewer",
            content: result.question,
            timestamp: Date.now(),
          });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to get follow-up response";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      problem,
      evaluation,
      code,
      isLoading,
      addConversationMessage,
      setError,
      performScoring,
    ],
  );

  /**
   * End the discussion early and proceed to scoring.
   */
  const endDiscussion = useCallback(async () => {
    await performScoring();
  }, [performScoring]);

  return { isLoading, sendResponse, endDiscussion };
}
