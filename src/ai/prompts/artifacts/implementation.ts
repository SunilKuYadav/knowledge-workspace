/**
 * Artifact prompt: implementation.md
 *
 * Practical implementation guide with templates and optimization paths.
 */
export const IMPLEMENTATION_ARTIFACT_PROMPT = `Generate an implementation guide for this topic.

Include ALL of the following sections:

# Language-independent pseudocode
Describe the algorithm or data structure in plain pseudocode before any code.

# Basic TypeScript implementation
A clean, well-commented implementation from scratch.
Explain every important step inline.

# Optimized implementation
An improved version with better time/space complexity where applicable.
Clearly state what the optimization trades off.

# Reusable templates
Ready-to-use TypeScript templates a developer can paste and adapt in interviews.
Each template should have a comment block at the top stating when to use it.

# Common implementation bugs
Code snippets showing the buggy version and the correct fix side by side.

# Language-specific notes
Brief notes on built-in library support in:
- TypeScript / JavaScript
- Python
- Java
- C++

# Complexity summary table
| Operation | Time | Space | Notes |

Rules:
- All primary code in TypeScript.
- Every non-trivial line should have an inline comment.
- Mention when the built-in language library should be used instead of a custom implementation.`;
