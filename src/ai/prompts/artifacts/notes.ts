/**
 * Artifact prompt: notes.md
 *
 * Deep study notes from fundamentals to staff-level depth, explaining WHY before HOW.
 */
export const NOTES_ARTIFACT_PROMPT = `Generate deep study notes for this topic, calibrated for senior/staff-level (10+ YOE) engineering roles at Google, Meta, Microsoft.

Include ALL of the following sections:

# Core Concept
One-paragraph essence. If a staff engineer were explaining this in an elevator, this is what they'd say.

# Why This Exists
Historical context: what problem does this solve? What came before it and why it failed. This is what separates senior engineers — they understand the "why" behind every tool.

# Internal Working
Under-the-hood implementation: memory layout, data structures, algorithms. Include OS-level or hardware considerations where relevant (cache lines, NUMA, GC interaction).

# Step-by-Step Walkthrough
A concrete operation traced step by step, numbered. Include state before and after each step.

# Complexity Analysis
| Operation | Best | Average | Worst | Amortized |
Include explanation of WHY each complexity is what it is — not just the answer, but the proof sketch or reasoning.

# Space Complexity
Memory usage analysis: stack vs heap, auxiliary space, in-place implications.

# Important Properties & Invariants
Rules that are ALWAYS true. These are what you prove correct in an interview.

# Edge Cases
Exhaustive list including: empty input, single element, duplicates, max constraints, integer overflow, negative numbers, circular references. Include the correct behavior for each.

# Code Examples
Two or three TypeScript examples showing:
1. Canonical implementation (clean, production-quality).
2. A subtle variation or optimization.
Include inline comments for non-obvious logic. State complexity after each function.

# ASCII Diagrams
At least one diagram showing internal structure or a key operation. Use text art.

# Production Considerations
- Scale limits: where does this break? What's the practical upper bound?
- Memory pressure: how does this behave under GC? Are there allocation patterns to avoid?
- Concurrency: thread-safety, lock-free alternatives.
- Monitoring: what metrics to track in production.

# Common Senior Mistakes
Mistakes that even experienced engineers make in interviews and production:
- Subtle off-by-one errors.
- Overlooked edge cases.
- Misunderstood complexity (amortized vs worst-case).
- Incorrect mental models.

# Interview Bar
What a Google/Meta L5 answer looks like vs L6. Specifically what needs to be demonstrated on this topic.

Rules:
- Explain WHY before HOW.
- Go deeper than any textbook or LeetCode editorial.
- All code in TypeScript unless the concept is language-independent.
- Include at least one counterintuitive insight that separates senior engineers from juniors.`;

