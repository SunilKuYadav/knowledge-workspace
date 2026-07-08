/**
 * Artifact prompt: overview.md
 *
 * A concise introduction that lets someone understand the topic in under 10 minutes.
 */
export const OVERVIEW_ARTIFACT_PROMPT = `Generate the Overview document for this topic.

Include ALL of the following sections:

# What is it?
Explain the concept clearly from first principles.

# Why does it exist?
What problem does it solve? Why was it invented?

# Real-world analogy
A concrete, memorable analogy that maps to how the concept works.

# Key terminology
A table of the most important terms and their one-line definitions.

# Where it is used in production
Specific companies or systems that use this (e.g., Redis, PostgreSQL, Google Bigtable).

# High-level workflow
A numbered step-by-step or ASCII diagram showing how it works at a high level.

# Quick example
A minimal code or pseudocode example that demonstrates the core idea.

# Learning objectives
Bullet list of what the reader should be able to do after reading this.

Rules:
- Keep it concise — the goal is understanding in under 10 minutes.
- Use ASCII diagrams where they add clarity.
- Do NOT include implementation details — those belong in implementation.md.
- Do NOT include interview questions — those belong in interview.md.`;
