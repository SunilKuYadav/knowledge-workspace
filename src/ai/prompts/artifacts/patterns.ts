/**
 * Artifact prompt: patterns.md
 *
 * Recognition-first patterns for interviews. Each pattern is self-contained.
 */
export const PATTERNS_ARTIFACT_PROMPT = `Generate interview patterns for this topic.

For EVERY pattern, use this exact structure:

## Pattern Name

### Recognition clues
Bullet list of problem characteristics that signal this pattern should be used.

### Mental model
One sentence that captures the core idea of this pattern.

### When to use
Specific conditions where this pattern is the right choice.

### When NOT to use
Conditions where this pattern is a trap or a worse choice than alternatives.

### Template
A reusable TypeScript code template for this pattern.

### Time & space complexity
Brief complexity summary.

### Classic interview problems
3–5 problem titles (LeetCode or well-known) that use this pattern.

### Common mistakes
What candidates get wrong when applying this pattern.

---

Rules:
- Aim for 3–6 distinct patterns depending on the topic.
- Use tables where they improve readability (e.g., complexity comparison).
- Focus on recognition — the goal is "I see X in a problem, therefore I use Y pattern".`;
