"use client";

import { useState, useCallback } from "react";
import { useInterviewStore } from "../store/interviewStore";
import { executeCode } from "../services/executionService";
import { evaluateCode } from "../lib/api";
import { EXECUTION_TIMEOUT } from "../lib/constants";

interface UseCodeExecutionReturn {
  isExecuting: boolean;
  runCode: () => Promise<void>;
  submitCode: () => Promise<void>;
}

/**
 * Hook for code execution and submission.
 * Triggers the web worker for test runs, manages loading state,
 * and handles code submission with evaluation.
 */
export function useCodeExecution(): UseCodeExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);

  const code = useInterviewStore((s) => s.code);
  const problem = useInterviewStore((s) => s.problem);
  const language = useInterviewStore((s) => s.language);
  const lastExecutionResult = useInterviewStore((s) => s.lastExecutionResult);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);
  const setEvaluation = useInterviewStore((s) => s.setEvaluation);
  const pauseTimer = useInterviewStore((s) => s.pauseTimer);

  /**
   * Run code against visible test cases without submitting.
   * Sets isExecuting to disable buttons during execution.
   */
  const runCode = useCallback(async () => {
    if (!problem || isExecuting) return;

    setIsExecuting(true);

    try {
      const testCases = problem.samples.map((sample) => ({
        input: sample.input,
        expectedOutput: sample.output,
      }));

      const result = await executeCode({
        code,
        language,
        testCases,
        timeout: EXECUTION_TIMEOUT,
      });

      // Update store with execution result and increment count
      useInterviewStore.setState((state) => ({
        lastExecutionResult: result,
        executionCount: state.executionCount + 1,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Code execution failed";
      useInterviewStore.setState({
        lastExecutionResult: {
          consoleOutput: "",
          testResults: [],
          executionTimeMs: 0,
          memoryUsageMb: 0,
          error: { type: "runtime", message },
        },
      });
    } finally {
      setIsExecuting(false);
    }
  }, [code, problem, language, isExecuting]);

  /**
   * Submit code for AI evaluation.
   * Caller should show confirmation dialog before calling this.
   * Pauses timer, transitions to evaluating phase, calls evaluate API.
   */
  const submitCode = useCallback(async () => {
    if (!problem || isExecuting) return;

    setIsExecuting(true);
    pauseTimer();

    // Store submitted code
    useInterviewStore.setState({ submittedCode: code });
    setPhase("evaluating");
    setError(null);

    try {
      const { evaluation } = await evaluateCode({
        code,
        problem,
        language,
        testResults: lastExecutionResult ?? undefined,
      });

      setEvaluation(evaluation);
      setPhase("follow-up");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      setError(message);
      setPhase("error");
    } finally {
      setIsExecuting(false);
    }
  }, [
    code,
    problem,
    language,
    lastExecutionResult,
    isExecuting,
    pauseTimer,
    setPhase,
    setError,
    setEvaluation,
  ]);

  return { isExecuting, runCode, submitCode };
}
