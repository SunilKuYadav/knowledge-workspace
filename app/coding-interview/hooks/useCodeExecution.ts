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
  const harness = useInterviewStore((s) => s.harness);
  const problem = useInterviewStore((s) => s.problem);
  const language = useInterviewStore((s) => s.language);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);
  const setEvaluation = useInterviewStore((s) => s.setEvaluation);
  const pauseTimer = useInterviewStore((s) => s.pauseTimer);

  /**
   * Run code against visible test cases without submitting.
   * Uses the first few hidden test cases (which have structured input)
   * since samples are display-only strings.
   * Sets isExecuting to disable buttons during execution.
   */
  const runCode = useCallback(async () => {
    if (!problem || isExecuting) return;

    setIsExecuting(true);

    try {
      // Use hidden test cases (structured format with actual function args)
      // Show first 3 for quick feedback on "Run"
      const testCases = problem.hiddenTestCases.slice(0, 3).map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));

      const result = await executeCode({
        code: harness ? harness + "\n" + code : code,
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
  }, [code, harness, problem, language, isExecuting]);

  /**
   * Submit code for AI evaluation.
   * Runs all hidden test cases first, then sends results to AI for evaluation.
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
      // Run all hidden test cases for evaluation
      const testCases = problem.hiddenTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));

      const execResult = await executeCode({
        code: harness ? harness + "\n" + code : code,
        language,
        testCases,
        timeout: EXECUTION_TIMEOUT,
      });

      // Update store with full execution result
      useInterviewStore.setState({ lastExecutionResult: execResult });

      const { evaluation } = await evaluateCode({
        code,
        problem,
        language,
        testResults: execResult,
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
    harness,
    problem,
    language,
    isExecuting,
    pauseTimer,
    setPhase,
    setError,
    setEvaluation,
  ]);

  return { isExecuting, runCode, submitCode };
}
