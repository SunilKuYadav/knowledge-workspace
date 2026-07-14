/**
 * Artifact prompt: examples.md
 *
 * Progressively difficult examples from beginner to production-level.
 */
export const EXAMPLES_ARTIFACT_PROMPT = `Generate progressively difficult examples for this topic.

Structure:

# Beginner example
A simple, concrete example that demonstrates the core concept.
- Walk through every step in detail.
- Include a before/after diagram or trace table if helpful.
- Explain why each step happens.

# Intermediate example
A moderately complex example that applies the concept to a realistic scenario.
- Explain the reasoning behind design choices.
- Point out where common mistakes would occur.

# Advanced example
A complex, production-flavored example.
- Include edge case handling.
- Discuss trade-offs in the implementation.

# Real-world example
How a well-known company or system uses this concept at scale.
Examples: Redis sorted sets, PostgreSQL B-tree indexes, Google's Bigtable, Cassandra's LSM tree, etc.
- Describe the specific problem they solved.
- Explain why this approach was chosen over alternatives.
- Include a diagram if the system is complex.

Rules:
- Each example should be self-contained.
- Use pseudocode for code examples (not TypeScript — that is reserved for problem solutions).
- Use ASCII diagrams to show state changes or data flow.
- Be concrete — use real numbers, real data, real variable names.`;
