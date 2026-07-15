/**
 * POST /api/ai/problem/regenerate-harness
 *
 * Given a problem's metadata and boilerplate, generates (or regenerates) the
 * harness code (__deserialize + __serialize + class definitions) needed for
 * proper test case execution with custom data structures.
 *
 * Body: {
 *   problemId: string,
 *   variationId?: string,
 *   title: string,
 *   description: string,
 *   constraints: string[],
 *   boilerplate: string,
 *   inputFormat?: string,
 *   outputFormat?: string,
 *   examples: { input: string; expectedOutput: string }[],
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

interface RequestBody {
  problemId: string;
  variationId?: string;
  title: string;
  description: string;
  constraints: string[];
  boilerplate: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: { input: string; expectedOutput: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.problemId || !body.boilerplate) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, boilerplate" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/problem/validate-test-cases");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildHarnessPrompt(body);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse the response
    const harness = parseHarnessResponse(raw);

    if (!harness) {
      return NextResponse.json(
        { error: "Failed to generate valid harness code" },
        { status: 502 },
      );
    }

    // Save harness to description.json
    const workspacePath = getWorkspacePath();
    const problemRepo = new FileProblemRepository(workspacePath);
    const desc = await problemRepo.getDescription(body.problemId);

    if (desc) {
      if (body.variationId && desc.variations) {
        const updatedVariations = desc.variations.map((v) =>
          v.id === body.variationId ? { ...v, harness } : v
        );
        await problemRepo.saveDescription(body.problemId, {
          ...desc,
          variations: updatedVariations,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await problemRepo.saveDescription(body.problemId, {
          ...desc,
          harness,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ harness });
  } catch (err) {
    console.error("[regenerate-harness]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildHarnessPrompt(body: RequestBody): string {
  const examplesStr = body.examples
    .slice(0, 3)
    .map((ex, i) => `  ${i + 1}. Input: ${ex.input} → Expected: ${ex.expectedOutput}`)
    .join("\n");

  return `You are a senior software engineer. Generate the execution harness code for a coding problem.

Problem: ${body.title}
Description: ${body.description.slice(0, 1000)}
Constraints: ${body.constraints.join("; ")}
${body.inputFormat ? `Input Format: ${body.inputFormat}` : ""}
${body.outputFormat ? `Output Format: ${body.outputFormat}` : ""}

Solution function signature (what the user writes their code in):
\`\`\`typescript
${body.boilerplate}
\`\`\`

Example test cases:
${examplesStr}

Generate the HARNESS code that will be prepended (hidden) before the user's solution at execution time.
The harness must include:
1. All class/type definitions referenced in the function signature (e.g., ListNode, TreeNode, etc.)
2. A \`__deserialize(input)\` function that converts the raw test case input array into the arguments the solution function expects
3. A \`__serialize(output)\` function that converts the solution's return value back to plain JSON for comparison with expectedOutput

RULES:
- The test case "input" field uses named parameter format like "head = [3,2,0,-4], pos = 1" which gets parsed into an array of values: [[3,2,0,-4], 1]
- __deserialize receives this parsed array and must return an array of arguments to spread into the solution function
- __serialize receives the raw return value and must convert it to the JSON value that expectedOutput represents
- For linked list problems: arrays represent node values in order. If a "pos" parameter exists, it indicates a cycle position.
- For tree problems: arrays are level-order BFS (LeetCode style). null means missing child.
- Handle edge cases (empty input, null, single element)
- The harness code must be valid TypeScript

IMPORTANT: Return ONLY the TypeScript code. No markdown fences, no explanation, no JSON wrapper. Just the raw code that will be prepended before the user's function.

Example output for a linked list reversal problem:
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) { this.val = val; this.next = next; }
}

function __deserialize(input: [number[]]): [ListNode | null] {
  const arr = input[0];
  if (!arr || arr.length === 0) return [null];
  const head = new ListNode(arr[0]);
  let cur = head;
  for (let i = 1; i < arr.length; i++) { cur.next = new ListNode(arr[i]); cur = cur.next; }
  return [head];
}

function __serialize(output: ListNode | null): number[] {
  const result: number[] = [];
  let cur = output;
  while (cur) { result.push(cur.val); cur = cur.next; }
  return result;
}`;
}

function parseHarnessResponse(raw: string): string | null {
  let code = raw.trim();

  // Strip markdown fences if present
  if (code.startsWith("```typescript") || code.startsWith("```ts")) {
    code = code.replace(/^```(?:typescript|ts)\s*\n?/, "");
  } else if (code.startsWith("```")) {
    code = code.replace(/^```\s*\n?/, "");
  }
  if (code.endsWith("```")) {
    code = code.slice(0, -3).trim();
  }

  // Basic validation: must contain __deserialize or at least a class definition
  if (!code.includes("__deserialize") && !code.includes("class ")) {
    return null;
  }

  return code;
}
