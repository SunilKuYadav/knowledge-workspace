/**
 * Artifact prompt: notes.md
 *
 * Deep study notes from beginner to advanced, explaining WHY before HOW.
 */
export const NOTES_ARTIFACT_PROMPT = `Generate detailed study notes for this topic.

Include ALL of the following sections:

# Core concepts
The foundational ideas that everything else builds on.

# Internal working
How it works under the hood — memory layout, data structures, algorithms involved.

# Step-by-step explanation
Walk through the core operation step by step, numbered.

# Time complexity
A table of all relevant operations with best / average / worst case.

# Space complexity
Memory usage analysis.

# Important properties & invariants
Rules that are always true about this structure or algorithm.

# Code examples
Two or three examples in TypeScript demonstrating the key operations.
Include inline comments explaining non-obvious steps.

# ASCII diagrams
At least one diagram showing the internal structure or a key operation.

# Production considerations
Pitfalls, limitations, and things that matter at scale.

# Best practices
Bullet list of what senior engineers always do/avoid with this topic.

Rules:
- Explain WHY before HOW.
- Teach from beginner to advanced — build up complexity gradually.
- All code in TypeScript unless the concept is language-independent.`;
