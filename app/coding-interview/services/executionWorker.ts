/**
 * Web Worker for sandboxed code execution.
 * Runs user code via Function constructor, captures console.log output,
 * and posts results back to the main thread.
 *
 * Uses self.onmessage pattern for Next.js bundling compatibility.
 */

/// <reference lib="webworker" />

import { deepEqual } from "./deepEqual";
import { transform } from "sucrase";

interface WorkerTestCase {
  input: unknown;
  expectedOutput: unknown;
}

interface WorkerRequest {
  code: string;
  testCases: WorkerTestCase[];
  maxOutputLength: number;
}

interface WorkerTestCaseResult {
  input: unknown;
  expectedOutput: unknown;
  actualOutput: unknown;
  passed: boolean;
  executionTimeMs: number;
}

interface WorkerExecutionError {
  type: "syntax" | "runtime" | "timeout";
  message: string;
  line?: number;
  stack?: string;
}

interface WorkerResponse {
  consoleOutput: string;
  testResults: WorkerTestCaseResult[];
  executionTimeMs: number;
  memoryUsageMb: number;
  error?: WorkerExecutionError;
}

function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) return output;
  return (
    output.slice(0, maxLength) + "\n... [output truncated at 10,000 characters]"
  );
}

function extractLineNumber(error: Error): number | undefined {
  const stack = error.stack || "";
  // Look for line numbers in anonymous function or eval contexts
  const match =
    stack.match(/<anonymous>:(\d+)/) ||
    stack.match(/Function:(\d+)/) ||
    stack.match(/eval.*:(\d+)/);
  if (match) {
    // Subtract 1 to account for the wrapping function header line
    return Math.max(1, parseInt(match[1], 10) - 2);
  }
  return undefined;
}

function getMemoryUsageMb(): number {
  // Use performance.memory if available (Chrome/Chromium-based)
  const perf = self.performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  if (perf.memory) {
    return Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
  }
  return 0;
}

self.onmessage = function (event: MessageEvent<WorkerRequest>) {
  const { code, testCases, maxOutputLength } = event.data;
  const startTime = performance.now();
  const consoleOutput: string[] = [];

  // Strip TypeScript type annotations to produce valid JavaScript
  let jsCode: string;
  try {
    const result = transform(code, {
      transforms: ["typescript"],
      disableESTransforms: true,
    });
    jsCode = result.code;
  } catch {
    // If stripping fails, try running as-is (may already be JS)
    jsCode = code;
  }

  // Override console.log to capture output
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    const line = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");
    consoleOutput.push(line);
  };

  const response: WorkerResponse = {
    consoleOutput: "",
    testResults: [],
    executionTimeMs: 0,
    memoryUsageMb: 0,
  };

  try {
    // First, try to create the function to catch syntax errors
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let userFunction: Function;

    // Extract all top-level function names from the code to find the user's function
    const declaredFnNames: string[] = [];
    const fnDeclRegex = /(?:^|\n)\s*(?:export\s+)?function\s+([a-zA-Z_$]\w*)/g;
    let fnMatch;
    while ((fnMatch = fnDeclRegex.exec(jsCode)) !== null) {
      declaredFnNames.push(fnMatch[1]);
    }
    // Also check for const/let/var arrow functions: const foo = (...) =>
    const arrowFnRegex = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$]\w*)\s*=/g;
    while ((fnMatch = arrowFnRegex.exec(jsCode)) !== null) {
      declaredFnNames.push(fnMatch[1]);
    }

    // Build a return statement that finds the user's function
    const fnLookup = declaredFnNames.length > 0
      ? declaredFnNames.map((n) => `if (typeof ${n} === "function") return ${n};`).join("\n")
      : "";

    try {
      userFunction = new Function(
        jsCode +
          '\nif (typeof solution === "function") return solution;\n' +
          fnLookup +
          "\nreturn null;",
      )();
    } catch (syntaxError) {
      const err = syntaxError as Error;
      const line = extractLineNumber(err);
      response.error = {
        type: "syntax",
        message: err.message,
        line,
        stack: err.stack,
      };
      response.executionTimeMs =
        Math.round((performance.now() - startTime) * 100) / 100;
      response.memoryUsageMb = getMemoryUsageMb();
      response.consoleOutput = truncateOutput(
        consoleOutput.join("\n"),
        maxOutputLength,
      );
      console.log = originalLog;
      self.postMessage(response);
      return;
    }

    // If no function was found, try to extract it differently
    if (!userFunction) {
      try {
        // Try wrapping the code and looking for the exported function
        userFunction = new Function(jsCode + "\nreturn solution;")();
      } catch {
        // If still no function, run the code and try to get the last expression
        try {
          userFunction = new Function("return " + jsCode)();
        } catch {
          response.error = {
            type: "runtime",
            message:
              'No executable function found in submitted code. Define a function (e.g., "function solution(...) { }").',
          };
          response.executionTimeMs =
            Math.round((performance.now() - startTime) * 100) / 100;
          response.memoryUsageMb = getMemoryUsageMb();
          response.consoleOutput = truncateOutput(
            consoleOutput.join("\n"),
            maxOutputLength,
          );
          console.log = originalLog;
          self.postMessage(response);
          return;
        }
      }
    }

    // Run each test case independently
    for (const testCase of testCases) {
      const testStart = performance.now();
      try {
        const input = Array.isArray(testCase.input)
          ? testCase.input
          : [testCase.input];
        const actualOutput = userFunction(...input);
        const testTimeMs =
          Math.round((performance.now() - testStart) * 100) / 100;
        const passed = deepEqual(actualOutput, testCase.expectedOutput);

        response.testResults.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          passed,
          executionTimeMs: testTimeMs,
        });
      } catch (runtimeError) {
        const err = runtimeError as Error;
        const testTimeMs =
          Math.round((performance.now() - testStart) * 100) / 100;

        response.testResults.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: undefined,
          passed: false,
          executionTimeMs: testTimeMs,
        });

        // Record the runtime error but continue with other test cases
        if (!response.error) {
          response.error = {
            type: "runtime",
            message: err.message,
            line: extractLineNumber(err),
            stack: err.stack,
          };
        }
      }
    }
  } catch (unexpectedError) {
    const err = unexpectedError as Error;
    response.error = {
      type: "runtime",
      message: err.message,
      line: extractLineNumber(err),
      stack: err.stack,
    };
  }

  response.executionTimeMs =
    Math.round((performance.now() - startTime) * 100) / 100;
  response.memoryUsageMb = getMemoryUsageMb();
  response.consoleOutput = truncateOutput(
    consoleOutput.join("\n"),
    maxOutputLength,
  );

  // Restore console.log
  console.log = originalLog;

  self.postMessage(response);
};
