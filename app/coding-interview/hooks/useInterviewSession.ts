"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInterviewStore } from "../store/interviewStore";
import { validateInterviewProps } from "../lib/validation";
import { generateProblem } from "../lib/api";
import type { InterviewModuleProps, InterviewPhase } from "../lib/types";

const MAX_RETRIES = 3;

/** Sources that can generate without context (they don't require specific metadata). */
const CONTEXT_OPTIONAL_SOURCES = new Set([
  "practice",
  "interview",
  "self-test",
]);

interface UseInterviewSessionReturn {
  phase: InterviewPhase;
  error: string | null;
  needsPrompt: boolean;
  retry: () => void;
  startWithPrompt: (userPrompt: string) => void;
}

/**
 * Main lifecycle orchestration hook.
 * Validates props on mount, generates problem, manages phase transitions.
 * If no context is provided for practice/interview/self-test sources, waits for user prompt.
 * Retries up to 3 times on generation failure.
 */
export function useInterviewSession(
  props: InterviewModuleProps,
): UseInterviewSessionReturn {
  const phase = useInterviewStore((s) => s.phase);
  const error = useInterviewStore((s) => s.error);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);
  const setProblem = useInterviewStore((s) => s.setProblem);
  const resumeTimer = useInterviewStore((s) => s.resumeTimer);

  const [needsPrompt, setNeedsPrompt] = useState(false);
  const generatingRef = useRef(false);
  const userPromptRef = useRef<string | undefined>(undefined);

  const doGenerate = useCallback(async () => {
    // Prevent concurrent generation calls
    if (generatingRef.current) {
      console.log(
        "[useInterviewSession] doGenerate skipped — already generating",
      );
      return;
    }
    generatingRef.current = true;

    const currentProps = props;
    console.log("[useInterviewSession] doGenerate called", {
      source: currentProps.source,
      context: currentProps.context,
      language: currentProps.language,
      difficulty: currentProps.difficulty,
      userPrompt: userPromptRef.current,
    });

    // Validate props
    const validation = validateInterviewProps(currentProps);
    if (!validation.valid) {
      console.log("[useInterviewSession] validation failed:", validation.error);
      setError(validation.error || "Invalid interview configuration");
      setPhase("error");
      generatingRef.current = false;
      return;
    }

    // Begin generation
    setPhase("generating");
    setError(null);

    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      attempts++;
      console.log(
        `[useInterviewSession] generation attempt ${attempts}/${MAX_RETRIES}`,
      );
      try {
        const problem = await generateProblem({
          source: currentProps.source,
          context: currentProps.context,
          language: currentProps.language || "javascript",
          difficulty: currentProps.difficulty,
          userPrompt: userPromptRef.current,
        });

        console.log("[useInterviewSession] generation success:", problem.title);
        // Success — set problem, start coding phase
        setProblem(problem);
        setPhase("coding");
        resumeTimer();
        generatingRef.current = false;
        return;
      } catch (err: unknown) {
        console.error(
          `[useInterviewSession] generation attempt ${attempts} failed:`,
          err,
        );
        if (attempts >= MAX_RETRIES) {
          const message =
            err instanceof Error
              ? err.message
              : "Problem generation failed after multiple attempts";
          setError(message);
          setPhase("error");
          generatingRef.current = false;
          return;
        }
        // Wait briefly before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    generatingRef.current = false;
  }, [props, setPhase, setError, setProblem, resumeTimer]);

  // Trigger on mount and whenever phase becomes 'initializing'
  useEffect(() => {
    console.log(
      "[useInterviewSession] effect fired — phase:",
      phase,
      "context:",
      props.context,
      "source:",
      props.source,
    );

    // Act on 'initializing' OR 'generating' (stale persisted state from interrupted session)
    if (phase !== "initializing" && phase !== "generating") {
      console.log(
        "[useInterviewSession] phase is not initializing/generating, skipping",
      );
      return;
    }

    // If phase is 'generating' but we're not actually generating, restart
    if (phase === "generating" && generatingRef.current) {
      console.log("[useInterviewSession] already generating, skipping");
      return;
    }

    // If no context provided and source allows freeform, ask user for prompt
    if (!props.context && CONTEXT_OPTIONAL_SOURCES.has(props.source)) {
      console.log(
        "[useInterviewSession] no context + optional source → showing prompt",
      );
      setNeedsPrompt(true);
      return;
    }

    // Has context — generate immediately
    console.log("[useInterviewSession] has context → calling doGenerate");
    doGenerate();
  }, [phase, props.context, props.source, doGenerate]);

  /**
   * Start generation with a user-provided prompt.
   */
  const startWithPrompt = useCallback(
    (userPrompt: string) => {
      console.log("[useInterviewSession] startWithPrompt called:", userPrompt);
      userPromptRef.current = userPrompt;
      setNeedsPrompt(false);
      doGenerate();
    },
    [doGenerate],
  );

  /**
   * Retry after failure.
   */
  const retry = useCallback(() => {
    generatingRef.current = false;
    doGenerate();
  }, [doGenerate]);

  return { phase, error, needsPrompt, retry, startWithPrompt };
}
