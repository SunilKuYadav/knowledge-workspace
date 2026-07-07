import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatCode } from "../services/formatService";

describe("formatService", () => {
  describe("consistent 2-space indentation", () => {
    it("applies 2-space indentation for nested blocks", () => {
      const code = `function hello() {
const x = 1;
if (x) {
return x;
}
}`;
      const result = formatCode(code, "javascript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toBe(`function hello() {
  const x = 1;
  if (x) {
    return x;
  }
}`);
    });

    it("handles multiple levels of nesting", () => {
      const code = `class Foo {
constructor() {
this.items = [
1,
2,
3
];
}
}`;
      const result = formatCode(code, "typescript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toBe(`class Foo {
  constructor() {
    this.items = [
      1,
      2,
      3
    ];
  }
}`);
    });
  });

  describe("idempotence", () => {
    it("format(format(code)) === format(code) for simple function", () => {
      const code = `function add(a, b) {
      return a + b;
}`;
      const first = formatCode(code, "javascript");
      const second = formatCode(first.formatted, "javascript");
      expect(second.formatted).toBe(first.formatted);
    });

    it("format(format(code)) === format(code) for complex code", () => {
      const code = `
const arr = [1, 2, 3];
arr.forEach((item) => {
  console.log(item);
  if (item > 1) {
    console.log('big');
  }
});
`;
      const first = formatCode(code, "javascript");
      const second = formatCode(first.formatted, "javascript");
      expect(second.formatted).toBe(first.formatted);
    });

    it("already well-formatted code stays the same", () => {
      const code = `function greet(name) {
  return 'Hello ' + name;
}`;
      const result = formatCode(code, "javascript");
      expect(result.formatted).toBe(code);
    });
  });

  describe("syntax error handling", () => {
    it("returns original code unchanged on unbalanced braces", () => {
      const code = `function broken() {
  return 1;
`;
      const result = formatCode(code, "javascript");
      expect(result.formatted).toBe(code);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Formatting failed");
    });

    it("returns original code unchanged on JS syntax error", () => {
      const code = `function foo() { const = ; }`;
      const result = formatCode(code, "javascript");
      expect(result.formatted).toBe(code);
      expect(result.error).toBeDefined();
    });

    it("returns original code unchanged on unmatched closing bracket", () => {
      const code = `const x = }`;
      const result = formatCode(code, "javascript");
      expect(result.formatted).toBe(code);
      expect(result.error).toBeDefined();
    });
  });

  describe("language support", () => {
    it("handles TypeScript type annotations", () => {
      const code = `interface User {
name: string;
age: number;
}`;
      const result = formatCode(code, "typescript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toBe(`interface User {
  name: string;
  age: number;
}`);
    });

    it("handles TypeScript generics", () => {
      const code = `function identity<T>(arg: T): T {
return arg;
}`;
      const result = formatCode(code, "typescript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toContain("  return arg;");
    });

    it("handles JavaScript arrow functions", () => {
      const code = `const add = (a, b) => {
return a + b;
}`;
      const result = formatCode(code, "javascript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toBe(`const add = (a, b) => {
  return a + b;
}`);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = formatCode("", "javascript");
      expect(result.formatted).toBe("");
      expect(result.error).toBeUndefined();
    });

    it("handles whitespace-only string", () => {
      const result = formatCode("   \n  \n  ", "javascript");
      expect(result.formatted).toBe("   \n  \n  ");
      expect(result.error).toBeUndefined();
    });

    it("preserves strings containing brackets", () => {
      const code = `const s = "{ hello }";
console.log(s);`;
      const result = formatCode(code, "javascript");
      expect(result.error).toBeUndefined();
      // Should not change indentation due to brackets inside string
      expect(result.formatted).toBe(`const s = "{ hello }";
console.log(s);`);
    });

    it("preserves comments containing brackets", () => {
      const code = `// { this is a comment }
const x = 1;`;
      const result = formatCode(code, "javascript");
      expect(result.error).toBeUndefined();
      expect(result.formatted).toBe(`// { this is a comment }
const x = 1;`);
    });

    it("preserves trailing newline if original had one", () => {
      const code = `const x = 1;\n`;
      const result = formatCode(code, "javascript");
      expect(result.formatted.endsWith("\n")).toBe(true);
    });

    it("does not add trailing newline if original lacked one", () => {
      const code = `const x = 1;`;
      const result = formatCode(code, "javascript");
      expect(result.formatted.endsWith("\n")).toBe(false);
    });
  });
});

/**
 * Property-based tests for format service.
 *
 * **Validates: Requirements 2.8, 2.9**
 */
describe("formatService — property-based tests", () => {
  /* ─── Property 5: Format Idempotence ───────────────────── */
  describe("Property 5: Format idempotence", () => {
    it("format(format(code)).formatted === format(code).formatted for valid code", () => {
      // Generate syntactically valid JS code snippets with balanced braces
      const arbValidCode = fc.oneof(
        // Simple variable declarations
        fc
          .string({ minLength: 1, maxLength: 20 })
          .map(
            (name) => `const ${name.replace(/[^a-zA-Z]/g, "x") || "x"} = 1;`,
          ),
        // Function declarations
        fc
          .tuple(
            fc
              .string({ minLength: 1, maxLength: 10 })
              .map((n) => n.replace(/[^a-zA-Z]/g, "f") || "f"),
            fc
              .string({ minLength: 1, maxLength: 30 })
              .map((body) => body.replace(/[{}()\[\]`'"]/g, " ")),
          )
          .map(
            ([name, body]) =>
              `function ${name}() {\n  return ${JSON.stringify(body)};\n}`,
          ),
        // If statements
        fc.boolean().map((cond) => `if (${cond}) {\n  console.log("yes");\n}`),
        // Arrow functions
        fc.integer().map((n) => `const fn = () => {\n  return ${n};\n};`),
        // Multi-line with nesting
        fc
          .integer({ min: 0, max: 100 })
          .map(
            (n) => `function calc() {\n  if (true) {\n    return ${n};\n  }\n}`,
          ),
      );

      fc.assert(
        fc.property(arbValidCode, (code) => {
          const first = formatCode(code, "javascript");
          // Only check idempotence for code that formats without error
          if (!first.error) {
            const second = formatCode(first.formatted, "javascript");
            expect(second.formatted).toBe(first.formatted);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /* ─── Property 6: Format Preservation on Error ─────────── */
  describe("Property 6: Error preservation", () => {
    it("unbalanced braces → returns original code + non-empty error", () => {
      // Generate code with unbalanced braces
      const arbUnbalancedCode = fc.oneof(
        // Missing closing brace
        fc
          .string({ minLength: 1, maxLength: 30 })
          .map(
            (body) => `function broken() {\n  ${body.replace(/[{}]/g, "x")}\n`,
          ),
        // Extra closing brace
        fc
          .string({ minLength: 0, maxLength: 20 })
          .map((prefix) => `${prefix.replace(/[{}]/g, "x")}\n}`),
        // Unmatched opening paren
        fc
          .string({ minLength: 1, maxLength: 20 })
          .map((content) => `const x = (${content.replace(/[()]/g, "x")}`),
        // Unmatched closing bracket
        fc
          .string({ minLength: 0, maxLength: 20 })
          .map((prefix) => `${prefix.replace(/[\[\]]/g, "x")}]`),
      );

      fc.assert(
        fc.property(arbUnbalancedCode, (code) => {
          const result = formatCode(code, "javascript");
          expect(result.formatted).toBe(code);
          expect(result.error).toBeDefined();
          expect(result.error!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
