/**
 * Execution service that manages Web Worker lifecycle.
 * Creates worker, posts code + test cases, listens for results,
 * and enforces timeout via setTimeout + worker.terminate().
 */

import type { ExecutionRequest, ExecutionResult, TestCase } from '../lib/types';
import { EXECUTION_TIMEOUT, MAX_OUTPUT_LENGTH } from '../lib/constants';

interface WorkerRequest {
  code: string;
  testCases: TestCase[];
  maxOutputLength: number;
}

/**
 * Executes user code in a Web Worker with timeout enforcement.
 * Returns an ExecutionResult with console output, test results, timing, and any errors.
 */
export function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const timeout = request.timeout || EXECUTION_TIMEOUT;

  return new Promise<ExecutionResult>((resolve) => {
    let worker: Worker;
    let settled = false;

    try {
      // Create worker from the bundled worker file
      worker = new Worker(
        new URL('./executionWorker.ts', import.meta.url)
      );
    } catch (error) {
      // If Worker creation fails (e.g., SSR environment)
      resolve({
        consoleOutput: '',
        testResults: [],
        executionTimeMs: 0,
        memoryUsageMb: 0,
        error: {
          type: 'runtime',
          message: `Failed to create execution worker: ${(error as Error).message}`,
        },
      });
      return;
    }

    // Listen for results from the worker
    worker.onmessage = (event: MessageEvent<ExecutionResult>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(event.data);
    };

    // Handle worker errors
    worker.onerror = (event: ErrorEvent) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      resolve({
        consoleOutput: '',
        testResults: [],
        executionTimeMs: 0,
        memoryUsageMb: 0,
        error: {
          type: 'runtime',
          message: event.message || 'An unexpected worker error occurred',
        },
      });
    };

    // Enforce timeout — terminate worker if execution exceeds the limit
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve({
        consoleOutput: '',
        testResults: request.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: undefined,
          passed: false,
          executionTimeMs: timeout,
        })),
        executionTimeMs: timeout,
        memoryUsageMb: 0,
        error: {
          type: 'timeout',
          message: `Execution timed out after ${timeout}ms`,
        },
      });
    }, timeout);

    // Post the execution request to the worker
    const workerRequest: WorkerRequest = {
      code: request.code,
      testCases: request.testCases,
      maxOutputLength: MAX_OUTPUT_LENGTH,
    };

    worker.postMessage(workerRequest);
  });
}

/**
 * Truncates output string at the configured maximum length.
 * Used by components that display execution output.
 */
export function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_LENGTH) return output;
  return output.slice(0, MAX_OUTPUT_LENGTH) + '\n... [output truncated at 10,000 characters]';
}
