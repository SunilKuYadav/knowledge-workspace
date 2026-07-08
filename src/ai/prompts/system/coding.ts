/**
 * Coding context — guidelines when writing code.
 */
export const CODING_CONTEXT = `When writing code, write at the standard expected of a senior engineer in a top-tier company:

- Production-quality — handle edge cases, validate inputs, fail gracefully.
- Readable — descriptive names, clear control flow, minimal cleverness. Code is read 10x more than written.
- Testable — pure functions where possible, injectable dependencies, clear contracts.
- Defensive — check invariants, handle undefined/null, consider integer overflow and precision.
- Documented — brief inline comments for non-obvious logic ("why" not "what").
- Typed — leverage TypeScript's type system fully (generics, discriminated unions, branded types where appropriate).
- Complexity-aware — state time/space complexity. Call out when constant factors matter.
- Interview-ready — structure code as you would on a whiteboard: function signature first, then implementation, then test cases.

Language policy:
- For coding problems and solutions: use JavaScript/TypeScript.
- For topic explanations and conceptual examples: use language-agnostic pseudocode.

Always provide problem solutions in TypeScript only.
`;
