/**
 * Artifact prompt: interview.md
 *
 * Interview preparation material targeting Staff Engineer-level interviewers
 * at FAANG/MAANG companies.
 */
export const INTERVIEW_ARTIFACT_PROMPT = `Generate interview preparation material for this topic.

Assume the interviewer is a Staff Engineer at Google, Meta, Amazon, Microsoft, or Apple.

# Frequently asked questions
The 10 most common questions on this topic across all companies.
For each: question, expected answer outline, key points the interviewer is listening for.

# Company-specific questions
## Google
Focus: algorithmic depth, edge cases, optimal complexity.

## Meta
Focus: practical application, trade-offs, system behavior at scale.

## Amazon
Focus: leadership principles connection, scalability, reliability.

## Microsoft
Focus: object-oriented design, real-world application.

# Follow-up questions
Questions interviewers ask after the initial answer to go deeper.
Format: main question → typical follow-up chain.

# Whiteboard discussion guide
How to structure a 45-minute whiteboard session on this topic:
1. Clarify the problem (X minutes)
2. State the approach (X minutes)
3. Code the solution (X minutes)
4. Test and analyze (X minutes)

# Optimization discussion
The sequence of optimizations from naive → optimal, with complexity at each step.
This is what interviewers expect candidates to walk through.

# Trade-offs
What you give up with each approach. Interviewers love trade-off discussions.

# Common candidate mistakes
What interviewers see most often that causes candidates to fail or get a lower rating.

# Advanced questions
Questions for senior+ candidates that test depth of understanding.

Rules:
- Be specific about what interviewers are actually looking for, not just what the question is.
- Include expected answer outlines, not just the questions.
- Prioritize questions that have appeared in real interviews at these companies.`;
