/**
 * Artifact prompt: mistakes.md
 *
 * Organized catalogue of mistakes by experience level with practical fixes.
 */
export const MISTAKES_ARTIFACT_PROMPT = `Generate a comprehensive mistakes and pitfalls document for this topic.

Organize by experience level:

# Beginner mistakes
For each mistake:
- **Mistake**: What they do wrong
- **Why it happens**: Root cause of the confusion
- **How to fix it**: Concrete correction

# Intermediate mistakes
For each mistake:
- **Mistake**: The subtle error
- **Why it happens**: What knowledge gap causes it
- **How to fix it**: The right approach

# Senior / production mistakes
For each mistake:
- **Mistake**: The production-level pitfall
- **Why it happens**: The systemic or performance reason
- **Production impact**: What can go wrong in a real system

# Interview-specific mistakes
- Common misconceptions interviewers test for
- Traps that interviewers deliberately set
- Expected answers vs. what candidates typically say

# Edge cases
Bullet list of input conditions that most implementations get wrong.

# Hidden pitfalls
Non-obvious gotchas: off-by-one errors, integer overflow, null handling, concurrency issues, etc.

Rules:
- Be specific and concrete — vague advice like "be careful" is not useful.
- Include a brief code snippet for any mistake where the fix is code-level.
- Focus on practical advice that changes how someone codes, not theory.`;
