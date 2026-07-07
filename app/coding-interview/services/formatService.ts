/**
 * Lightweight code formatting service for JavaScript and TypeScript.
 *
 * Implements a simple indentation-based formatter that:
 * - Normalizes to 2-space indentation per nesting level
 * - Tracks nesting via { ( [ and } ) ]
 * - Preserves string literals and comments
 * - Detects syntax errors and returns the original code unchanged
 * - Is idempotent: format(format(code)) === format(code)
 */

export type SupportedLanguage = "javascript" | "typescript";

export interface FormatResult {
  formatted: string;
  error?: string;
}

/**
 * Checks if braces/brackets/parens are balanced in the code.
 * Returns an error message if unbalanced, or null if balanced.
 */
function checkBraceBalance(code: string): string | null {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];

    // Handle escape sequences inside strings
    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString !== null) {
      escaped = true;
      continue;
    }

    // Handle string boundaries
    if (inString !== null) {
      if (ch === inString) {
        // Handle template literal expressions
        if (inString === "`" && ch === "`") {
          inString = null;
        } else {
          inString = null;
        }
      }
      continue;
    }

    // Handle comments
    if (inSingleLineComment) {
      if (ch === "\n") {
        inSingleLineComment = false;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (ch === "*" && next === "/") {
        inMultiLineComment = false;
        i++; // skip /
      }
      continue;
    }

    // Detect comment starts
    if (ch === "/" && next === "/") {
      inSingleLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inMultiLineComment = true;
      i++;
      continue;
    }

    // Detect string starts
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    // Track brackets
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (ch === ")" || ch === "]" || ch === "}") {
      const expected = pairs[ch];
      if (stack.length === 0 || stack[stack.length - 1] !== expected) {
        return `Unmatched '${ch}' at position ${i}`;
      }
      stack.pop();
    }
  }

  if (inMultiLineComment) {
    return "Unterminated multi-line comment";
  }

  if (inString !== null) {
    return `Unterminated string literal (${inString})`;
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return `Unclosed '${unclosed}'`;
  }

  return null;
}

/**
 * Detects syntax errors in JavaScript code using Function constructor.
 * For TypeScript, falls back to brace matching only since we can't
 * parse TS syntax without a full compiler.
 */
function detectSyntaxError(
  code: string,
  language: SupportedLanguage,
): string | null {
  // Always check brace balance first (applies to both JS and TS)
  const braceError = checkBraceBalance(code);
  if (braceError) {
    return braceError;
  }

  // For JavaScript, additionally try Function constructor for deeper syntax checks
  if (language === "javascript") {
    try {
      new Function(code);
    } catch (e) {
      if (e instanceof SyntaxError) {
        return e.message;
      }
    }
  }

  return null;
}

/**
 * Counts bracket changes in a line, ignoring characters inside strings and comments.
 * Returns { opens, closes } indicating the net bracket changes.
 */
function countBrackets(line: string): { opens: number; closes: number } {
  let opens = 0;
  let closes = 0;
  let inString: string | null = null;
  let escaped = false;
  let inSingleLineComment = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString !== null) {
      escaped = true;
      continue;
    }

    if (inSingleLineComment) {
      continue;
    }

    if (inString !== null) {
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inSingleLineComment = true;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{" || ch === "(" || ch === "[") {
      opens++;
    } else if (ch === "}" || ch === ")" || ch === "]") {
      closes++;
    }
  }

  return { opens, closes };
}

/**
 * Checks if a trimmed line starts with a closing bracket.
 */
function startsWithClose(trimmedLine: string): boolean {
  if (trimmedLine.length === 0) return false;
  const first = trimmedLine[0];
  return first === "}" || first === ")" || first === "]";
}

/**
 * Formats code with consistent 2-space indentation.
 *
 * Algorithm:
 * 1. Split into lines
 * 2. For each line, trim leading whitespace
 * 3. If line starts with a closing bracket, decrease indent before writing
 * 4. Write line with current indent
 * 5. Update indent level based on net bracket changes
 *
 * @param code - The source code to format
 * @param language - 'javascript' or 'typescript'
 * @returns FormatResult with formatted code or original code + error
 */
export function formatCode(
  code: string,
  language: SupportedLanguage = "javascript",
): FormatResult {
  // Handle empty/whitespace-only code
  if (!code || code.trim().length === 0) {
    return { formatted: code };
  }

  // Detect syntax errors
  const syntaxError = detectSyntaxError(code, language);
  if (syntaxError) {
    return { formatted: code, error: `Formatting failed: ${syntaxError}` };
  }

  const lines = code.split("\n");
  const formattedLines: string[] = [];
  let indentLevel = 0;
  const INDENT = "  "; // 2-space indentation

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trimStart();

    // Preserve empty lines
    if (trimmedLine.length === 0) {
      formattedLines.push("");
      continue;
    }

    // If line starts with closing bracket, dedent first
    const closingStart = startsWithClose(trimmedLine);
    if (closingStart) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Count brackets to determine how they affect indent for subsequent lines
    const { opens, closes } = countBrackets(trimmedLine);

    // Apply current indentation
    const indentedLine = INDENT.repeat(indentLevel) + trimmedLine;
    formattedLines.push(indentedLine);

    // Update indent level for next line based on net bracket change.
    // If line starts with a close, we already decremented before writing,
    // so we only account for the *remaining* opens/closes.
    if (closingStart) {
      // We already decremented for the leading close bracket.
      // Net change from this line = (opens) - (closes - 1)
      // because one close was already accounted for by the pre-decrement.
      const netChange = opens - (closes - 1);
      indentLevel = Math.max(0, indentLevel + netChange);
    } else {
      const netChange = opens - closes;
      indentLevel = Math.max(0, indentLevel + netChange);
    }
  }

  // Remove trailing newline inconsistencies: preserve original trailing newline behavior
  let formatted = formattedLines.join("\n");

  // If original code ended with a newline, ensure formatted does too
  if (code.endsWith("\n") && !formatted.endsWith("\n")) {
    formatted += "\n";
  }
  // If original code did NOT end with a newline, ensure formatted doesn't either
  if (!code.endsWith("\n") && formatted.endsWith("\n")) {
    formatted = formatted.slice(0, -1);
  }

  return { formatted };
}
