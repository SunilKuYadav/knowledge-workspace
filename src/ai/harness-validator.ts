/**
 * Harness Validator
 *
 * Post-generation validation that ensures test case inputs are compatible
 * with the harness's __deserialize function signature.
 *
 * Instead of relying on AI prompt examples for every data structure edge case
 * (cycle detection, random pointers, etc.), this module programmatically
 * validates compatibility and surfaces mismatches.
 *
 * The approach:
 * 1. Parse __deserialize's input type from the harness code
 * 2. Infer expected argument count and shape
 * 3. Validate each test case's input matches the expected shape
 * 4. Return diagnostics for any mismatches
 */

export interface HarnessValidationResult {
  valid: boolean;
  expectedArgCount: number | null;
  paramNames: string[];
  issues: HarnessIssue[];
}

export interface HarnessIssue {
  index: number;
  input: unknown;
  message: string;
  severity: "error" | "warning";
}

/**
 * Parse the __deserialize function's input tuple type from harness code.
 * Returns info about expected input shape.
 *
 * Examples:
 * - `__deserialize(input: [number[]])` → { argCount: 1, paramNames: [] }
 * - `__deserialize(input: [number[], number])` → { argCount: 2, paramNames: [] }
 * - `__deserialize(input: [number[], number?])` → { argCount: 2, optionalFrom: 1, paramNames: [] }
 */
function parseDeserializeSignature(harness: string): {
  argCount: number;
  optionalFrom: number | null;
  tupleTypes: string[];
} | null {
  // Match __deserialize function signature with tuple type
  // Handles: function __deserialize(input: [type1, type2, ...])
  const match = harness.match(
    /function\s+__deserialize\s*\(\s*\w+\s*:\s*\[([^\]]+)\]/,
  );
  if (!match) return null;

  const tupleContent = match[1];
  // Split by top-level commas (not inside nested brackets)
  const tupleTypes = splitTopLevelCommas(tupleContent);

  let optionalFrom: number | null = null;
  for (let i = 0; i < tupleTypes.length; i++) {
    if (tupleTypes[i].includes("?")) {
      if (optionalFrom === null) optionalFrom = i;
    }
  }

  return {
    argCount: tupleTypes.length,
    optionalFrom,
    tupleTypes,
  };
}

/**
 * Split a string by commas that are not inside angle brackets, square brackets, or parens.
 */
function splitTopLevelCommas(input: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of input) {
    if (char === "<" || char === "[" || char === "(") {
      depth++;
      current += char;
    } else if (char === ">" || char === "]" || char === ")") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      results.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) results.push(current.trim());

  return results;
}

/**
 * Extract parameter names from the harness code by looking at destructuring
 * in __deserialize. E.g.: `const [arr, pos] = input;` → ["arr", "pos"]
 */
function extractParamNames(harness: string): string[] {
  // Look for destructuring: const [name1, name2] = input; or const [name1, name2] = input[0];
  const destructureMatch = harness.match(
    /(?:const|let|var)\s+\[([^\]]+)\]\s*=\s*input/,
  );
  if (destructureMatch) {
    return destructureMatch[1].split(",").map((s) => s.trim());
  }
  return [];
}

/**
 * Validate that test case inputs are compatible with the harness's __deserialize function.
 *
 * @param harness - The harness code string containing __deserialize
 * @param testCases - Array of test cases with input field (can be string or structured)
 * @param format - "structured" for hiddenTestCases (already JSON), "string" for display test cases
 */
export function validateTestCasesAgainstHarness(
  harness: string | undefined | null,
  testCases: Array<{ input: unknown; expectedOutput?: unknown }>,
  format: "structured" | "string" = "string",
): HarnessValidationResult {
  // No harness = no validation needed (simple problems)
  if (!harness) {
    return { valid: true, expectedArgCount: null, paramNames: [], issues: [] };
  }

  const sig = parseDeserializeSignature(harness);
  if (!sig) {
    return {
      valid: true,
      expectedArgCount: null,
      paramNames: [],
      issues: [
        {
          index: -1,
          input: null,
          message:
            "Could not parse __deserialize signature from harness. Skipping validation.",
          severity: "warning",
        },
      ],
    };
  }

  const paramNames = extractParamNames(harness);
  const issues: HarnessIssue[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    if (format === "structured") {
      // For hiddenTestCases: input should be a JSON array matching tuple length
      if (!Array.isArray(tc.input)) {
        issues.push({
          index: i,
          input: tc.input,
          message: `Input must be a JSON array matching __deserialize's tuple type [${sig.tupleTypes.join(", ")}], got ${typeof tc.input}`,
          severity: "error",
        });
        continue;
      }

      const inputArr = tc.input as unknown[];
      const minArgs = sig.optionalFrom ?? sig.argCount;

      if (inputArr.length < minArgs) {
        issues.push({
          index: i,
          input: tc.input,
          message: `Input has ${inputArr.length} element(s) but __deserialize expects at least ${minArgs} (tuple: [${sig.tupleTypes.join(", ")}])`,
          severity: "error",
        });
      } else if (inputArr.length > sig.argCount) {
        issues.push({
          index: i,
          input: tc.input,
          message: `Input has ${inputArr.length} element(s) but __deserialize expects at most ${sig.argCount} (tuple: [${sig.tupleTypes.join(", ")}])`,
          severity: "error",
        });
      }
    } else {
      // For string-format test cases: count named params and verify against tuple length
      if (typeof tc.input !== "string") continue;

      const inputStr = tc.input as string;
      const namedParamPattern = /[a-zA-Z_]\w*\s*=/g;
      const matches = inputStr.match(namedParamPattern);
      const paramCount = matches ? matches.length : 0;

      if (paramCount === 0) continue; // Can't validate non-named format

      const minArgs = sig.optionalFrom ?? sig.argCount;

      if (paramCount < minArgs) {
        issues.push({
          index: i,
          input: tc.input,
          message: `Input has ${paramCount} named param(s) but __deserialize expects at least ${minArgs}. Missing params: ${paramNames.slice(paramCount).join(", ") || sig.tupleTypes.slice(paramCount).join(", ")}`,
          severity: "error",
        });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    expectedArgCount: sig.argCount,
    paramNames,
    issues,
  };
}

/**
 * Build a concise harness context string to include in AI prompts when
 * generating or fixing test cases. This gives the AI the exact input shape
 * it needs to target, derived from the harness code itself.
 *
 * This replaces the need for every possible example in the prompt.
 */
export function buildHarnessContextForPrompt(harness: string): string {
  const sig = parseDeserializeSignature(harness);
  const paramNames = extractParamNames(harness);

  if (!sig) return "";

  const paramDesc = sig.tupleTypes
    .map((type, i) => {
      const name = paramNames[i] || `arg${i}`;
      const optional = type.includes("?") ? " (optional)" : "";
      return `  - ${name}: ${type.replace("?", "")}${optional}`;
    })
    .join("\n");

  return `
HARNESS INPUT CONTRACT:
The __deserialize function expects input as a tuple: [${sig.tupleTypes.join(", ")}]
Parameters:
${paramDesc}

For string-format test cases, use named params matching these:
  Example: "${paramNames.map((n, i) => `${n} = <${sig.tupleTypes[i].replace("?", "")}>`).join(", ")}"

For structured (hiddenTestCases), input must be a JSON array:
  Example: [<${sig.tupleTypes.map((t) => t.replace("?", "")).join(">, <")}>]
`;
}
