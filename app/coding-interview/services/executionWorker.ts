/**
 * Web Worker for sandboxed code execution.
 * Runs user code via Function constructor, captures console.log output,
 * and posts results back to the main thread.
 *
 * Uses self.onmessage pattern for Next.js bundling compatibility.
 *
 * DATA STRUCTURE SUPPORT:
 * The worker supports arbitrary data structures via a harness convention:
 * - If user code defines `__deserialize(input)`, it's called to convert raw
 *   JSON test inputs into the data structures the solution function expects.
 * - If user code defines `__serialize(output)`, it's called to convert the
 *   function's return value back to plain JSON for comparison with expectedOutput.
 * - If neither is defined, inputs are spread as-is and output is compared directly.
 *
 * The AI prompt instructs the model to generate these helpers as part of the
 * boilerplate for any problem involving custom data structures.
 */

/// <reference lib="webworker" />

import { deepEqual } from "./deepEqual";
import { transform } from "sucrase";

/* ─── Interfaces ─────────────────────────────────────────── */

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

/* ─── Utilities ──────────────────────────────────────────── */

function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) return output;
  return (
    output.slice(0, maxLength) + "\n... [output truncated at 10,000 characters]"
  );
}

function extractLineNumber(error: Error): number | undefined {
  const stack = error.stack || "";
  const match =
    stack.match(/<anonymous>:(\d+)/) ||
    stack.match(/Function:(\d+)/) ||
    stack.match(/eval.*:(\d+)/);
  if (match) {
    return Math.max(1, parseInt(match[1], 10) - 2);
  }
  return undefined;
}

function getMemoryUsageMb(): number {
  const perf = self.performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  if (perf.memory) {
    return Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
  }
  return 0;
}

/* ─── Main Handler ───────────────────────────────────────── */

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let userFunction: Function;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let deserializeFn: Function | null = null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let serializeFn: Function | null = null;

    // Extract all top-level function names from the code
    const declaredFnNames: string[] = [];
    const fnDeclRegex = /(?:^|\n)\s*(?:export\s+)?function\s+([a-zA-Z_$]\w*)/g;
    let fnMatch;
    while ((fnMatch = fnDeclRegex.exec(jsCode)) !== null) {
      declaredFnNames.push(fnMatch[1]);
    }
    // Also check for const/let/var arrow functions
    const arrowFnRegex = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$]\w*)\s*=/g;
    while ((fnMatch = arrowFnRegex.exec(jsCode)) !== null) {
      declaredFnNames.push(fnMatch[1]);
    }

    // Filter out harness functions from the solution function lookup
    const solutionFnNames = declaredFnNames.filter(
      (n) => n !== "__deserialize" && n !== "__serialize"
    );

    // Build a return statement that finds the user's function + harness
    const fnLookup = solutionFnNames.length > 0
      ? solutionFnNames.map((n) => `if (typeof ${n} === "function") return ${n};`).join("\n")
      : "";

    // Execute code and extract functions
    const extractCode = jsCode +
      '\nvar __result = { fn: null, deserialize: null, serialize: null };\n' +
      'if (typeof __deserialize === "function") __result.deserialize = __deserialize;\n' +
      'if (typeof __serialize === "function") __result.serialize = __serialize;\n' +
      'if (typeof solution === "function") { __result.fn = solution; return __result; }\n' +
      fnLookup.replace(/return ([^;]+);/g, '__result.fn = $1; return __result;') +
      "\nreturn __result;";

    let extracted: { fn: Function | null; deserialize: Function | null; serialize: Function | null } | null = null;

    try {
      extracted = new Function(extractCode)();
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

    // Extract function references
    if (extracted && typeof extracted === "object" && extracted.fn) {
      userFunction = extracted.fn;
      deserializeFn = extracted.deserialize;
      serializeFn = extracted.serialize;
    } else {
      // Fallback: try older extraction methods
      try {
        userFunction = new Function(jsCode + "\nreturn solution;")();
      } catch {
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
        // Deserialize inputs: if __deserialize exists, use it to convert raw input
        // Otherwise, spread the input array as function arguments
        let args: unknown[];
        if (deserializeFn) {
          const deserialized = deserializeFn(testCase.input);
          args = Array.isArray(deserialized) ? deserialized : [deserialized];
        } else {
          args = Array.isArray(testCase.input)
            ? testCase.input
            : [testCase.input];
        }

        const rawOutput = userFunction(...args);

        // Serialize output: if __serialize exists, use it to convert back to JSON
        const actualOutput = serializeFn ? serializeFn(rawOutput) : rawOutput;

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
