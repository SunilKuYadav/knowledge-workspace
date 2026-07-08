/**
 * Artifact prompt: patterns.md
 *
 * Recognition-first patterns for interviews. Each pattern is self-contained.
 * Calibrated for senior/staff-level pattern recognition at Google, Meta, Microsoft.
 */
export const PATTERNS_ARTIFACT_PROMPT = `Generate interview patterns for this topic.

For EVERY pattern, use this exact structure:

## Pattern Name

### One-line summary
A single sentence that captures the pattern's essence. Memorable enough to recall mid-interview.

### Recognition signal
The exact characteristics in a problem statement that scream "use this pattern":
- Specific keywords in the problem statement.
- Input/output structure clues.
- Constraint hints (e.g., "sorted", "at most k", "contiguous subarray").

### Mental model
The core insight in one sentence. A useful analogy if applicable.

### When to use
Specific conditions where this is the optimal choice.

### When NOT to use
Common traps where this looks applicable but isn't. What to use instead and why.

### Template
A reusable TypeScript template. Include:
- The skeleton structure.
- Inline comments explaining WHERE to customize.
- Common variable names that interviewers recognize.

\`\`\`typescript
// Template here
\`\`\`

### Complexity
| Time | Space | Notes |

### Application rules
Numbered rules for applying this pattern correctly (loop invariants, pointer management, termination conditions).

### Classic problems (by company)
5-8 well-known problems that use this pattern, with the company tag:
- [Problem name] — [company] — [key variant]

### Follow-up variants
Harder versions that appear at L6 interviews:
- "What if the array has duplicates?"
- "What if you need to handle negative numbers?"
- "What if this is a streaming input?"

### Common implementation bugs
Specific code-level mistakes candidates make when applying this pattern.

---

Rules:
- Aim for 3–6 distinct patterns depending on the topic.
- Focus on recognition — the goal is "I see X → I reach for Y pattern".
- Include at least one non-obvious pattern that separates L5 from L6 candidates.
- Use tables where they improve readability.`;

