/**
 * Artifact prompt: interview.md
 *
 * Interview preparation material targeting Staff Engineer-level interviewers
 * at FAANG/MAANG companies.
 */
export const INTERVIEW_ARTIFACT_PROMPT = `Generate interview preparation material for this topic, calibrated for senior/staff-level roles (L5-L7) at Google, Meta, Microsoft, Amazon, Apple.

# Frequently asked questions (Top 10)
The most common interview questions on this topic across all companies.
For each question provide:
- The question exactly as an interviewer would phrase it.
- Expected answer outline (what a strong L5/L6 candidate says).
- Key signals the interviewer is listening for (green flags).
- Red flags that signal a weak candidate.
- Time allocation (how long to spend on this in a 45-min round).

# Company-specific questions
## Google (L5/L6)
Focus: algorithmic depth, proof of correctness, optimal complexity with edge cases. Expect follow-ups like "prove this is correct" or "what's the lower bound?"

## Meta (E5/E6)
Focus: practical application at scale, move-fast mentality, clean code under time pressure. Expect "how would you test this?" and "what if the input is 10x larger?"

## Amazon (L6/L7)
Focus: leadership principles connection (ownership, dive deep), operational excellence, reliability at scale. Expect "how would you monitor this in production?"

## Microsoft (Senior/Principal)
Focus: object-oriented design, API design, cross-system integration. Expect "how would other teams consume this?" and "what's the extension story?"

# The optimization ladder
Show the full progression from naive to optimal:
| Approach | Time | Space | Key Insight | When to stop here |
For each step, explain the single insight that enables the next optimization.

# Follow-up question chains
Questions interviewers ask after the initial answer to probe depth:
Format: Q1 → expected answer → Q2 (deeper) → expected answer → Q3 (staff-level depth)
Include at least 3 chains of depth 3.

# 45-minute whiteboard structure
Minute-by-minute breakdown:
- 0-3: Clarify requirements, ask questions (list the RIGHT questions to ask).
- 3-8: State approach, explain trade-offs of alternatives.
- 8-35: Implement with running commentary.
- 35-40: Test with examples, identify edge cases.
- 40-45: Discuss complexity, optimizations, follow-ups.

# Communication framework
How to think out loud effectively:
- Signal your approach before coding.
- Name the pattern you're using and why.
- Flag edge cases as you encounter them.
- State complexity as you go, not just at the end.

# Trade-off discussions
Format as a table: | Factor | Option A | Option B | When to prefer |
Interviewers at L6+ expect you to drive this discussion proactively.

# Common candidate failures (by level)
- Junior mistakes (instant no-hire): [list]
- Mid-level mistakes (downlevel to L4): [list]
- Senior mistakes (weak hire / borderline): [list]

# What separates L5 from L6 answers
Specific examples of how a Staff-level answer differs from a Senior-level answer on this topic.

# Advanced / Staff-level questions
Questions reserved for L6+ that test:
- System-level thinking ("how does this algorithm behave in a distributed setting?")
- Theoretical depth ("what's the information-theoretic lower bound?")
- Cross-cutting concerns ("how does this interact with garbage collection?")

Rules:
- Be specific about what interviewers are actually evaluating at each level.
- Include expected answer outlines, not just questions.
- Prioritize questions from actual Google/Meta/Microsoft interview loops.
- Frame everything through the lens of "would this response get a hire vote at L5/L6?"`;

